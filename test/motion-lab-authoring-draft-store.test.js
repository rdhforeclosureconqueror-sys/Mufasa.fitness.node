'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
const store = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-authoring-draft-store.js'), 'utf8');
const editor = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-pose-editor.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const phase = id => Lunge.spec.phases.find(item => item.id === id);
const pitch = (id, bone) => phase(id).boneTargets.find(item => item.bone === bone).rotationOffsetEulerDegrees[0];

test('Pose Editor exposes save load and delete authored motion controls', () => {
  assert.match(index, /id="poseEditorSaveDraft"[^>]*>Save Adjusted Motion</);
  assert.match(index, /id="poseEditorLoadDraft"[^>]*>Load Saved Motion</);
  assert.match(index, /id="poseEditorDeleteDraft"[^>]*>Delete Saved Motion</);
  assert.match(index, /motion-lab-authoring-draft-store\.js/);
});

test('authoring draft store persists by motion id without rewriting canonical Motion Spec', () => {
  assert.match(store, /pocketpt\.motionLab\.authoringDraft\.v1:/);
  assert.match(store, /localStorage\?\.setItem/);
  assert.match(store, /motionId: id/);
  assert.match(store, /adjustment/);
  assert.match(store, /clip: clipJson/);
  assert.doesNotMatch(store, /lunge\/stationary_left/);
});

test('accumulated edits are preserved in preview clip instead of rebuilding only from original', () => {
  assert.match(editor, /previewClip\?\.clone\?\.\(\) \|\| originalClip\?\.clone/);
  assert.match(editor, /recordEdit[\s\S]*patchPreviewClip\(\)/);
});

test('saved authored clip restores structured edit state without autoplay', () => {
  assert.match(store, /AnimationClip\?\.parse/);
  assert.match(store, /SAVED AUTHORING DRAFT/);
  assert.match(store, /api\.importAdjustment\?\.\(record\.adjustment/);
  assert.doesNotMatch(store, /active\.play\?\.\(\)/);
});

test('draft-store installation is tied to explicit Motion Lab runtime initialization', () => {
  assert.match(bootstrap, /installAuthoringDraftStore\(\)/);
  assert.match(bootstrap, /authoring_draft_store_install/);
});

test('canonical lunge v3 authoring identity matches phase-first split calibration', () => {
  assert.equal(Lunge.spec.version, 3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_phase_first_v3_owner_split_plant');
  assert.equal(Lunge.spec.lineage.resetMethod, 'phase-first-owner-split-plant');
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 79);
  assert.equal(pitch('split_plant', 'mixamorig:LeftLeg'), -84);
  assert.equal(pitch('split_plant', 'mixamorig:RightUpLeg'), -49);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -14);
  assert.match(preview, /Load Stationary Lunge Left v3\.0 Phase-First/);
});

test('owner split bundle provenance is explicit', () => {
  const deltas = new Map(Lunge.spec.acceptedAuthoringAdjustment.deltas.map(item => [item.bone, item]));
  assert.equal(deltas.get('mixamorig:LeftUpLeg').baseDegrees, 34);
  assert.equal(deltas.get('mixamorig:LeftUpLeg').deltaDegrees, 45);
  assert.equal(deltas.get('mixamorig:LeftUpLeg').canonicalDegrees, 79);
  assert.equal(deltas.get('mixamorig:RightFoot').canonicalDegrees, 9);
});

test('lunge validator protects owner split pose from drift', () => {
  const candidate = { ...Lunge.spec, phases: Lunge.spec.phases.map(item => item.id !== 'split_plant' ? item : { ...item, boneTargets: item.boneTargets.map(target => target.bone !== 'mixamorig:RightLeg' ? target : { ...target, rotationOffsetEulerDegrees: [-10,0,0] }) }) };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_OWNER_SPLIT_CALIBRATION/.test(error)));
});
