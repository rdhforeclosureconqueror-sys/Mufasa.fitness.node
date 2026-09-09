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
const poseEditor = read('public/motion/motion-lab-pose-editor.js');
const server = read('server.js');

test('direction authoring lives inside the existing Pose Editor instead of creating another panel', () => {
  const posePanel = index.indexOf('id="poseEditorPanel"');
  const direction = index.indexOf('id="motionDirectionAuthoring"');
  const inspection = index.indexOf('<h2>Inspection camera</h2>');
  assert.ok(posePanel >= 0);
  assert.ok(direction > posePanel);
  assert.ok(direction < inspection);
  assert.match(index, /Transition \/ Motion Direction/);
});

test('author can define adjacent phase-to-phase direction with explicit body controls', () => {
  assert.match(index, /id="motionDirectionFromPhase"/);
  assert.match(index, /id="motionDirectionToPhase"/);
  assert.match(index, /id="motionDirectionTarget"/);
  for (const id of ['motionDirectionUp','motionDirectionDown','motionDirectionLeft','motionDirectionRight','motionDirectionForward','motionDirectionBack','motionDirectionTwistIn','motionDirectionTwistOut']) assert.match(index, new RegExp(`id="${id}"`));
  assert.match(authoring, /transition_must_be_adjacent/);
  assert.match(authoring, /phaseApi\.samplePhase\(transition\.to\.id\)/);
});

test('position direction reuses Pose Editor shared IK rather than owning another solver', () => {
  assert.match(authoring, /configurePoseEditor/);
  assert.match(authoring, /poseEditorPlus/);
  assert.match(authoring, /poseEditorMinus/);
  assert.doesNotMatch(authoring, /solveTwoBoneChain/);
  assert.doesNotMatch(authoring, /solveAuthoringChain/);
});

test('human timing preserves endpoints and uses quaternion slerp', () => {
  assert.match(authoring, /function easing\(profile, t\)/);
  assert.match(authoring, /for \(let i = 1; i < samples - 1; i \+= 1\)/);
  assert.match(authoring, /valueAtNearest\(track, fromTime\)/);
  assert.match(authoring, /valueAtNearest\(track, toTime\)/);
  assert.match(authoring, /slerpQuaternions/);
  assert.match(index, /preserving both exact phase endpoints/);
});

test('directed save refreshes from latest accumulated pose edits before humanizing', () => {
  assert.match(authoring, /options\.refreshPose !== false/);
  assert.match(authoring, /editor\(\)\?\.playAdjustedPreview\?\.\(\)/);
  assert.match(draftStore, /buildPreview\?\.\(\{ play: false, refreshPose: true \}\)/);
  assert.match(poseEditor, /previewClip\?\.clone\?\.\(\) \|\| originalClip/);
});

test('saved drafts preserve both structured pose edits and directed transition plans', () => {
  assert.match(draftStore, /transitionPlan/);
  assert.match(draftStore, /api\.importAdjustment\?\.\(/);
  assert.match(draftStore, /directionAuthoring\(\)\?\.restorePlan\?\./);
  assert.match(draftStore, /authoredDraftDirectedTransitionCount/);
  assert.doesNotMatch(draftStore, /active\.play\?\.\(\)/);
});

test('new authoring asset uses the existing protected Motion Lab route', () => {
  assert.match(index, /\/dev\/motion-lab-assets\/motion-lab-motion-direction-authoring\.js/);
  assert.match(server, /app\.get\("\/dev\/motion-lab-assets\/:filename", motionLabGate/);
});
