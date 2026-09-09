'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v3.json'), 'utf8'));
const phase = id => Lunge.spec.phases.find(item => item.id === id);
const pitch = (id, bone) => phase(id)?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0];

test('v3 resets lunge lineage around owner-authored split plant', () => {
  assert.equal(Lunge.spec.version, 3);
  assert.equal(Lunge.spec.lineage.previousMotionId, 'lunge/stationary_left_movement_definition_v2_3_playable_base_owner_split_knee');
  assert.equal(Lunge.spec.lineage.resetMethod, 'phase-first-owner-split-plant');
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 79);
  assert.equal(pitch('split_plant', 'mixamorig:LeftLeg'), -84);
  assert.equal(pitch('split_plant', 'mixamorig:RightUpLeg'), -49);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -14);
  assert.equal(Lunge.validate(Lunge.spec).valid, true);
});

test('movement contract and runtime source agree on v3 phase-first authority', () => {
  assert.equal(contract.canonicalMotion.motionId, Lunge.spec.motionId);
  assert.equal(contract.canonicalMotion.resetMethod, Lunge.spec.lineage.resetMethod);
  assert.deepEqual(contract.phaseOrder, Lunge.spec.phaseOrder);
  assert.equal(contract.ownerSplitPlantCalibration.canonicalPitchDegrees['mixamorig:LeftUpLeg'], pitch('split_plant', 'mixamorig:LeftUpLeg'));
  assert.equal(contract.ownerSplitPlantCalibration.canonicalPitchDegrees['mixamorig:RightLeg'], pitch('split_plant', 'mixamorig:RightLeg'));
});
