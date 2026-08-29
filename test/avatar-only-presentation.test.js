"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workout = fs.readFileSync(path.join(__dirname, "../public/workout.html"), "utf8");

test("avatar-only is canonical and both selectors expose the same modes", () => {
  assert.match(workout, /ALLOWED_AVATAR_MODES = new Set\(\["camera", "avatar_overlay", "avatar_only"\]\)/);
  for (const id of ["renderModeSelect", "renderModeMobileSelect"]) {
    const select = workout.match(new RegExp(`<select id="${id}"[\\s\\S]*?<\\/select>`))?.[0] || "";
    assert.deepEqual([...select.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]), [
      "camera", "avatar_overlay", "avatar_only"
    ]);
  }
  assert.match(workout, /renderModeMobileSelectEl\.value = renderModeSelectEl\.value/);
});

test("avatar-only hides only presentation layers and displays the gold gradient", () => {
  assert.match(workout, /#workoutPresentation\[data-avatar-presentation="avatar_only"\] \{/);
  assert.match(workout, /linear-gradient\(135deg, #090909 0%, #1b1812 24%, #3f3017 52%, #8b681f 73%, #c6a13a 88%, #17130c 100%\)/);
  assert.match(workout, /\[data-avatar-presentation="avatar_only"\] #video,[\s\S]*\[data-avatar-presentation="avatar_only"\] #overlay[\s\S]*visibility: hidden !important/);
  assert.doesNotMatch(workout, /\[data-avatar-presentation="camera"\][^{]*\{[^}]*linear-gradient/);
  assert.doesNotMatch(workout, /\[data-avatar-presentation="avatar_overlay"\][^{]*\{[^}]*linear-gradient/);
  assert.match(workout, /setAvatar3dCanvasVisibility\(avatarVisible\)/);
});

test("avatar-only presentation never changes capture or MoveNet ownership", () => {
  assert.match(workout, /presentation\.dataset\.avatarPresentation = mode/);
  assert.match(workout, /cameraCaptureActive: videoCaptureActive/);
  assert.match(workout, /poseSourceVideoActive: videoCaptureActive && videoEl\.readyState >= 2/);
  assert.doesNotMatch(workout, /avatar_only[\s\S]{0,160}(?:srcObject\s*=\s*null|\.pause\(|\.getTracks\(\)[\s\S]{0,40}\.stop\()/);
  assert.equal((workout.match(/<video\b/g) || []).length, 1, "one authoritative video element");
  assert.equal((workout.match(/new threeRef\.WebGLRenderer\(/g) || []).length, 1, "one avatar renderer");
});

test("avatar renderer clears transparently without changing the model", () => {
  assert.match(workout, /new threeRef\.WebGLRenderer\(\{[\s\S]*?alpha: true/);
  assert.match(workout, /renderer\.setClearColor\(0x000000, 0\)/);
  assert.match(workout, /#avatar3d \{[\s\S]*?z-index: 2/);
});

test("stage remains contained and the CSS background adds no animation layer", () => {
  const shellRule = workout.match(/\.video-shell \{[\s\S]*?\n    \}/)?.[0] || "";
  assert.match(shellRule, /overflow: hidden/);
  assert.match(shellRule, /max-width: 100%/);
  assert.doesNotMatch(workout, /data-avatar-presentation="avatar_only"[\s\S]{0,400}(?:animation:|backdrop-filter:|filter: blur)/);
});
