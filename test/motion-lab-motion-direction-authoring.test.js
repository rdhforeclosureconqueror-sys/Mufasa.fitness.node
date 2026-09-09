'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const index = read('motion-lab/index.html');
const authoring = read('public/motion/motion-lab-motion-direction-authoring.js');
const draftStore = read('public/motion/motion-lab-authoring-draft-store.js');
const server = read('server.js');

test('direction authoring lives inside the existing Pose Editor instead of creating another panel', () => {
  const poseEditor = index.indexOf('id="poseEditorPanel"');
  const direction = index.indexOf('id="motionDirectionAuthoring"');
  const inspection = index.indexOf('<h2>Inspection camera</h2>');
  assert.ok(poseEditor >= 0);
  assert.ok(direction > poseEditor);
  assert.ok(direction < inspection);
  assert.match(index, /Transition \/ Motion Direction/);
  assert.doesNotMatch(index, /Motion Direction Debug/);
});

test('author can define exact phase-to-phase direction with explicit body controls', () => {
  assert.match(index, /id="motionDirectionFromPhase"/);
  assert.match(index, /id="motionDirectionToPhase"/);
  assert.match(index, /id="motionDirectionTarget"/);
  for (const id of ['motionDirectionUp','motionDirectionDown','motionDirectionLeft','motionDirectionRight','motionDirectionForward','motionDirectionBack','motionDirectionTwistIn','motionDirectionTwistOut']) {
    assert.match(index, new RegExp(`id="${id}"`));
  }
  assert.match(authoring, /PocketPTMotionLabPhaseAuthoring/);
  assert.match(authoring, /phaseApi\.samplePhase\(transition\.to\.id\)/);
  assert.match(authoring, /poseEditorPlus/);
  assert.match(authoring, /poseEditorMinus/);
});

test('position direction reuses the existing Pose Editor shared-IK path rather than owning another solver', () => {
  assert.match(authoring, /configurePoseEditor/);
  assert.doesNotMatch(authoring, /solveTwoBoneChain/);
  assert.doesNotMatch(authoring, /solveAuthoringChain/);
  assert.doesNotMatch(authoring, /new .*IK/);
});

test('human timing is deterministic F-curve-like easing with exact endpoint preservation', () => {
  assert.match(index, /Human — Ease In \/ Ease Out/);
  assert.match(authoring, /function easing\(profile, t\)/);
  assert.match(authoring, /4 \* x \* x \* x/);
  assert.match(authoring, /for \(let i = 1; i < samples - 1; i \+= 1\)/);
  assert.match(authoring, /valueAtNearest\(track, fromTime\)/);
  assert.match(authoring, /valueAtNearest\(track, toTime\)/);
  assert.match(authoring, /slerpQuaternions/);
  assert.match(index, /preserving both exact phase endpoints/);
  assert.match(index, /does not yet synthesize anticipation, secondary motion, collision, or Blender-equivalent Bezier handles/);
});

test('transition preview requires an explicit user action and does not autoplay on install or restore', () => {
  assert.match(index, /id="motionDirectionPreview"[^>]*>Preview Directed Motion/);
  assert.match(authoring, /function preview\(\) \{ return buildPreview\(\{ play: true \}\); \}/);
  assert.match(authoring, /installClip\(workingClip, false\)/);
  assert.match(authoring, /workingClip = session\(\)\?\.sessionClip/);
  assert.doesNotMatch(authoring, /autoInstall[\s\S]{0,300}\.play\?\.\(\)/);
});

test('saved authored motions preserve directed humanized clips and structured transition plans', () => {
  assert.match(draftStore, /transitionPlan/);
  assert.match(draftStore, /directionAuthoring\(\)\?\.buildPreview\?\.\(\{ play: false \}\)/);
  assert.match(draftStore, /directionAuthoring\(\)\.restorePlan\(record\.transitionPlan\)/);
  assert.match(draftStore, /authoredDraftDirectedTransitionCount/);
  assert.doesNotMatch(draftStore, /active\.play\?\.\(\)/);
});

test('new authoring asset is served by the existing protected generic Motion Lab asset route', () => {
  assert.match(index, /\/dev\/motion-lab-assets\/motion-lab-motion-direction-authoring\.js/);
  assert.match(server, /app\.get\("\/dev\/motion-lab-assets\/:filename", motionLabGate/);
  assert.match(server, /\^\[a-z0-9-\]\+\\\.js\$/);
});
