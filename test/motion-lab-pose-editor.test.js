'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const editor = read('public/motion/motion-lab-pose-editor.js');
const authoringAdapter = read('public/motion/motion-lab-authoring-adapter.js');
const bootstrap = read('motion-lab/motion-lab-bootstrap.js');
const index = read('motion-lab/index.html');
const diagnostics = read('public/motion/motion-lab-diagnostic-consolidator.js');

test('Pose Editor exposes the requested mobile authoring workflow', () => {
  for (const id of [
    'poseEditorPhase','poseEditorLoadPhase','poseEditorTarget','poseEditorMode','poseEditorAxis','poseEditorStep',
    'poseEditorMinus','poseEditorPlus','poseEditorPlay','poseEditorResetSelected','poseEditorResetPhase','poseEditorResetAll','poseEditorCopy'
  ]) assert.match(index, new RegExp(`id="${id}"`));
  assert.match(index, /Pose Editor \/ Motion Authoring/);
  assert.match(index, /Copy Motion Spec Adjustment/);
});

test('endpoint authoring reuses shared Phase 4 IK rather than inventing another solver', () => {
  assert.match(authoringAdapter, /PocketPTMotionLabIntelligenceAdapter/);
  assert.match(authoringAdapter, /base\.solvePhaseContacts/);
  assert.match(authoringAdapter, /authoringRootTranslationSuppressed/);
  assert.doesNotMatch(authoringAdapter, /stationary_lunge_left/);
  assert.doesNotMatch(authoringAdapter, /lunge\/stationary/);
});

test('editor supports generic hands feet joints torso hips and head', () => {
  for (const target of ['left_foot','right_foot','left_hand','right_hand','left_knee','right_knee','left_elbow','right_elbow','hips','spine','head']) {
    assert.match(editor, new RegExp(`${target}:`));
  }
  assert.match(editor, /endpoint_or_root_translation/);
  assert.match(editor, /joint_rotation_delta/);
  assert.match(editor, /avatar_height/);
});

test('adjusted playback patches a preview clone instead of overwriting canonical Motion Spec source', () => {
  assert.match(editor, /originalClip\?\.clone/);
  assert.match(editor, /POSE EDIT PREVIEW/);
  assert.match(editor, /QuaternionKeyframeTrack|\.quaternion/);
  assert.match(editor, /resetAll/);
  assert.match(editor, /loadMotionSpec\?\.\(originalMotionSpec/);
  assert.doesNotMatch(editor, /lunge-motion-spec\.js/);
});

test('bootstrap installs authoring adapter and pose editor before MotionLabRuntime creates sessions', () => {
  const shared = bootstrap.indexOf('motion_lab_intelligence_adapter');
  const authoring = bootstrap.indexOf('motion_lab_authoring_adapter');
  const editorIndex = bootstrap.indexOf('pose_editor');
  const runtime = bootstrap.indexOf('motion_lab_runtime');
  assert.ok(shared >= 0 && authoring > shared && editorIndex > authoring && runtime > editorIndex);
  assert.match(bootstrap, /pose_editor_install/);
  assert.match(bootstrap, /motion_lab_pose_editor_install_failed/);
});

test('Pose Editor state is included in the canonical copied diagnostic', () => {
  assert.match(diagnostics, /MOTION LAB — POSE EDITOR DIAGNOSTICS/);
  assert.match(diagnostics, /Pending edits:/);
  assert.match(diagnostics, /Adjusted preview clip:/);
  assert.match(diagnostics, /canonical-diagnostic-v2-pose-editor/);
});
