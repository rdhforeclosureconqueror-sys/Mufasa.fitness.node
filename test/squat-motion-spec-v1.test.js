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
});

test('v3 encodes the requested standing and bottom knee-angle targets', () => {
  assert.equal(SquatMotion.spec.version, 3);
  assert.equal(SquatMotion.spec.motionId, 'squat/synthesized_engineering_v3_90deg_groundlock');
  assert.equal(SquatMotion.spec.movementContract.standingKneeInsideAngleTargetDegrees, 180);
  assert.equal(SquatMotion.spec.movementContract.bottomKneeInsideAngleTargetDegrees, 90);
  assert.equal(SquatMotion.spec.movementContract.armsPriority, 'secondary-after-lower-body-approval');
});

test('v3 requires real dual-foot contact-anchor enforcement', () => {
  assert.equal(SquatMotion.spec.groundingPolicy.enforceContactAnchors, true);
  assert.deepEqual(SquatMotion.spec.groundingPolicy.contacts, ['left_foot', 'right_foot']);
  assert.equal(SquatMotion.spec.groundingPolicy.contactBones.left_foot, 'mixamorig:LeftFoot');
  assert.equal(SquatMotion.spec.groundingPolicy.contactBones.right_foot, 'mixamorig:RightFoot');
  for (const phase of SquatMotion.spec.phases) assert.deepEqual(phase.contacts, ['left_foot', 'right_foot']);
});

test('v3 deepens lower-body flexion beyond grounded v2 while preserving squat direction', () => {
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  const leftThigh = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftUpLeg');
  const leftLeg = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftLeg');
  assert.ok(leftThigh.rotationOffsetEulerDegrees[0] >= 78);
  assert.ok(leftLeg.rotationOffsetEulerDegrees[0] <= -100);
  assert.ok(bottom.root.positionOffset[1] <= -0.20);
  assert.ok(bottom.root.positionOffset[2] < 0);
});

test('descent and ascent remain mirrored lower-body engineering poses', () => {
  const descent = SquatMotion.spec.phases.find(phase => phase.id === 'descent');
  const ascent = SquatMotion.spec.phases.find(phase => phase.id === 'ascent');
  assert.deepEqual(descent.root.positionOffset, ascent.root.positionOffset);
  assert.deepEqual(descent.root.rotationOffsetEulerDegrees, ascent.root.rotationOffsetEulerDegrees);
  assert.deepEqual(descent.boneTargets, ascent.boneTargets);
});

test('spec remains development-only and not biomechanically authoritative', () => {
  assert.equal(SquatMotion.spec.status, 'development-test-only');
  assert.equal(SquatMotion.spec.synthesisBoundary.copiedNamedSquatAnimation, false);
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('biomechanical ground truth'));
});

test('summary exposes 90-degree target and enforced contact lock', () => {
  const summary = SquatMotion.summary();
  assert.equal(summary.targetBottomKneeInsideAngleDegrees, 90);
  assert.equal(summary.contactAnchorsEnforced, true);
  assert.equal(summary.bottomRootDropAvatarHeights, 0.22);
  assert.equal(summary.requiresHumanMoveNetReview, true);
});
