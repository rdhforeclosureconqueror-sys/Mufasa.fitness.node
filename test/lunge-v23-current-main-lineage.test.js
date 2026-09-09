'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Lunge = require('../public/motion/lunge-motion-spec.js');

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
