'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const editor = read('public/motion/motion-lab-pose-editor.js');
const persistence = read('public/motion/motion-lab-adjusted-preview-persistence.js');
const direction = read('public/motion/motion-lab-motion-direction-authoring.js');

test('durable Pose Editor owns authored phase keys instead of legacy all-sample delta propagation', () => {
  assert.match(editor, /1\.3\.0-pose-authoring-phase-key-truth/);
  assert.match(editor, /buildAdjustedPreview: patchPreviewClip/);
  assert.match(persistence, /function durablePhaseEditorActive\(\)/);
  assert.match(persistence, /PHASE_KEY_SCOPE = 'authored_phase_keys'/);
  assert.match(persistence, /PHASE_KEY_STRATEGY = 'pose_editor_key_authority'/);
  assert.match(persistence, /if \(durablePhaseEditorActive\(\)\)/);
  assert.match(persistence, /lastWriter: 'pose_editor_phase_keys'/);
});

test('reset selected and reset phase restore canonical preview and live pose before re-authoring', () => {
  assert.match(editor, /function restorePreviewPhaseKeys\(names, phaseId\)/);
  assert.match(editor, /function restoreLivePhaseFromCanonical\(names, phaseId\)/);
  assert.match(editor, /node\.quaternion\.fromArray\(quaternionTrack\.values, index \* 4\)\.normalize\(\)/);
  assert.match(editor, /node\.position\.fromArray\(positionTrack\.values, index \* 3\)/);
  assert.match(editor, /function resetSelected\(\)[\s\S]*?restorePreviewPhaseKeys\(names, sampledPhaseId\);[\s\S]*?restoreLivePhaseFromCanonical\(names, sampledPhaseId\);[\s\S]*?baseline = captureEditablePose\(\)/);
  assert.match(editor, /function resetPhase\(\)[\s\S]*?restorePreviewPhaseKeys\(names, sampledPhaseId\);[\s\S]*?restoreLivePhaseFromCanonical\(names, sampledPhaseId\);[\s\S]*?baseline = captureEditablePose\(\)/);
  assert.doesNotMatch(editor, /function resetSelected\(\)[\s\S]{0,900}restorePose\(baseline\)/);
  assert.doesNotMatch(editor, /function resetPhase\(\)[\s\S]{0,500}restorePose\(baseline\)/);
  assert.doesNotMatch(editor, /function resetSelected\(\)[\s\S]{0,900}previewClip = null/);
  assert.doesNotMatch(editor, /function resetPhase\(\)[\s\S]{0,500}previewClip = null/);
});

test('adjusted preview respects the Motion Spec finite loop intent', () => {
  assert.match(editor, /activeSession\.setLoop\?\.\(originalMotionSpec\?\.loop !== false\)/);
});

test('arm and leg joint direction buttons route through their existing IK endpoints', () => {
  assert.match(direction, /const POSITION_PROXY = Object\.freeze/);
  assert.match(direction, /left_shoulder: 'left_hand'/);
  assert.match(direction, /left_elbow: 'left_hand'/);
  assert.match(direction, /right_shoulder: 'right_hand'/);
  assert.match(direction, /left_hip: 'left_foot'/);
  assert.match(direction, /left_knee: 'left_foot'/);
  assert.match(direction, /right_knee: 'right_foot'/);
  assert.doesNotMatch(direction, /solveTwoBoneChain/);
  assert.doesNotMatch(direction, /solveAuthoringChain/);
});

test('direction buttons build without autoplay then visibly freeze on the edited destination phase', () => {
  assert.match(direction, /api\.buildAdjustedPreview\?\.\(\) \|\| api\.playAdjustedPreview\?\.\(\)/);
  assert.match(direction, /const installedClip = installClip\(workingClip, false\)/);
  assert.match(direction, /const visible = phaseApi\.samplePhase\(transition\.to\.id\)/);
  assert.match(direction, /destinationVisible: true/);
});

test('direction timing help states that phases define duration while timing defines easing', () => {
  assert.match(direction, /Timing controls the ease shape; phase spacing determines duration/);
  assert.match(direction, /phase spacing determines the transition duration/);
});

test('Reset All also invalidates any directed timing plan for the active motion', () => {
  assert.match(editor, /motionlab:pose-editor-reset-all/);
  assert.match(direction, /addEventListener\('motionlab:pose-editor-reset-all', clearPlan\)/);
});
