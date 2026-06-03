"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadEngine() {
  const code = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  const sandbox = {
    console,
    Date,
    Math,
    setTimeout: () => 0,
    clearTimeout: () => {},
    module: { exports: {} },
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "public/workout-runtime.js" });
  return sandbox.__PILOT_FORM_RULE_ENGINE;
}

const NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
];

function basePose(score = 0.95) {
  return { keypoints: NAMES.map((name, index) => ({ name, part: name, x: 100 + index, y: 100 + index, score })) };
}

function setPoint(pose, name, x, y, score = 0.95) {
  const point = pose.keypoints.find((kp) => kp.name === name);
  Object.assign(point, { x, y, score });
}

function squatPose({ hipY, kneeY = 250, ankleY = 390, score = 0.95 }) {
  const pose = basePose(score);
  setPoint(pose, "left_shoulder", 120, 80, score);
  setPoint(pose, "right_shoulder", 220, 80, score);
  setPoint(pose, "left_hip", 130, hipY, score);
  setPoint(pose, "right_hip", 210, hipY, score);
  setPoint(pose, "left_knee", 130, kneeY, score);
  setPoint(pose, "right_knee", 210, kneeY, score);
  setPoint(pose, "left_ankle", 130, ankleY, score);
  setPoint(pose, "right_ankle", 210, ankleY, score);
  return pose;
}

function pushupPose(bottom = false) {
  const pose = basePose();
  for (const side of ["left", "right"]) {
    const offset = side === "left" ? 0 : 20;
    setPoint(pose, `${side}_shoulder`, 100, 100 + offset);
    setPoint(pose, `${side}_elbow`, bottom ? 180 : 200, bottom ? 150 + offset : 100 + offset);
    setPoint(pose, `${side}_wrist`, bottom ? 100 : 300, bottom ? 200 + offset : 100 + offset);
    setPoint(pose, `${side}_hip`, 45, 112 + offset);
  }
  return pose;
}

function lungePose(bottom = false) {
  const pose = basePose();
  if (bottom) {
    setPoint(pose, "left_hip", 100, 100);
    setPoint(pose, "left_knee", 140, 220);
    setPoint(pose, "left_ankle", 220, 220);
    setPoint(pose, "right_hip", 250, 100);
    setPoint(pose, "right_knee", 250, 245);
    setPoint(pose, "right_ankle", 270, 300);
  } else {
    setPoint(pose, "left_hip", 100, 100);
    setPoint(pose, "left_knee", 100, 200);
    setPoint(pose, "left_ankle", 100, 300);
    setPoint(pose, "right_hip", 240, 100);
    setPoint(pose, "right_knee", 240, 200);
    setPoint(pose, "right_ankle", 240, 300);
  }
  return pose;
}

test("deep squat keypoints produce depth good", () => {
  const engine = loadEngine();
  const result = engine.analyzeSquat(squatPose({ hipY: 255 }));
  assert.equal(result.depthStatus, "depth good");
  assert.doesNotMatch(result.feedback, /deeper/i);
});

test("shallow squat keypoints produce go deeper", () => {
  const engine = loadEngine();
  const result = engine.analyzeSquat(squatPose({ hipY: 130 }));
  assert.equal(result.depthStatus, "depth high");
  assert.match(result.feedback, /deeper/i);
});

test("low-confidence squat does not criticize depth", () => {
  const engine = loadEngine();
  const result = engine.analyzeSquat(squatPose({ hipY: 130, score: 0.1 }));
  assert.equal(result.keypointConfidenceOk, false);
  assert.equal(result.feedback, "I need to see your hips, knees, and ankles.");
  assert.doesNotMatch(result.feedback, /deeper/i);
});

test("push-up top/bottom cycle counts rep", () => {
  const engine = loadEngine();
  engine.resetCycle();
  engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose(false) }));
  engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose(true) }));
  const result = engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose(false) }));
  assert.equal(result.repDetected, true);
  assert.equal(result.goodRep, true);
});

test("lunge cycle counts rep", () => {
  const engine = loadEngine();
  engine.resetCycle();
  engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Lunge" }, pose: lungePose(false) }));
  engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Lunge" }, pose: lungePose(true) }));
  const result = engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Lunge" }, pose: lungePose(false) }));
  assert.equal(result.repDetected, true);
  assert.equal(result.goodRep, true);
});

test("missing lower-body keypoints asks user to move back into view", () => {
  const engine = loadEngine();
  const pose = squatPose({ hipY: 130 });
  for (const name of ["left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]) {
    setPoint(pose, name, 0, 0, 0);
  }
  const result = engine.analyzeSquat(pose);
  assert.equal(result.needsLowerBody, true);
  assert.equal(result.feedback, "I need to see your hips, knees, and ankles.");
});

test("Bodyweight Squat maps to squat", () => {
  const engine = loadEngine();
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Bodyweight Squat" }), "squat");
});

test("Push-Up maps to pushup", () => {
  const engine = loadEngine();
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Push-Up" }), "pushup");
});

test("Lunge maps to lunge", () => {
  const engine = loadEngine();
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Lunge" }), "lunge");
});
