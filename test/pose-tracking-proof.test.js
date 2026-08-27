const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
  const listeners = {};
  const context = {
    console, URLSearchParams, Date, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    performance: { now: () => 10 }, location: { search: '' },
    document: { hidden: false, getElementById: () => null },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach(fn => fn(event)); },
    setInterval() {},
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/pose-runtime.js'), 'utf8'), context);
  return { api: context.PoseRuntime, context };
}
function kp(name, score, x, y) { return { name, score, x, y }; }
const upper = ['left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip'];
const lower = ['left_knee','right_knee','left_ankle','right_ankle'];
function pose(names, scale = 0.6, confidence = 0.9) {
  return { keypoints: names.map((name, i) => kp(name, confidence, 100 + (i % 3) * 100, 80 + (i / Math.max(1, names.length - 1)) * 480 * scale)) };
}
const video = { videoWidth: 640, videoHeight: 480 };

test('projects NO_PERSON, LOW_CONFIDENCE, UPPER_BODY_READY and FULL_BODY_READY from MoveNet keypoints', () => {
  const { api } = runtime();
  assert.equal(api.classifyPose(null, video).framingState, 'NO_PERSON');
  assert.equal(api.classifyPose(pose(upper, .6, .1), video).framingState, 'LOW_CONFIDENCE');
  assert.equal(api.classifyPose(pose(upper), video).framingState, 'UPPER_BODY_READY');
  assert.equal(api.classifyPose(pose([...upper, ...lower]), video).framingState, 'FULL_BODY_READY');
  assert.equal(api.KEYPOINT_THRESHOLD, 0.3);
});

test('projects TOO_CLOSE and TOO_FAR from normalized body coverage', () => {
  const { api } = runtime();
  const close = pose(upper); close.keypoints.forEach((p, i) => { p.y = i ? 470 : 1; });
  assert.equal(api.classifyPose(close, video).framingState, 'TOO_CLOSE');
  const far = pose(upper); far.keypoints.forEach((p, i) => { p.y = 200 + i * 2; });
  assert.equal(api.classifyPose(far, video).framingState, 'TOO_FAR');
});

test('pose loop rejects a zero-size source without invoking inference', async () => {
  const { api } = runtime(); let estimateCalls = 0; let callback;
  api.startPoseLoop({ detector: { estimatePoses: async () => { estimateCalls++; return []; } }, video: { id:'video', isConnected:true, videoWidth:0, videoHeight:0 }, requestAnimationFrame: fn => { callback = fn; return 1; }, cancelAnimationFrame() {} });
  await callback();
  const state = api.getState();
  assert.equal(estimateCalls, 0); assert.equal(state.framesFailed, 1); assert.match(state.lastError, /zero dimensions/);
});

test('real pose frames increment inference, success, dispatch and receive generations', async () => {
  const { api } = runtime(); let callback;
  const source = { id:'video', isConnected:true, videoWidth:640, videoHeight:480, srcObject:{active:true}, style:{} };
  api.startPoseLoop({ detector: { estimatePoses: async () => [pose(upper)] }, video: source, requestAnimationFrame: fn => { callback = fn; return 1; }, cancelAnimationFrame() {} });
  await callback();
  const state = api.getState();
  assert.equal(state.inferenceGeneration, 1); assert.equal(state.framesSuccessful, 1);
  assert.equal(state.poseEventDispatchCount, 1); assert.equal(state.poseEventReceivedCount, 1);
  assert.equal(state.framingState, 'UPPER_BODY_READY');
});

test('production wiring keeps capture inference active in Avatar Only and blocks Phase 2 bone writes', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/workout.html'), 'utf8');
  assert.match(html, /isRunning: \(\) => Boolean\(videoEl\?\.srcObject/);
  assert.match(html, /userVisibleVideoLayer: mode === "avatar_only" \? "HIDDEN" : "VISIBLE"/);
  assert.match(html, /__PHASE2_POSE_PROOF_ONLY__/);
  assert.match(html, /if \(window\.__PHASE2_POSE_PROOF_ONLY__\) \{ disposeLiveAvatarMirror\(\); return false; \}/);
  assert.match(fs.readFileSync(path.join(__dirname, '../public/pose-runtime.js'), 'utf8'), /Backend sync blocks pose inference: NO/);
});
