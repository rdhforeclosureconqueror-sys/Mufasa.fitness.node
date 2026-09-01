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

test('v4 preserves the requested standing and bottom knee-angle targets', () => {
  assert.equal(SquatMotion.spec.version, 4);
  assert.equal(SquatMotion.spec.motionId, 'squat/synthesized_engineering_v4_hip_back_geometry_lock');
  assert.equal(SquatMotion.spec.movementContract.standingKneeInsideAngleTargetDegrees, 180);
  assert.equal(SquatMotion.spec.movementContract.bottomKneeInsideAngleTargetDegrees, 90);
  assert.equal(SquatMotion.spec.movementContract.armsPriority, 'secondary-after-lower-body-approval');
});

test('v4 keeps real dual-foot contact-anchor enforcement', () => {
  assert.equal(SquatMotion.spec.groundingPolicy.enforceContactAnchors, true);
  assert.deepEqual(SquatMotion.spec.groundingPolicy.contacts, ['left_foot', 'right_foot']);
  for (const phase of SquatMotion.spec.phases) assert.deepEqual(phase.contacts, ['left_foot', 'right_foot']);
});

test('v4 increases posterior pelvis travel while preserving depth', () => {
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  assert.ok(bottom.root.positionOffset[1] <= -0.20);
  assert.ok(bottom.root.positionOffset[2] <= -0.12);
  assert.equal(SquatMotion.spec.referenceGeometryPolicy.mode, 'side_projection_hip_back_envelope');
  assert.ok(SquatMotion.spec.referenceGeometryPolicy.requiredMeasuredChecks.includes('posterior_pelvis_travel'));
  assert.ok(SquatMotion.spec.referenceGeometryPolicy.requiredMeasuredChecks.includes('reference_knee_forward_envelope'));
});

test('v4 reduces ankle-driven forward-knee bias while preserving deep leg flexion', () => {
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  const leftThigh = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftUpLeg');
  const leftLeg = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftLeg');
  const leftFoot = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftFoot');
  assert.ok(leftThigh.rotationOffsetEulerDegrees[0] >= 80);
  assert.ok(leftLeg.rotationOffsetEulerDegrees[0] <= -100);
  assert.ok(leftFoot.rotationOffsetEulerDegrees[0] <= 30);
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
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('universal knees-behind-toes rule'));
});

test('summary exposes 90-degree target, foot lock and posterior travel', () => {
  const summary = SquatMotion.summary();
  assert.equal(summary.targetBottomKneeInsideAngleDegrees, 90);
  assert.equal(summary.contactAnchorsEnforced, true);
  assert.equal(summary.bottomRootDropAvatarHeights, 0.22);
  assert.equal(summary.bottomPosteriorRootTravelAvatarHeights, 0.14);
  assert.equal(summary.requiresHumanMoveNetReview, true);
});
