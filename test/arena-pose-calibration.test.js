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
    classify(value, confidence) {time = value.timestamp; return calibration.classify(value, confidence);},
    manualCapture(value, confidence, requested) {time = value?.timestamp ?? time; return calibration.manualCapture(value, confidence, requested);}};
}
function hold(calibration, kind, start = 0, patch = value => value, confidence = .75) {
  for (let index = 0; index < 11; index++) calibration.observe(patch(frame(kind, start + index * 300, index % 2 ? .001 : 0)), confidence);
}
function quickHold(calibration, kind, start = 0, confidence = .4) {
  for (let index = 0; index < 6; index++) calibration.observe(frame(kind, start + index * 220, index % 2 ? .001 : 0), confidence);
}

test('captures stable personal TOP and BOTTOM geometry and confirms TOP return', () => {
  const stages = [], calibration = create({onChange: state => stages.push(state.stage)});
  calibration.start(); calibration.beginReadyCapture(); hold(calibration, 'TOP');
  assert.deepEqual(calibration.snapshot(), {stage: 'WAIT_BOTTOM_READY', reason: null, failedStage: null, topCaptured: true, bottomCaptured: false, calibrated: false});
  calibration.beginReadyCapture(); hold(calibration, 'BOTTOM', 3300);
  assert.deepEqual(calibration.snapshot(), {stage: 'WAIT_TOP_CONFIRM_READY', reason: null, failedStage: null, topCaptured: true, bottomCaptured: true, calibrated: false});
  calibration.beginReadyCapture(); hold(calibration, 'TOP', 6600);
  assert.equal(calibration.snapshot().calibrated, true);
  assert.deepEqual(stages, ['WAIT_TOP_READY','CAPTURE_TOP','WAIT_BOTTOM_READY','CAPTURE_BOTTOM','WAIT_TOP_CONFIRM_READY','CONFIRM_TOP','CALIBRATED']);
  assert.equal(calibration.classify(frame('TOP', 9900), .75), 'TOP');
  assert.equal(calibration.classify(frame('BOTTOM', 10000), .75), 'BOTTOM');
});

test('quick capture locks a valid pose in about one second instead of requiring a three-second plank hold', () => {
  const calibration = create(); calibration.start(); calibration.beginReadyCapture(); quickHold(calibration, 'TOP');
  assert.equal(Calibration.STABLE_MS, 700);
  assert.equal(calibration.snapshot().stage, 'WAIT_BOTTOM_READY');
});

test('timeout preserves already captured references and retry resumes the failed stage', () => {
  const calibration = create(); calibration.start(); calibration.beginReadyCapture(); quickHold(calibration, 'TOP');
  assert.equal(calibration.snapshot().topCaptured, true);
  calibration.invalidate('TIMEOUT');
  assert.deepEqual(calibration.snapshot(), {stage:'NEEDS_RETRY', reason:'TIMEOUT', failedStage:'WAIT_BOTTOM_READY', topCaptured:true, bottomCaptured:false, calibrated:false});
  assert.equal(calibration.retry(), true);
  assert.deepEqual(calibration.snapshot(), {stage:'WAIT_TOP_READY', reason:null, failedStage:null, topCaptured:false, bottomCaptured:false, calibrated:false});
});

test('does not capture an unchanged or unstable pose as BOTTOM before the fast attempt times out', () => {
  const calibration = create(); calibration.start(); calibration.beginReadyCapture(); quickHold(calibration, 'TOP');
  assert.equal(calibration.snapshot().stage, 'WAIT_BOTTOM_READY');
  for (let index = 0; index < 8; index++) calibration.observe(frame('TOP', 1400 + index * 200), .4);
  assert.equal(calibration.snapshot().stage, 'WAIT_BOTTOM_READY');
  assert.equal(calibration.snapshot().bottomCaptured, false);
  for (let index = 0; index < 8; index++) calibration.observe(frame(index % 2 ? 'TOP' : 'BOTTOM', 3000 + index * 200), .4);
  assert.equal(calibration.snapshot().stage, 'WAIT_BOTTOM_READY');
  assert.equal(calibration.snapshot().bottomCaptured, false);
});

test('rejects unusable frames and exposes no pose geometry in public state', () => {
  const calibration = create(); calibration.start(); calibration.beginReadyCapture();
  const unusable = frame('TOP', 0); unusable.sequenceLandmarks.elbow.confidence = .2;
  for (let index = 0; index < 10; index++) calibration.observe({...unusable, timestamp: index * 100}, .75);
  assert.equal(calibration.snapshot().topCaptured, false);
  hold(calibration, 'TOP', 1000);
  const json = JSON.stringify(calibration.snapshot());
  for (const privateKey of ['sequenceLandmarks', 'angles', 'vector', 'camera', 'image']) assert.equal(json.includes(privateKey), false);
  calibration.reset(); assert.deepEqual(calibration.snapshot(), {stage: 'IDLE', reason: null, failedStage: null, topCaptured: false, bottomCaptured: false, calibrated: false});
});

test('calibration visibility can stay usable when the stricter scoring tracker is degraded', () => {
  const calibration = create(); calibration.start(); calibration.beginReadyCapture();
  hold(calibration, 'TOP', 0, value => {
    value.analysisUsable = false;
    value.trackingState = 'DEGRADED';
    value.calibrationUsable = true;
    for (const point of Object.values(value.sequenceLandmarks)) point.confidence = .45;
    return value;
  }, .4);
  assert.equal(calibration.snapshot().stage, 'WAIT_BOTTOM_READY');
});

test('top setup guidance rejects bent arms, bad shoulder angle and broken shoulder-hip-ankle line', () => {
  const good = frame('TOP', 1000);
  const accepted = Calibration.evaluateFrame(good, .4, 'CAPTURE_TOP');
  assert.equal(accepted.allPass, true);
  assert.equal(accepted.checks.elbowExtension, true);
  assert.equal(accepted.checks.shoulderStack, true);
  assert.equal(accepted.checks.bodyLine, true);

  const bent = frame('BOTTOM', 1000);
  const bentTop = Calibration.evaluateFrame(bent, .4, 'CAPTURE_TOP');
  assert.equal(bentTop.checks.elbowExtension, false);

  const shoulder = frame('TOP', 1000);
  shoulder.sequenceLandmarks.elbow = {x:.2,y:.2,confidence:.95};
  shoulder.sequenceLandmarks.wrist = {x:.3,y:.3,confidence:.95};
  const shoulderEval = Calibration.evaluateFrame(shoulder, .4, 'CAPTURE_TOP');
  assert.equal(shoulderEval.checks.shoulderStack, false);

  const sag = frame('TOP', 1000);
  sag.sequenceLandmarks.hip.x = .22;
  const sagEval = Calibration.evaluateFrame(sag, .4, 'CAPTURE_TOP');
  assert.equal(sagEval.checks.bodyLine, false);
});

test('bottom guidance requires depth while preserving shoulder-hip-ankle alignment', () => {
  const bottom = Calibration.evaluateFrame(frame('BOTTOM', 1000), .4, 'CAPTURE_BOTTOM');
  assert.equal(bottom.allPass, true);
  const shallow = Calibration.evaluateFrame(frame('TOP', 1000), .4, 'CAPTURE_BOTTOM');
  assert.equal(shallow.checks.elbowDepth, false);
  const sag = frame('BOTTOM', 1000); sag.sequenceLandmarks.hip.x = .22;
  assert.equal(Calibration.evaluateFrame(sag, .4, 'CAPTURE_BOTTOM').checks.bodyLine, false);
});

test('manual voice capture can lock TOP and BOTTOM from a fresh five-joint frame without waiting for auto form acceptance', () => {
  const calibration = create(); calibration.start();
  const top = frame('TOP', 1000); top.calibrationUsable = false; top.analysisUsable = false; top.trackingState = 'DEGRADED';
  assert.deepEqual(calibration.manualCapture(top, .4, 'TOP'), {ok:true, captured:'TOP', stage:'WAIT_BOTTOM_READY'});
  const bottom = frame('BOTTOM', 1100); bottom.calibrationUsable = false; bottom.analysisUsable = false; bottom.trackingState = 'DEGRADED';
  assert.deepEqual(calibration.manualCapture(bottom, .4, 'BOTTOM'), {ok:true, captured:'BOTTOM', stage:'WAIT_TOP_CONFIRM_READY'});
  const confirm = frame('TOP', 1200); confirm.calibrationUsable = false; confirm.analysisUsable = false; confirm.trackingState = 'DEGRADED';
  assert.deepEqual(calibration.manualCapture(confirm, .4, 'TOP'), {ok:true, captured:'TOP_CONFIRM', stage:'CALIBRATED'});
  assert.equal(calibration.snapshot().calibrated, true);
});

test('manual capture fails closed when the current frame lacks the required side chain', () => {
  const calibration = create(); calibration.start();
  const bad = frame('TOP', 1000); bad.sequenceLandmarks.wrist = null;
  assert.deepEqual(calibration.manualCapture(bad, .4, 'TOP'), {ok:false, reason:'REQUIRED_JOINTS_MISSING'});
  assert.equal(calibration.snapshot().topCaptured, false);
});


test('calibration waits indefinitely for READY without starting a capture timeout', () => {
  const calibration = create();
  calibration.start();
  assert.equal(calibration.snapshot().stage, 'WAIT_TOP_READY');
  calibration.invalidate('TIMEOUT');
  assert.equal(calibration.snapshot().stage, 'NEEDS_RETRY');
});

test('successful capture returns to a READY gate before the next position', () => {
  const calibration = create();
  calibration.start();
  assert.equal(calibration.beginReadyCapture(), true);
  quickHold(calibration, 'TOP');
  assert.equal(calibration.snapshot().stage, 'WAIT_BOTTOM_READY');
  assert.equal(calibration.beginReadyCapture(), true);
  quickHold(calibration, 'BOTTOM', 2000);
  assert.equal(calibration.snapshot().stage, 'WAIT_TOP_CONFIRM_READY');
});
