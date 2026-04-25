"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  jointAngle,
  evaluateExerciseForm,
  mapExerciseToMovementFamily,
  MOVEMENT_FAMILY,
  FORM_STATUS
} = require("../public/form-engine.js");

function kp(x, y, score = 0.99, name = "") { return { x, y, score, name }; }

function buildPose(overrides = {}) {
  const pose = Array.from({ length: 17 }, () => kp(0, 0, 0));
  pose[5] = kp(0, 0, 0.99, "left_shoulder");
  pose[6] = kp(10, 0, 0.99, "right_shoulder");
  pose[7] = kp(-2, 5, 0.99, "left_elbow");
  pose[8] = kp(12, 5, 0.99, "right_elbow");
  pose[9] = kp(-2, 9, 0.99, "left_wrist");
  pose[10] = kp(12, 9, 0.99, "right_wrist");
  pose[11] = kp(2, 15, 0.99, "left_hip");
  pose[12] = kp(8, 15, 0.99, "right_hip");
  pose[13] = kp(1, 25, 0.99, "left_knee");
  pose[14] = kp(9, 25, 0.99, "right_knee");
  pose[15] = kp(1, 35, 0.99, "left_ankle");
  pose[16] = kp(9, 35, 0.99, "right_ankle");
  Object.entries(overrides).forEach(([index, value]) => { pose[Number(index)] = value; });
  return pose;
}

test("pose helper angle calculations work", () => {
  const angle = jointAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 });
  assert.ok(Math.abs(angle - 90) < 0.001);
});

test("good squat returns GOOD knees/back/hips", () => {
  const pose = buildPose();
  const result = evaluateExerciseForm({ keypoints: pose, exerciseId: "bodyweight_squat", movementFamily: MOVEMENT_FAMILY.SQUAT });
  assert.equal(result.regions.knees, FORM_STATUS.GOOD);
  assert.equal(result.regions.back, FORM_STATUS.GOOD);
  assert.notEqual(result.regions.hips, FORM_STATUS.BAD);
});

test("squat knees caving returns BAD knees", () => {
  const pose = buildPose({
    13: kp(4.2, 25, 0.99, "left_knee"),
    14: kp(5.8, 25, 0.99, "right_knee")
  });
  const result = evaluateExerciseForm({ keypoints: pose, exerciseId: "bodyweight_squat", movementFamily: MOVEMENT_FAMILY.SQUAT });
  assert.equal(result.regions.knees, FORM_STATUS.BAD);
});

test("low confidence does not return BAD", () => {
  const pose = buildPose({ 13: kp(1, 25, 0.05, "left_knee") });
  const result = evaluateExerciseForm({ keypoints: pose, exerciseId: "bodyweight_squat", movementFamily: MOVEMENT_FAMILY.SQUAT });
  assert.notEqual(result.overallStatus, FORM_STATUS.BAD);
});

test("push-up hip sag returns BAD hips/core", () => {
  const pose = buildPose({
    11: kp(16, 18, 0.99, "left_hip"),
    12: kp(22, 18, 0.99, "right_hip"),
    5: kp(0, 0, 0.99, "left_shoulder"),
    6: kp(10, 0, 0.99, "right_shoulder")
  });
  const result = evaluateExerciseForm({ keypoints: pose, exerciseId: "push_up", movementFamily: MOVEMENT_FAMILY.PUSH_UP });
  assert.equal(result.regions.hips, FORM_STATUS.BAD);
  assert.equal(result.regions.core, FORM_STATUS.BAD);
});

test("good push-up returns GOOD core", () => {
  const pose = buildPose({
    11: kp(2, 14, 0.99, "left_hip"),
    12: kp(8, 14, 0.99, "right_hip")
  });
  const result = evaluateExerciseForm({ keypoints: pose, exerciseId: "push_up", movementFamily: MOVEMENT_FAMILY.PUSH_UP });
  assert.equal(result.regions.core, FORM_STATUS.GOOD);
});

test("unknown exercise returns UNKNOWN without throwing", () => {
  const result = evaluateExerciseForm({ keypoints: buildPose(), exerciseId: "mystery_move", movementFamily: MOVEMENT_FAMILY.UNKNOWN });
  assert.equal(result.overallStatus, FORM_STATUS.UNKNOWN);
});

test("movement family mapping returns UNKNOWN safely when uncertain", () => {
  const family = mapExerciseToMovementFamily({ exerciseId: "abc", name: "mystery" });
  assert.equal(family, MOVEMENT_FAMILY.UNKNOWN);
});
