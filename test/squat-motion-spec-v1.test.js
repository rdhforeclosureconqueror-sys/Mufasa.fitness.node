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

test('v5 preserves requested targets and identifies Back Squat mechanics source', () => {
  assert.equal(SquatMotion.spec.version, 5);
  assert.equal(SquatMotion.spec.motionId, 'squat/synthesized_engineering_v5_back_squat_reference');
  assert.equal(SquatMotion.spec.movementContract.standingKneeInsideAngleTargetDegrees, 180);
  assert.equal(SquatMotion.spec.movementContract.bottomKneeInsideAngleTargetDegrees, 90);
  assert.equal(SquatMotion.spec.movementContract.armsPriority, 'secondary-after-lower-body-approval');
  assert.equal(SquatMotion.spec.referenceGeometryPolicy.mechanicsSource, '/motion-sources/back-squat-reference.source.json');
});

test('v5 keeps real dual-foot contact-anchor enforcement', () => {
  assert.equal(SquatMotion.spec.groundingPolicy.enforceContactAnchors, true);
  assert.deepEqual(SquatMotion.spec.groundingPolicy.contacts, ['left_foot', 'right_foot']);
  for (const phase of SquatMotion.spec.phases) assert.deepEqual(phase.contacts, ['left_foot', 'right_foot']);
});

test('v5 uses source-derived deeper root descent and posterior shift', () => {
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  assert.equal(bottom.root.positionOffset[1], -0.31);
  assert.equal(bottom.root.positionOffset[2], -0.08);
  assert.equal(SquatMotion.spec.referenceGeometryPolicy.mode, 'source-derived-back-squat-plus-runtime-grounding');
  assert.ok(SquatMotion.spec.referenceGeometryPolicy.requiredMeasuredChecks.includes('dual_foot_contact'));
});

test('v5 lower-body deltas reflect extracted Back Squat mechanics', () => {
  const descent = SquatMotion.spec.phases.find(phase => phase.id === 'descent');
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  const read = (phase, bone) => phase.boneTargets.find(target => target.bone === bone).rotationOffsetEulerDegrees[0];
  assert.equal(read(descent, 'mixamorig:LeftUpLeg'), 61);
  assert.equal(read(descent, 'mixamorig:LeftLeg'), -77);
  assert.equal(read(descent, 'mixamorig:LeftFoot'), 30);
  assert.equal(read(bottom, 'mixamorig:LeftUpLeg'), 108);
  assert.equal(read(bottom, 'mixamorig:LeftLeg'), -132);
  assert.equal(read(bottom, 'mixamorig:LeftFoot'), 35);
  assert.equal(read(bottom, 'mixamorig:RightUpLeg'), 108);
  assert.equal(read(bottom, 'mixamorig:RightLeg'), -132);
});

test('v5 returns to the exact standing pose and root position', () => {
  const start = SquatMotion.spec.phases.find(phase => phase.id === 'start');
  const finish = SquatMotion.spec.phases.find(phase => phase.id === 'finish');
  assert.deepEqual(start.root, finish.root);
  assert.deepEqual(start.boneTargets, finish.boneTargets);
});

test('spec remains development-only and does not claim direct binary playback', () => {
  assert.equal(SquatMotion.spec.status, 'development-test-only');
  assert.equal(SquatMotion.spec.synthesisBoundary.copiedNamedSquatAnimation, false);
  assert.equal(SquatMotion.spec.synthesisBoundary.directBinaryPlayback, false);
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('biomechanical ground truth'));
});

test('summary exposes source mechanics, foot lock and v5 root travel', () => {
  const summary = SquatMotion.summary();
  assert.equal(summary.targetBottomKneeInsideAngleDegrees, 90);
  assert.equal(summary.contactAnchorsEnforced, true);
  assert.equal(summary.bottomRootDropAvatarHeights, 0.31);
  assert.equal(summary.bottomPosteriorRootTravelAvatarHeights, 0.08);
  assert.equal(summary.mechanicsSource, '/motion-sources/back-squat-reference.source.json');
  assert.equal(summary.requiresHumanMoveNetReview, true);
});
