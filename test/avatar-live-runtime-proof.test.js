"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("runtime proof ties retarget identity, pose frames, render frames and activation together", () => {
  const runtime = read("public/avatar-runtime.js");
  assert.match(runtime, /runtime\?\.avatarOrientationRoot\?\.parent === runtime\?\.scene/);
  assert.match(runtime, /runtime\.retargetFramesExecuted = Number/);
  assert.match(runtime, /runtime\?\.renderLoopActive && lastRenderAgeMs != null && lastRenderAgeMs < 1000/);
  assert.match(runtime, /identityOk && renderRunning && \(!trackingEnabled \|\| \(poseRunning && retargetRunning && boneProof && fullRigProof\)\) \? 'ACTIVE'/);
  assert.match(runtime, /posePacketsReceived: Number\(status\(\)\.posePacketsReceived/);
  assert.match(runtime, /runManualRuntimeTest/);
  assert.match(runtime, /runtime\?\.boneMap\?\.leftUpperArm/);
  assert.match(runtime, /kind === 'depth' \? 'y' : 'z'/);
});

test("production workout continuously renders the retargeted root with a valid PBR renderer", () => {
  const workout = read("public/workout.html");
  assert.match(workout, /runtime\.renderer\.render\(runtime\.scene, runtime\.camera\)/);
  assert.match(workout, /runtime\.renderFrameCount = Number/);
  assert.match(workout, /renderer\.outputColorSpace = threeRef\.SRGBColorSpace/);
  assert.match(workout, /renderer\.toneMapping = threeRef\.ACESFilmicToneMapping/);
  assert.match(workout, /new threeRef\.PerspectiveCamera\(40, 4 \/ 3, 0\.01, 100\)/);
  assert.match(read("public/avatar-runtime.js"), /canvasBufferSize/);
  assert.match(workout, /2026-08-27-movenet-visible-audible-v22/);
  assert.match(workout, /id="avatarDiagRuntimePresentation"/);
  assert.match(workout, /const activated = activateLiveAvatarMirror\(\)/);
});
