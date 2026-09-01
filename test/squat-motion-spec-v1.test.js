const assert = require('node:assert/strict');
const test = require('node:test');

const SquatMotion = require('../public/motion/squat-motion-spec.js');

test('synthesized squat spec validates against canonical bones', () => {
  const result = SquatMotion.validate(SquatMotion.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('synthesized squat uses the canonical five-phase squat cycle', () => {
  assert.deepEqual(SquatMotion.spec.phaseOrder, ['start', 'descent', 'bottom', 'ascent', 'finish']);
  assert.equal(SquatMotion.spec.phases.length, 5);
  assert.equal(SquatMotion.spec.phases[0].normalizedTime, 0);
  assert.equal(SquatMotion.spec.phases.at(-1).normalizedTime, 1);
});

test('descent and ascent are mirrored engineering poses', () => {
  const descent = SquatMotion.spec.phases.find(phase => phase.id === 'descent');
  const ascent = SquatMotion.spec.phases.find(phase => phase.id === 'ascent');
  assert.deepEqual(descent.root.positionOffset, ascent.root.positionOffset);
  assert.deepEqual(descent.root.rotationOffsetEulerDegrees, ascent.root.rotationOffsetEulerDegrees);
  assert.deepEqual(descent.boneTargets, ascent.boneTargets);
});

test('grounded v2 preserves bilateral foot contact in every phase', () => {
  assert.equal(SquatMotion.spec.version, 2);
  assert.equal(SquatMotion.spec.motionId, 'squat/synthesized_engineering_v2_grounded');
  assert.equal(SquatMotion.spec.groundingPolicy.mode, 'dual-foot-planted-engineering-reference');
  for (const phase of SquatMotion.spec.phases) assert.deepEqual(phase.contacts, ['left_foot', 'right_foot']);
});

test('grounded v2 uses kettlebell-swing leg-chain direction instead of tuck-jump direction', () => {
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  const leftThigh = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftUpLeg');
  const leftLeg = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftLeg');
  assert.ok(leftThigh.rotationOffsetEulerDegrees[0] > 0);
  assert.ok(leftLeg.rotationOffsetEulerDegrees[0] < 0);
  assert.ok(bottom.root.positionOffset[1] < 0);
  assert.ok(bottom.root.rotationOffsetEulerDegrees[0] > 0);
});

test('spec is explicitly development-only and not biomechanically authoritative', () => {
  assert.equal(SquatMotion.spec.status, 'development-test-only');
  assert.equal(SquatMotion.spec.synthesisBoundary.copiedNamedSquatAnimation, false);
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('biomechanical ground truth'));
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('scoring tolerances'));
});

test('summary keeps human MoveNet review as a required next step', () => {
  const summary = SquatMotion.summary();
  assert.equal(summary.motionId, 'squat/synthesized_engineering_v2_grounded');
  assert.equal(summary.requiresHumanMoveNetReview, true);
  assert.equal(summary.bottomRootDropAvatarHeights, 0.10);
  assert.equal(summary.groundingMode, 'dual-foot-planted-engineering-reference');
});
