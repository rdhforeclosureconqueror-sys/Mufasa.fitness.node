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
function hold(calibration, kind, start = 0) {
  for (let index = 0; index < 8; index++) calibration.observe(frame(kind, start + index * 100, index % 2 ? .001 : 0), .75);
}

test('captures stable personal TOP and BOTTOM geometry and confirms TOP return', () => {
  const stages = [], calibration = create({onChange: state => stages.push(state.stage)});
  calibration.start(); hold(calibration, 'TOP');
  assert.deepEqual(calibration.snapshot(), {stage: 'CAPTURE_BOTTOM', reason: null, failedStage: null, topCaptured: true, bottomCaptured: false, calibrated: false});
  hold(calibration, 'BOTTOM', 800);
  assert.deepEqual(calibration.snapshot(), {stage: 'CONFIRM_TOP', reason: null, failedStage: null, topCaptured: true, bottomCaptured: true, calibrated: false});
  hold(calibration, 'TOP', 1600);
  assert.equal(calibration.snapshot().calibrated, true);
  assert.deepEqual(stages, ['CAPTURE_TOP', 'CAPTURE_BOTTOM', 'CONFIRM_TOP', 'CALIBRATED']);
  assert.equal(calibration.classify(frame('TOP', 2400), .75), 'TOP');
  assert.equal(calibration.classify(frame('BOTTOM', 2500), .75), 'BOTTOM');
});

test('does not capture an unchanged or unstable pose as BOTTOM', () => {
  const calibration = create(); calibration.start(); hold(calibration, 'TOP');
  hold(calibration, 'TOP', 800); assert.equal(calibration.snapshot().stage, 'CAPTURE_BOTTOM');
  for (let index = 0; index < 16; index++) calibration.observe(frame(index % 2 ? 'TOP' : 'BOTTOM', 1600 + index * 100), .75);
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
