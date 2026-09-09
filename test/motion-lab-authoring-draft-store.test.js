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
const Lunge = require('../public/motion/lunge-motion-spec.js');

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function pitch(id, bone) { return phase(id).boneTargets.find(item => item.bone === bone).rotationOffsetEulerDegrees[0]; }

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
  assert.doesNotMatch(store, /lunge-motion-spec\.js/);
});

test('accumulated edits are preserved in preview clip instead of rebuilding only from original', () => {
  assert.match(editor, /previewClip\?\.clone\?\.\(\) \|\| originalClip\?\.clone/);
  assert.match(editor, /recordEdit[\s\S]*patchPreviewClip\(\)/);
  assert.doesNotMatch(editor, /edits = edits\.filter\(edit => edit\.phaseId !== sampledPhaseId\)/);
});

test('saved authored clip restores both clip and structured edit state without autoplay', () => {
  assert.match(store, /AnimationClip\?\.parse/);
  assert.match(store, /SAVED AUTHORING DRAFT/);
  assert.match(store, /active\.loadMotionSpec\(active\.motionSpec, compiler\)/);
  assert.match(store, /api\.importAdjustment\?\.\(record\.adjustment\)/);
  assert.match(editor, /function importAdjustment\(payload\)/);
  assert.doesNotMatch(store, /active\.play\?\.\(\)/);
});

test('draft-store installation is tied to explicit Motion Lab runtime initialization', () => {
  assert.match(bootstrap, /installAuthoringDraftStore\(\)/);
  assert.match(bootstrap, /authoring_draft_store_install/);
  assert.doesNotMatch(store, /attempt < 80/);
});

test('saving requires real edits and a successfully built adjusted preview', () => {
  assert.match(store, /authoring_edits_required/);
  assert.match(store, /api\.playAdjustedPreview\?\.\(\)/);
  assert.match(store, /adjusted_preview_build/);
  assert.match(store, /clip_serialization_failed/);
});

test('canonical lunge is v2.3 and includes the owner-approved split-plant knee calibration', () => {
  assert.equal(Lunge.spec.version, 2.3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_3_owner_split_knee');
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -1);
  assert.equal(pitch('rep1_top', 'mixamorig:RightLeg'), -6);
  assert.equal(pitch('rep2_top', 'mixamorig:RightLeg'), -6);
  assert.equal(pitch('rep3_top', 'mixamorig:RightLeg'), -6);
  assert.equal(Lunge.spec.authoringGeometryGate.splitPlantOwnerApprovedRightKneePitchDegrees, -1);
  assert.match(index, /Load Stationary Lunge Left v2\.3 \(Reference Only\)/);
});

test('lunge validator protects the approved split-plant calibration', () => {
  const candidate = {
    ...Lunge.spec,
    phases: Lunge.spec.phases.map(item => item.id !== 'split_plant' ? item : {
      ...item,
      boneTargets: item.boneTargets.map(target => target.bone !== 'mixamorig:RightLeg' ? target : {
        ...target,
        rotationOffsetEulerDegrees: [-6, 0, 0]
      })
    })
  };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_OWNER_CALIBRATION/.test(error)));
});
