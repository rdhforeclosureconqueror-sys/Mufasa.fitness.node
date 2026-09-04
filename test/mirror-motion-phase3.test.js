'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const phase3 = require('../public/mirror-motion-phase3.js');

function packet(overrides = {}) {
  const points = {
    left_shoulder:[100,100], right_shoulder:[200,100],
    left_elbow:[100,160], right_elbow:[200,160],
    left_wrist:[100,220], right_wrist:[200,220],
    left_hip:[115,220], right_hip:[185,220],
    left_knee:[115,320], right_knee:[185,320],
    left_ankle:[115,420], right_ankle:[185,420]
  };
  return {
    timestampMs: 100,
    keypoints: Object.entries(points).map(([name,[x,y]]) => ({ name, x, y, score: 0.95, confidence: 0.95, stabilityState:'smoothed' })),
    ...overrides
  };
}

function movePoint(input, name, x, y) {
  const copy = { ...input, keypoints: input.keypoints.map(p => ({ ...p })) };
  const point = copy.keypoints.find(p => p.name === name);
  point.x = x; point.y = y;
  return copy;
}

test('learns segment lengths before enforcing structural constraints', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 3 });
  for (let i = 0; i < 3; i += 1) engine.process(packet());
  assert.equal(engine.diagnostics().calibratedSegments, 8);
});

test('constrains an implausible thigh-length change after calibration without contaminating the model', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 3, lengthToleranceRatio: 0.15, calibrationUpdateToleranceRatio: 0.15 });
  for (let i = 0; i < 3; i += 1) engine.process(packet());
  const before = engine.diagnostics().segmentModel.left_thigh.length;
  const bad = movePoint(packet(), 'left_knee', 115, 500);
  const out = engine.process(bad);
  const knee = out.keypoints.find(p => p.name === 'left_knee');
  const after = engine.diagnostics().segmentModel.left_thigh.length;
  assert.equal(knee.structuralState, 'length_constrained');
  assert.equal(knee.structuralSegment, 'left_thigh');
  assert.ok(Math.abs(knee.y - 320) < 5, `expected correction to learned length, got ${knee.y}`);
  assert.ok(Math.abs(after - before) < 0.001, `outlier changed model from ${before} to ${after}`);
  assert.equal(out.structural.frameStats.calibrationRejected > 0, true);
});

test('uses a robust median while seeding calibration', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 5 });
  engine.process(packet());
  engine.process(packet());
  engine.process(movePoint(packet(), 'left_knee', 115, 500));
  engine.process(packet());
  engine.process(packet());
  const model = engine.diagnostics().segmentModel.left_thigh;
  assert.equal(model.samples, 5);
  assert.ok(Math.abs(model.length - 100) < 0.001, `expected median seed near 100, got ${model.length}`);
});

test('does not calibrate from coasted low-trust joints', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 1 });
  const input = packet();
  input.keypoints.find(p => p.name === 'left_knee').stabilityState = 'coasted';
  engine.process(input);
  const model = engine.diagnostics().segmentModel.left_thigh;
  assert.equal(model, undefined);
});

test('recovers an obvious left/right knee identity swap using temporal continuity', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 99, identityMinimumTravelRatio: 0.1, identitySwapMarginRatio: 0.05 });
  engine.process(packet());
  const swapped = packet();
  const left = swapped.keypoints.find(p => p.name === 'left_knee');
  const right = swapped.keypoints.find(p => p.name === 'right_knee');
  [left.x, right.x] = [right.x, left.x];
  const out = engine.process(swapped);
  const outLeft = out.keypoints.find(p => p.name === 'left_knee');
  const outRight = out.keypoints.find(p => p.name === 'right_knee');
  assert.ok(outLeft.x < outRight.x);
  assert.match(outLeft.structuralIdentityState, /recovered_from_right_knee/);
  assert.equal(out.structural.frameStats.identitySwaps > 0, true);
});

test('does not perform left/right recovery from coasted points', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 99, identityMinimumTravelRatio: 0.1, identitySwapMarginRatio: 0.05 });
  engine.process(packet());
  const swapped = packet();
  const left = swapped.keypoints.find(p => p.name === 'left_knee');
  const right = swapped.keypoints.find(p => p.name === 'right_knee');
  [left.x, right.x] = [right.x, left.x];
  left.stabilityState = 'coasted';
  right.stabilityState = 'coasted';
  const out = engine.process(swapped);
  assert.equal(out.structural.frameStats.identitySwaps, 0);
  assert.equal(out.keypoints.find(p => p.name === 'left_knee').structuralIdentityState, undefined);
});

test('wrapper sends structurally constrained packet to downstream renderer', () => {
  const engine = phase3.createStructuralEngine({ minCalibrationSamples: 1, lengthToleranceRatio: 0.1 });
  engine.process(packet());
  let received;
  const wrapped = packetIn => {
    const constrained = engine.process(packetIn);
    received = constrained;
  };
  wrapped(movePoint(packet(), 'left_knee', 115, 500));
  assert.equal(received.keypoints.find(p => p.name === 'left_knee').structuralState, 'length_constrained');
});

test('Phase 3 structural state resets when Phase 2 tracker history resets', () => {
  let trackerResets = 0;
  global.PocketPTMirrorMotionPhase2 = { diagnostics: () => ({ trackerResets }) };
  phase3.reset();
  const wrapped = phase3.wrapRenderer(() => true);
  for (let i = 0; i < 6; i += 1) wrapped(packet());
  assert.equal(phase3.diagnostics().calibratedSegments, 8);
  trackerResets = 1;
  wrapped(packet());
  const diag = phase3.diagnostics();
  assert.equal(diag.structuralResets, 1);
  assert.equal(diag.lastStructuralResetReason, 'PHASE2_TRACKER_RESET');
  assert.equal(diag.calibratedSegments, 0);
  delete global.PocketPTMirrorMotionPhase2;
});

test('diagnostics expose calibration rejection and structural reset fields', () => {
  phase3.reset();
  const text = phase3.diagnosticsText();
  assert.match(text, /First failing boundary:/);
  assert.match(text, /Calibrated segments:/);
  assert.match(text, /Calibration outliers rejected:/);
  assert.match(text, /Length corrections:/);
  assert.match(text, /Left\/right recoveries:/);
  assert.match(text, /Structural resets:/);
});
