'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Calibration = require('../public/arena-pose-calibration');

function frame(kind, timestamp, jitter = 0) {
  const points = kind === 'TOP' ? {
    shoulder: [0, 0], elbow: [1, 0], wrist: [2, 0], hip: [0, 1], ankle: [0, 2]
  } : {
    shoulder: [0, 0], elbow: [1, 0], wrist: [1, 1], hip: [0, 1], ankle: [0, 2]
  };
  return {timestamp, sourceWidth: 1000, sourceHeight: 1000, side: 'left', analysisUsable: true, trackingState: 'LOCKED', sequenceLandmarks: Object.fromEntries(
    Object.entries(points).map(([name, [x, y]]) => [name, {x: .1 + .2 * x + jitter, y: .1 + .2 * y, confidence: .95}]))};
}
function create(options = {}) {
  let time = 0;
  const calibration = Calibration.create({...options, now: () => time});
  return {...calibration,
    observe(value, confidence) {time = value.timestamp; return calibration.observe(value, confidence);},
    classify(value, confidence) {time = value.timestamp; return calibration.classify(value, confidence);}};
}
function hold(calibration, kind, start = 0, patch = value => value, confidence = .75) {
  for (let index = 0; index < 11; index++) calibration.observe(patch(frame(kind, start + index * 300, index % 2 ? .001 : 0)), confidence);
}

test('captures stable personal TOP and BOTTOM geometry and confirms TOP return', () => {
  const stages = [], calibration = create({onChange: state => stages.push(state.stage)});
  calibration.start(); hold(calibration, 'TOP');
  assert.deepEqual(calibration.snapshot(), {stage: 'CAPTURE_BOTTOM', reason: null, failedStage: null, topCaptured: true, bottomCaptured: false, calibrated: false});
  hold(calibration, 'BOTTOM', 3300);
  assert.deepEqual(calibration.snapshot(), {stage: 'CONFIRM_TOP', reason: null, failedStage: null, topCaptured: true, bottomCaptured: true, calibrated: false});
  hold(calibration, 'TOP', 6600);
  assert.equal(calibration.snapshot().calibrated, true);
  assert.deepEqual(stages, ['CAPTURE_TOP', 'CAPTURE_BOTTOM', 'CONFIRM_TOP', 'CALIBRATED']);
  assert.equal(calibration.classify(frame('TOP', 9900), .75), 'TOP');
  assert.equal(calibration.classify(frame('BOTTOM', 10000), .75), 'BOTTOM');
});

test('does not capture an unchanged or unstable pose as BOTTOM', () => {
  const calibration = create(); calibration.start(); hold(calibration, 'TOP');
  hold(calibration, 'TOP', 3300); assert.equal(calibration.snapshot().stage, 'CAPTURE_BOTTOM');
  for (let index = 0; index < 16; index++) calibration.observe(frame(index % 2 ? 'TOP' : 'BOTTOM', 6600 + index * 100), .75);
  assert.equal(calibration.snapshot().stage, 'CAPTURE_BOTTOM');
});

test('rejects unusable frames and exposes no pose geometry in public state', () => {
  const calibration = create(); calibration.start();
  const unusable = frame('TOP', 0); unusable.sequenceLandmarks.elbow.confidence = .2;
  for (let index = 0; index < 10; index++) calibration.observe({...unusable, timestamp: index * 100}, .75);
  assert.equal(calibration.snapshot().topCaptured, false);
  hold(calibration, 'TOP', 1000);
  const json = JSON.stringify(calibration.snapshot());
  for (const privateKey of ['sequenceLandmarks', 'angles', 'vector', 'camera', 'image']) assert.equal(json.includes(privateKey), false);
  calibration.reset(); assert.deepEqual(calibration.snapshot(), {stage: 'IDLE', reason: null, failedStage: null, topCaptured: false, bottomCaptured: false, calibrated: false});
});

test('calibration visibility can stay usable when the stricter scoring tracker is degraded', () => {
  const calibration = create(); calibration.start();
  hold(calibration, 'TOP', 0, value => {
    value.analysisUsable = false;
    value.trackingState = 'DEGRADED';
    value.calibrationUsable = true;
    for (const point of Object.values(value.sequenceLandmarks)) point.confidence = .55;
    return value;
  }, .5);
  assert.equal(calibration.snapshot().stage, 'CAPTURE_BOTTOM');
});

test('top setup guidance rejects bent arms, bad shoulder angle and broken shoulder-hip-ankle line', () => {
  const good = frame('TOP', 1000);
  const accepted = Calibration.evaluateFrame(good, .5, 'CAPTURE_TOP');
  assert.equal(accepted.allPass, true);
  assert.equal(accepted.checks.elbowExtension, true);
  assert.equal(accepted.checks.shoulderStack, true);
  assert.equal(accepted.checks.bodyLine, true);

  const bent = frame('BOTTOM', 1000);
  const bentTop = Calibration.evaluateFrame(bent, .5, 'CAPTURE_TOP');
  assert.equal(bentTop.checks.elbowExtension, false);

  const shoulder = frame('TOP', 1000);
  shoulder.sequenceLandmarks.elbow = {x:.2,y:.2,confidence:.95};
  shoulder.sequenceLandmarks.wrist = {x:.3,y:.3,confidence:.95};
  const shoulderEval = Calibration.evaluateFrame(shoulder, .5, 'CAPTURE_TOP');
  assert.equal(shoulderEval.checks.shoulderStack, false);

  const sag = frame('TOP', 1000);
  sag.sequenceLandmarks.hip.x = .22;
  const sagEval = Calibration.evaluateFrame(sag, .5, 'CAPTURE_TOP');
  assert.equal(sagEval.checks.bodyLine, false);
});

test('bottom guidance requires depth while preserving shoulder-hip-ankle alignment', () => {
  const bottom = Calibration.evaluateFrame(frame('BOTTOM', 1000), .5, 'CAPTURE_BOTTOM');
  assert.equal(bottom.allPass, true);
  const shallow = Calibration.evaluateFrame(frame('TOP', 1000), .5, 'CAPTURE_BOTTOM');
  assert.equal(shallow.checks.elbowDepth, false);
  const sag = frame('BOTTOM', 1000); sag.sequenceLandmarks.hip.x = .22;
  assert.equal(Calibration.evaluateFrame(sag, .5, 'CAPTURE_BOTTOM').checks.bodyLine, false);
});