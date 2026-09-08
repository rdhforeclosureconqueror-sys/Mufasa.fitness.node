'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../public/motion/avatar-motion-intelligence-core');

function nearly(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

test('Phase 1 preserves canonical mirror contact and length defaults', () => {
  assert.equal(Core.DEFAULTS.anchorMaxDriftRatio, 0.18);
  assert.equal(Core.DEFAULTS.anchorCorrectionGain, 0.82);
  assert.equal(Core.DEFAULTS.anchorCorrectionMinRatio, 0.015);
  assert.equal(Core.DEFAULTS.segmentLengthToleranceRatio, 0.22);
  assert.equal(Core.DEFAULTS.maxYawDeg, 65);
});

test('segment-length constraint works in 3D without changing a valid chain', () => {
  const proximal = { x: 0, y: 0, z: 0 };
  const distal = { x: 3, y: 4, z: 0 };
  const pass = Core.constrainSegmentLength(proximal, distal, 5);
  assert.equal(pass.status, 'WITHIN_TOLERANCE');

  const corrected = Core.constrainSegmentLength(proximal, { x: 0, y: 10, z: 0 }, 5, { toleranceRatio: 0.01 });
  assert.equal(corrected.status, 'CORRECTED');
  nearly(Core.distance(proximal, corrected.point), 5);
});

test('contact anchors correct bounded drift and release implausible drift', () => {
  const anchor = { x: 0, y: 0, z: 0 };
  const corrected = Core.applyContactAnchor({ x: 4, y: 0, z: 0 }, anchor, 100);
  assert.equal(corrected.status, 'CORRECTED');
  nearly(corrected.point.x, 0.72);

  const released = Core.applyContactAnchor({ x: 30, y: 0, z: 0 }, anchor, 100);
  assert.equal(released.status, 'RELEASED_EXCESS_DRIFT');
});

test('two-bone IK preserves calibrated chain lengths in 2D and 3D', () => {
  const twoD = Core.solveTwoBoneChain(
    { x: 0, y: 0 },
    { x: 3, y: 4 },
    { x: 6, y: 0 },
    5,
    5,
    { bendHint: { x: 3, y: 4 } }
  );
  assert.equal(twoD.status, 'SOLVED');
  nearly(Core.distance({ x: 0, y: 0 }, twoD.point), 5);
  nearly(Core.distance(twoD.point, { x: 6, y: 0 }), 5);

  const threeD = Core.solveTwoBoneChain(
    { x: 0, y: 0, z: 0 },
    { x: 2, y: 3, z: 2 },
    { x: 4, y: 0, z: 2 },
    4,
    4,
    { bendHint: { x: 2, y: 3, z: 2 } }
  );
  assert.equal(threeD.status, 'SOLVED');
  nearly(Core.distance({ x: 0, y: 0, z: 0 }, threeD.point), 4);
  nearly(Core.distance(threeD.point, { x: 4, y: 0, z: 2 }), 4);
});

test('stationary-lunge style dual contacts produce one bounded root correction instead of foot drift', () => {
  const result = Core.solveRootAnchorCorrection([
    { id: 'left_front_foot', current: { x: 0.04, y: 0, z: 0 }, anchor: { x: 0, y: 0, z: 0 } },
    { id: 'right_rear_forefoot', current: { x: -1.92, y: 0.03, z: 0.02 }, anchor: { x: -2, y: 0, z: 0 } }
  ], { maxCorrection: 0.1 });
  assert.equal(result.status, 'CORRECTION_REQUIRED');
  assert.equal(result.contactCount, 2);
  assert.ok(Math.hypot(result.delta.x, result.delta.y, result.delta.z) <= 0.1000001);
});

test('yaw intent rejects fake depth and clamps rest-relative turn intent', () => {
  const rejected = Core.boundYawIntent({ yawIntentDeg: 30, confidence: 1, measuredDepth: true });
  assert.equal(rejected.status, 'REJECTED_DEPTH_CLAIM');
  assert.equal(rejected.yawDeg, 0);

  const bounded = Core.boundYawIntent({ yawIntentDeg: 120, confidence: 1, measuredDepth: false });
  assert.equal(bounded.status, 'CLAMPED');
  assert.equal(bounded.yawDeg, 65);
});

test('kinematic validator reports the first violated constraint', () => {
  const result = Core.validateKinematicPose({
    segmentConstraints: [
      { id: 'left_thigh', proximal: { x: 0, y: 0 }, distal: { x: 0, y: 12 }, targetLength: 10, toleranceRatio: 0.1 }
    ],
    contacts: [
      { id: 'front_foot', current: { x: 0, y: 0 }, anchor: { x: 0, y: 0 }, maxDrift: 0.1 }
    ]
  });
  assert.equal(result.status, 'FAILED');
  assert.equal(result.firstFailure.type, 'SEGMENT_LENGTH');
  assert.equal(result.firstFailure.id, 'left_thigh');
});
