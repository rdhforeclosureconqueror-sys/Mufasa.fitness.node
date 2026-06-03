"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(repoRoot, "public/index.html"), "utf8");
const repAnalysisSource = fs.readFileSync(path.join(repoRoot, "public/rep-analysis-runtime.js"), "utf8");

function loadRepRuntime() {
  const elements = new Map();
  const context = {
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    JSON,
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { id, textContent: "", classList: { add() {}, remove() {} } });
        return elements.get(id);
      }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(repAnalysisSource, context, { filename: "public/rep-analysis-runtime.js" });
  return context;
}

function kp(x, y, score = 0.99, name = "") { return { x, y, score, name }; }

function squatPose({ hipY = 100, kneeY = 205, ankleY = 310, score = 0.99, lowerScore = score } = {}) {
  const pose = Array.from({ length: 17 }, () => kp(0, 0, 0));
  pose[0] = kp(100, 30, score, "nose");
  pose[5] = kp(75, 70, score, "left_shoulder");
  pose[6] = kp(125, 70, score, "right_shoulder");
  pose[7] = kp(55, 115, score, "left_elbow");
  pose[8] = kp(145, 115, score, "right_elbow");
  pose[9] = kp(45, 160, score, "left_wrist");
  pose[10] = kp(155, 160, score, "right_wrist");
  pose[11] = kp(80, hipY, lowerScore, "left_hip");
  pose[12] = kp(120, hipY, lowerScore, "right_hip");
  pose[13] = kp(82, kneeY, lowerScore, "left_knee");
  pose[14] = kp(118, kneeY, lowerScore, "right_knee");
  pose[15] = kp(82, ankleY, lowerScore, "left_ankle");
  pose[16] = kp(118, ankleY, lowerScore, "right_ankle");
  return { keypoints: pose };
}

test("Phase 23 skeleton overlay canvas exists and is wired for workout pose frames", () => {
  assert.match(indexHtml, /<canvas id="overlay"><\/canvas>/);
  assert.match(indexHtml, /function drawSkeletonOverlay\(/);
  assert.match(indexHtml, /drawSkeletonOverlay\(pose, posePacket, guidanceAnalysis\)/);
  assert.match(indexHtml, /#overlay[\s\S]*z-index:\s*3/);
});

test("Phase 23 skeleton overlay draws keypoints and resizes to video", () => {
  assert.match(indexHtml, /function resizeSkeletonOverlayToVideo\(/);
  assert.match(indexHtml, /canvasEl\.width\s*=\s*width/);
  assert.match(indexHtml, /ctx\.arc\(kp\.x, kp\.y/);
  assert.match(indexHtml, /SKELETON_EDGES/);
  assert.match(indexHtml, /ctx\.lineTo\(p2\.x, p2\.y\)/);
});

test("Phase 23 missing lower-body keypoints asks to see hips knees and ankles", () => {
  const context = loadRepRuntime();
  const pose = squatPose();
  for (const index of [11, 12, 13, 14, 15, 16]) pose.keypoints[index].score = 0;
  const result = context.RepAnalysisRuntime.analyzeSquatForm(pose);
  assert.equal(result.depthStatus, "depth unknown");
  assert.equal(result.needsLowerBody, true);
  assert.equal(result.feedback, "I need to see your hips, knees, and ankles.");
});

test("Phase 23 deep squat keypoints do not produce go deeper", () => {
  const context = loadRepRuntime();
  const result = context.RepAnalysisRuntime.analyzeSquatForm(squatPose({ hipY: 210, kneeY: 205 }));
  assert.equal(result.lowerBodyReliable, true);
  assert.equal(result.depthStatus, "depth good");
  assert.doesNotMatch(result.feedback, /deeper/i);
});

test("Phase 23 shallow squat keypoints can produce go deeper", () => {
  const context = loadRepRuntime();
  const result = context.RepAnalysisRuntime.analyzeSquatForm(squatPose({ hipY: 130, kneeY: 205 }));
  assert.equal(result.lowerBodyReliable, true);
  assert.equal(result.depthStatus, "depth high");
  assert.match(result.feedback, /deeper/i);
});

test("Phase 23 low-confidence lower body does not produce form criticism", () => {
  const context = loadRepRuntime();
  const result = context.RepAnalysisRuntime.analyzeSquatForm(squatPose({ hipY: 210, kneeY: 205, lowerScore: 0.1 }));
  assert.equal(result.depthStatus, "depth unknown");
  assert.equal(result.goodForm, false);
  assert.doesNotMatch(result.feedback, /deeper/i);
});

test("Phase 23 Bodyweight Squat rep counting still works", () => {
  const context = loadRepRuntime();
  const completed = [];
  context.RepAnalysisRuntime.configure({
    getCurrentExerciseId: () => "bodyweight_squat",
    getCurrentExerciseMeta: () => ({ exerciseId: "bodyweight_squat", name: "Bodyweight Squat" }),
    onRepComplete: (payload) => completed.push(payload)
  });
  context.RepAnalysisRuntime.reset({ repCount: 0, totalReps: 0, phase: "up" });
  context.RepAnalysisRuntime.processPoseFrame({ pose: squatPose({ hipY: 210, kneeY: 205 }) });
  context.RepAnalysisRuntime.processPoseFrame({ pose: squatPose({ hipY: 100, kneeY: 205 }) });
  assert.equal(context.RepAnalysisRuntime.getState().repCount, 1);
  assert.equal(completed.length, 1);
});
