'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Lunge = require('../public/motion/lunge-motion-spec.js');

const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v2.json'), 'utf8'));
const phase = id => Lunge.spec.phases.find(item => item.id === id);
const pitch = (id, bone) => phase(id)?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0];

test('v2.3 keeps the playable v2.1 geometry base while preserving the approved split-plant correction', () => {
  assert.equal(Lunge.spec.version, 2.3);
  assert.equal(Lunge.spec.lineage.playableBaseMotionId, 'lunge/stationary_left_movement_definition_v2_1_exit_release');
  assert.equal(Lunge.spec.lineage.rejectedGeometryFamily, 'v2.2-long-stride');
  assert.equal(pitch('step_forward', 'mixamorig:LeftUpLeg'), 34);
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 24);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -2);
  assert.equal(pitch('rep1_top', 'mixamorig:RightLeg'), -7);
  assert.equal(pitch('rep1_bottom', 'mixamorig:LeftLeg'), -72);
  assert.equal(pitch('rep1_bottom', 'mixamorig:RightLeg'), -82);
  assert.equal(Lunge.validate(Lunge.spec).valid, true);
});

test('movement contract and runtime source cannot disagree on active lunge lineage', () => {
  assert.equal(contract.canonicalMotion.motionId, Lunge.spec.motionId);
  assert.equal(contract.canonicalMotion.playableBaseMotionId, Lunge.spec.lineage.playableBaseMotionId);
  assert.equal(contract.canonicalMotion.rejectedGeometryFamily, Lunge.spec.lineage.rejectedGeometryFamily);
  assert.equal(contract.ownerCalibration.basePitchDegrees, Lunge.spec.acceptedAuthoringAdjustment.basePitchDegrees);
  assert.equal(contract.ownerCalibration.approvedDeltaDegrees, Lunge.spec.acceptedAuthoringAdjustment.approvedDeltaDegrees);
  assert.equal(contract.ownerCalibration.requiredPitchDegrees, Lunge.spec.acceptedAuthoringAdjustment.canonicalPitchDegrees);
  assert.equal(contract.authoredReferenceGeometry.stepForwardLeftHipFlexionDegrees, pitch('step_forward', 'mixamorig:LeftUpLeg'));
  assert.equal(contract.authoredReferenceGeometry.splitPlantLeftHipFlexionDegrees, pitch('split_plant', 'mixamorig:LeftUpLeg'));
  assert.equal(contract.authoredReferenceGeometry.splitPlantRightKneePitchDegrees, pitch('split_plant', 'mixamorig:RightLeg'));
});
