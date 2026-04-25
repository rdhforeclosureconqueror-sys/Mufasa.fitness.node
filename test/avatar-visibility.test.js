"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyBodyVisibility, BODY_VISIBILITY } = require("../public/form-engine.js");

function kp(score = 0.99, name = "") { return { x: 0, y: 0, score, name }; }

function poseWith(indices) {
  const arr = Array.from({ length: 17 }, () => kp(0));
  for (const [i, name] of indices) arr[i] = kp(0.99, name);
  return arr;
}

test("head/shoulders only returns HEAD_SHOULDERS", () => {
  const pose = poseWith([
    [0, "nose"], [5, "left_shoulder"], [6, "right_shoulder"]
  ]);
  assert.equal(classifyBodyVisibility(pose), BODY_VISIBILITY.HEAD_SHOULDERS);
});

test("full body visible returns FULL_BODY", () => {
  const pose = poseWith([
    [5, "left_shoulder"], [6, "right_shoulder"], [11, "left_hip"], [12, "right_hip"], [13, "left_knee"], [14, "right_knee"]
  ]);
  assert.equal(classifyBodyVisibility(pose), BODY_VISIBILITY.FULL_BODY);
});

test("low confidence does not return FULL_BODY", () => {
  const pose = poseWith([
    [5, "left_shoulder"], [6, "right_shoulder"], [11, "left_hip"], [12, "right_hip"], [13, "left_knee"], [14, "right_knee"]
  ]);
  pose[13].score = 0.1;
  pose[14].score = 0.1;
  assert.notEqual(classifyBodyVisibility(pose), BODY_VISIBILITY.FULL_BODY);
});
