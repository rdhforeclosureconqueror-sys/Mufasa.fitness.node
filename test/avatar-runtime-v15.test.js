"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("v15 restores a canonical profile avatar even when the runtime subscribes late", () => {
  const runtime = read("public/avatar-runtime.js");
  assert.match(runtime, /app:canonical-profile/);
  assert.match(runtime, /canonical_profile_replay/);
  assert.match(runtime, /savedAvatarRestoreCompleted: true/);
  assert.match(runtime, /savedAvatarRestoreSource: \/post_save\//);
});

test("v15 separates camera capture from presentation layers", () => {
  const workout = read("public/workout.html");
  assert.match(workout, /cameraCaptureActive: videoCaptureActive/);
  assert.match(workout, /userVisibleVideoLayer: mode === "avatar_only" \? "HIDDEN" : "VISIBLE"/);
  assert.match(workout, /poseSourceVideoActive: videoCaptureActive && videoEl\.readyState >= 2/);
  assert.match(workout, /avatarCanvasVisible: avatarVisible/);
});

test("v15 publishes real MoveNet confidence and framing readiness", () => {
  const runtime = read("public/avatar-runtime.js");
  assert.match(runtime, /poseEngine: 'MoveNet'/);
  assert.match(runtime, /FULL_BODY_READY/);
  assert.match(runtime, /UPPER_BODY_READY/);
  assert.match(runtime, /TOO_CLOSE/);
  assert.match(runtime, /keypointConfidence: confidence/);
});

test("v15 fails closed and keeps orientation above the model skeleton", () => {
  const runtime = read("public/avatar-runtime.js");
  const workout = read("public/workout.html");
  assert.match(runtime, /poseRunning && retargetRunning && boneProof/);
  assert.match(runtime, /renderedRootEqualsRetargetedRoot/);
  assert.match(workout, /avatarOrientationRoot\.add\(avatarRoot\)/);
  assert.match(workout, /avatarRoot\.add\(root\)/);
  assert.match(workout, /runtime\.scene\.add\(avatarOrientationRoot\)/);
  assert.match(workout, /runtime\.avatarOrientationRoot = avatarOrientationRoot/);
  assert.match(runtime, /quaternionBefore/);
  assert.match(workout, /2026-08-27-avatar-manual-control-proof-v16/);
});

test("v16 manual facing writes the rendered orientation owner and proves retention after rendering", () => {
  const workout = read("public/workout.html");
  assert.match(workout, /const orientationRoot = runtime\?\.avatarOrientationRoot/);
  assert.match(workout, /if \(orientationRoot\) orientationRoot\.rotation\.y = facingRad/);
  assert.match(workout, /requestAnimationFrame\(\(\) => inspectManualRotation\(generation, false\)\)/);
  assert.match(workout, /setTimeout\(\(\) => inspectManualRotation\(generation, true\), 250\)/);
  assert.match(workout, /Orientation root parent === active scene/);
  assert.match(workout, /Rendered avatar descendant of orientation root/);
  assert.match(workout, /Manual rotation generation/);
  assert.match(workout, /2026-08-27-avatar-manual-control-proof-v16/);
});
