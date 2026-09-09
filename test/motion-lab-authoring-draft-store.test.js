'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
const store = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-authoring-draft-store.js'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v2.json'), 'utf8'));
const Lunge = require('../public/motion/lunge-motion-spec.js');

function phase(id){ return Lunge.spec.phases.find(item => item.id === id); }
function pitch(id,bone){ return phase(id).boneTargets.find(item => item.bone === bone).rotationOffsetEulerDegrees[0]; }

test('Pose Editor exposes browser-local save load and delete controls', () => {
  assert.match(index, /id="poseEditorSaveDraft"[^>]*>Save Adjusted Motion</);
  assert.match(index, /id="poseEditorLoadDraft"[^>]*>Load Saved Motion</);
  assert.match(index, /id="poseEditorDeleteDraft"[^>]*>Delete Saved Motion</);
});

test('draft store snapshots the current authored phase into a cumulative working clip', () => {
  assert.match(store, /function snapshotCurrentPhase\(/);
  assert.match(store, /workingClipJson/);
  assert.match(store, /patchNearest\(track,time,node\.quaternion\.toArray\(\)\)/);
  assert.match(store, /patchNearest\(track,time,node\.position\.toArray\(\)\)/);
  assert.match(store, /poseEditorLoadPhase/);
  assert.doesNotMatch(store, /api\.playAdjustedPreview\?\.\(\)/);
});

test('loading and resaving a draft preserves prior structured edit history', () => {
  assert.match(store, /restoredAdjustment/);
  assert.match(store, /function mergedAdjustment\(/);
  assert.match(store, /readRecord\(id\)\?\.adjustment/);
  assert.match(store, /restoredAdjustment\.set\(id,Object\.freeze\(record\.adjustment/);
  assert.match(store, /structured edit history is preserved/);
});

test('draft-store installer does not expire before manual Motion Lab initialization', () => {
  assert.match(store, /function waitForRuntime\(\)/);
  assert.match(store, /setTimeout\?\.\(waitForRuntime,500\)/);
  assert.doesNotMatch(store, /attempt < 80/);
});

test('canonical lunge is v2.3 and includes the owner-approved split-plant right-knee calibration', () => {
  assert.equal(Lunge.spec.version, 2.3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_3_owner_split_knee');
  assert.equal(pitch('step_forward','mixamorig:LeftUpLeg'), 55);
  assert.equal(pitch('split_plant','mixamorig:LeftUpLeg'), 40);
  assert.equal(pitch('split_plant','mixamorig:RightUpLeg'), -34);
  assert.equal(pitch('split_plant','mixamorig:RightLeg'), -1);
  assert.equal(pitch('rep1_top','mixamorig:RightLeg'), -6);
  assert.equal(pitch('rep2_top','mixamorig:RightLeg'), -6);
  assert.equal(pitch('rep3_top','mixamorig:RightLeg'), -6);
  assert.equal(pitch('rep1_bottom','mixamorig:LeftLeg'), -88);
  assert.equal(pitch('rep1_bottom','mixamorig:RightLeg'), -92);
  const validation=Lunge.validate(Lunge.spec);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
});

test('v2.3 validator fails closed if owner calibration drifts', () => {
  const split=phase('split_plant');
  const candidate={ ...Lunge.spec, phases:Lunge.spec.phases.map(item => item.id==='split_plant' ? { ...item, boneTargets:item.boneTargets.map(target => target.bone==='mixamorig:RightLeg' ? { ...target, rotationOffsetEulerDegrees:[-6,0,0] } : target) } : item) };
  const result=Lunge.validate(candidate);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(error => /LUNGE_OWNER_CALIBRATION/.test(error)));
});

test('movement contract records v2.3 lineage and split-plant-only approval scope', () => {
  assert.equal(contract.canonicalMotion.version, 2.3);
  assert.equal(contract.canonicalMotion.motionId, Lunge.spec.motionId);
  assert.equal(contract.ownerCalibration.phaseId, 'split_plant');
  assert.equal(contract.ownerCalibration.requiredPitchDegrees, -1);
  assert.equal(contract.ownerCalibration.approvedDeltaDegrees, 5);
  assert.equal(contract.ownerCalibration.scope, 'split_plant_only');
  assert.ok(contract.hardConstraints.includes('owner_split_plant_right_knee_pitch_is_minus_1_degree'));
});
