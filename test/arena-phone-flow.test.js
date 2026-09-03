'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {create} = require('../public/arena-phone-flow');

function fixture() {
  let time = 0, id = 0, cameraStops = 0;
  const timers = new Map(), sent = [], marks = [];
  const setTimer = (fn, ms) => {timers.set(++id, {fn, at: time + ms}); return id;};
  const clearTimer = id => timers.delete(id);
  const flow = create({send: packet => sent.push(packet), mark: (...args) => marks.push(args), stopCamera: () => cameraStops++, setTimer, clearTimer,
    setRepeater(fn, ms) {const key = ++id; timers.set(key, {fn, at: time + ms, repeat: ms}); return key;}, clearRepeater: clearTimer});
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [key, timer] = next; time = timer.at;
      if (timer.repeat) timer.at += timer.repeat; else timers.delete(key);
      timer.fn();
    }
    time = end;
  }
  flow.connect('current-flow');
  let incoming = 0;
  const packet = data => ({type: 'POCKETPT_GODOT_BRIDGE', protocolVersion: 1, flowVersion: 1, requestId: 'current-flow', sequence: ++incoming, ...data});
  const capabilities = (overrides = {}) => flow.accept(packet({event: 'ARENA_FLOW_CAPABILITIES', capabilities: {contextLock: true, touchNavigation: true, matApproach: true, pushUpTransition: true, ...overrides}}));
  const reply = result => flow.accept(packet({event: 'ARENA_FLOW_EVENT', replyTo: sent.at(-1).sequence, result}));
  return {flow, sent, marks, advance, packet, capabilities, reply, timers, stops: () => cameraStops};
}

test('legacy READY cannot enable touch movement but permits an explicit camera check', () => {
  const f = fixture(); f.advance(3000);
  assert.equal(f.flow.snapshot().state, 'LEGACY');
  assert.equal(f.flow.approach(), false); assert.equal(f.flow.hold('MOVE_LEFT'), false);
  assert.equal(f.flow.setup(), true); assert.equal(f.flow.snapshot().previewOnly, true);
  assert.equal(f.flow.snapshot().state, 'CAMERA_SETUP');
  assert.equal(f.sent.some(x => x.action === 'GO_TO_MAT'), false);
});

test('capabilities require current nonce, exact version, sequence and context lock', () => {
  const f = fixture();
  for (const overrides of [{requestId: 'old'}, {flowVersion: 2}, {protocolVersion: '1'}, {sequence: Infinity}, {capabilities: {contextLock: false}}]) {
    assert.equal(f.flow.accept(f.packet({event: 'ARENA_FLOW_CAPABILITIES', capabilities: {contextLock: true, touchNavigation: true, matApproach: true, pushUpTransition: true}, ...overrides})), false);
  }
  assert.equal(f.capabilities(), true); assert.equal(f.flow.snapshot().canMove, true);
  assert.equal(f.capabilities(), false); // A later packet cannot renegotiate authority.
});

test('touch holds use bounded leases; release and keyboard nudge stop without another input', () => {
  const f = fixture(); f.capabilities();
  assert.equal(f.flow.hold('MOVE_LEFT'), true); assert.equal(f.flow.hold('MOVE_RIGHT'), false);
  f.advance(250); assert.equal(f.sent.filter(x => x.action === 'MOVE_LEFT').length, 3);
  assert.ok(f.sent.filter(x => x.action === 'MOVE_LEFT').every(x => x.validForMs === 300 && x.context === 'GYM_NAVIGATION'));
  f.flow.release(); const count = f.sent.length; f.advance(500); assert.equal(f.sent.length, count); assert.equal(f.sent.at(-1).action, 'STOP');
  assert.equal(f.flow.nudge('MOVE_RIGHT'), true); f.advance(201); assert.equal(f.sent.at(-1).action, 'STOP');
});

test('mat arrival is correlated to the pending command and cannot be inferred from sending it', () => {
  const f = fixture(); f.capabilities(); assert.equal(f.flow.approach(), true);
  const command = f.sent.at(-1);
  assert.equal(f.flow.snapshot().state, 'APPROACHING'); assert.equal(f.flow.hold('MOVE_LEFT'), false);
  assert.equal(f.flow.accept(f.packet({event: 'ARENA_FLOW_EVENT', result: 'AT_MAT', replyTo: command.sequence - 1})), false);
  assert.equal(f.flow.accept(f.packet({event: 'ARENA_FLOW_EVENT', result: 'AT_MAT', replyTo: command.sequence})), true);
  assert.equal(f.flow.snapshot().state, 'INTRO'); assert.equal(f.flow.snapshot().context, 'LOCKED');
});

test('cancelled or timed-out mat commands reject late arrival without starting setup', () => {
  for (const cancel of [f => f.flow.cancelApproach(), f => f.advance(20000)]) {
    const f = fixture(); f.capabilities(); f.flow.approach(); const command = f.sent.at(-1);
    cancel(f); assert.equal(f.flow.snapshot().state, 'GYM');
    assert.equal(f.flow.accept(f.packet({event: 'ARENA_FLOW_EVENT', result: 'AT_MAT', replyTo: command.sequence})), false);
  }
});

test('camera setup locks movement, uses visibility only, and never arms a countdown', () => {
  const f = fixture(); f.capabilities(); f.flow.approach(); f.reply('AT_MAT'); f.flow.setup();
  assert.equal(f.flow.snapshot().previewOnly, false); assert.equal(f.sent.at(-1).action, 'PUSH_UP_START');
  assert.equal(f.flow.calibration('CAPTURE_TOP'), true);
  assert.equal(f.flow.cameraStarting(), true); f.flow.cameraActive(); f.flow.visibility(true);
  assert.equal(f.flow.snapshot().state, 'CALIBRATING_TOP'); assert.equal(f.flow.hold('MOVE_FORWARD'), false);
  assert.equal(f.flow.approach(), false); assert.equal(f.flow.snapshot().context, 'CAMERA_SETUP');
  assert.equal(f.reply('AVATAR_DOWN'), true);
  f.flow.calibration('CAPTURE_BOTTOM'); assert.equal(f.flow.snapshot().state, 'CALIBRATING_BOTTOM');
  f.flow.calibration('CONFIRM_TOP'); assert.equal(f.flow.snapshot().state, 'CONFIRMING_TOP');
  f.flow.calibration('CALIBRATED'); assert.equal(f.flow.snapshot().state, 'CALIBRATED');
  f.advance(65000); assert.equal(f.flow.snapshot().state, 'CALIBRATED');
  assert.equal(f.marks.some(([id, status]) => ['START_POSITION', 'READY_GESTURE', 'REP_DETECTOR', 'TIMER', 'SCORE_PERSISTENCE'].includes(id) && status === 'PASS'), false);
  f.flow.visibility(false); assert.equal(f.flow.snapshot().state, 'CAMERA_POSITIONING');
});

test('personal pose calibration records gates but cannot mark official start or rep checks as passed', () => {
  const f = fixture(); f.capabilities(); f.flow.approach(); f.reply('AT_MAT'); f.flow.setup();
  f.flow.cameraStarting(); f.flow.cameraActive(); f.flow.visibility(true);
  for (const stage of ['CAPTURE_TOP', 'CAPTURE_BOTTOM', 'CONFIRM_TOP', 'CALIBRATED']) assert.equal(f.flow.calibration(stage), true);
  assert.ok(f.marks.some(([id, status]) => id === 'POSE_TOP_CALIBRATION' && status === 'PASS'));
  assert.ok(f.marks.some(([id, status]) => id === 'POSE_BOTTOM_CALIBRATION' && status === 'PASS'));
  assert.ok(f.marks.some(([id, status]) => id === 'POSE_CYCLE_CALIBRATION' && status === 'PASS'));
  assert.equal(f.marks.some(([id, status]) => ['START_POSITION', 'READY_GESTURE', 'REP_DETECTOR', 'TIMER'].includes(id) && status === 'PASS'), false);
  assert.equal(JSON.stringify(f.sent).includes('sequenceLandmarks'), false);
});

test('timeout identifies the acquisition phase and recovery cannot revive cleared references', () => {
  const f = fixture(); f.capabilities(); f.flow.approach(); f.reply('AT_MAT'); f.flow.setup();
  f.flow.cameraStarting(); f.flow.cameraActive(); f.flow.visibility(true);
  f.flow.calibration('CAPTURE_TOP'); f.flow.calibration('CAPTURE_BOTTOM');
  f.flow.calibration('NEEDS_RETRY', 'TIMEOUT', 'CAPTURE_BOTTOM');
  assert.equal(f.flow.snapshot().state, 'CALIBRATION_RETRY'); assert.equal(f.flow.snapshot().canRestartCalibration, true);
  assert.deepEqual(f.marks.filter(x => x[0] === 'POSE_BOTTOM_CALIBRATION').at(-1), ['POSE_BOTTOM_CALIBRATION', 'FAIL', 'CALIBRATION_TIMEOUT']);
  f.flow.visibility(false); f.flow.visibility(true); assert.equal(f.flow.snapshot().state, 'CALIBRATION_RETRY');
  assert.equal(f.flow.calibration('CALIBRATED'), false);
  f.flow.calibration('CAPTURE_TOP'); assert.equal(f.flow.snapshot().state, 'CALIBRATING_TOP');
  assert.equal(f.marks.filter(x => x[0] === 'POSE_TOP_CALIBRATION').at(-1)[1], 'RUNNING');
  assert.equal(f.marks.filter(x => x[0] === 'POSE_BOTTOM_CALIBRATION').at(-1)[1], 'WAITING');
});

test('return waits for standing even if the down animation was never acknowledged', () => {
  const f = fixture(); f.capabilities(); f.flow.approach(); f.reply('AT_MAT'); f.flow.setup();
  f.flow.returnToGym(); assert.equal(f.sent.at(-1).action, 'STAND_UP');
  assert.equal(f.flow.snapshot().state, 'RETURNING'); assert.equal(f.flow.hold('MOVE_RIGHT'), false);
  f.advance(20000); assert.equal(f.flow.snapshot().state, 'RETURN_BLOCKED');
  f.flow.returnToGym(); assert.equal(f.reply('AVATAR_STANDING'), true);
  assert.equal(f.flow.snapshot().state, 'GYM'); assert.equal(f.flow.snapshot().canMove, true);
});

test('backgrounding clears movement/camera and never automatically resumes navigation', () => {
  const f = fixture(); f.capabilities(); f.flow.hold('MOVE_BACKWARD'); const stops = f.stops();
  f.flow.suspend(); assert.ok(f.stops() > stops); assert.equal(f.flow.snapshot().context, 'LOCKED');
  assert.equal(f.flow.snapshot().state, 'SUSPENDED'); f.advance(10000);
  assert.equal(f.flow.hold('MOVE_FORWARD'), false); assert.equal(f.sent.at(-1).action, 'SET_CONTEXT');
  f.flow.returnToGym(); assert.equal(f.flow.snapshot().state, 'GYM');
});

test('generation replacement and exit discard old replies and clear all timers', () => {
  const f = fixture(); f.capabilities(); f.flow.approach(); const old = f.packet({event: 'ARENA_FLOW_EVENT', result: 'AT_MAT', replyTo: f.sent.at(-1).sequence});
  f.flow.connect('replacement-flow'); assert.equal(f.flow.accept(old), false);
  f.flow.close(); assert.equal(f.flow.accept(old), false); assert.equal(f.timers.size, 0);
  assert.equal(f.flow.setup(), false); assert.equal(f.flow.cameraStarting(), false);
});

test('late capabilities cannot pull a camera check back into gym navigation', () => {
  const f = fixture(); f.advance(3000); f.flow.setup(); f.flow.cameraStarting(); f.flow.cameraActive();
  f.capabilities(); assert.equal(f.flow.snapshot().state, 'CAMERA_POSITIONING');
  assert.equal(f.flow.snapshot().context, 'LOCKED'); assert.equal(f.flow.snapshot().canMove, false);
});

test('flow emits no camera data, identity, raw errors or challenge writes', () => {
  const f = fixture(); f.capabilities(); f.flow.setup(); f.flow.cameraStarting(); f.flow.cameraActive(); f.flow.visibility(true);
  const json = JSON.stringify(f.sent);
  for (const key of ['landmarks', 'keypoints', 'memberId', 'sessionId', 'token', 'authorization', 'REP_COMPLETED', 'COUNTDOWN']) assert.equal(json.includes(key), false);
});

test('in-world mat taps use the same command path and are rejected during camera setup', () => {
  const f = fixture(); f.capabilities();
  assert.equal(f.flow.accept(f.packet({event: 'ARENA_MAT_SELECTED'})), true);
  assert.equal(f.sent.at(-1).action, 'GO_TO_MAT'); f.reply('AT_MAT'); f.flow.setup();
  assert.equal(f.flow.accept(f.packet({event: 'ARENA_MAT_SELECTED'})), false);
});
