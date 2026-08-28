const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const listeners = {};
  const context = { console, Date, URLSearchParams, performance: { now: () => 0 }, document: { hidden: false, getElementById: () => null }, setInterval() {}, addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, dispatchEvent(event) { (listeners[event.type] || []).forEach((fn) => fn(event)); }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } } };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/pose-runtime.js'), 'utf8'), context);
  return { api: context.PoseRuntime, context };
}
const raw = (score, x, y, name = 'nose') => ({ keypoints: [{ name, score, x, y }] });

test('high-confidence observations smooth instead of snapping and develop bounded velocity', () => {
  const { api } = load(); const tracker = api.createTemporalPoseTracker();
  tracker.update(raw(.9, 0, 0), 0, { width: 100, height: 100 });
  const result = tracker.update(raw(.9, 100, 0), 100, { width: 100, height: 100 });
  const point = result.keypoints[0];
  assert.ok(point.x > 0 && point.x < 100);
  assert.ok(tracker.joints.get('nose').velocityX > 0);
  assert.ok(tracker.joints.get('nose').velocityX <= 0.3);
});

test('short dropout coasts visibly, fades, and expires at the bounded coast duration', () => {
  const { api } = load(); const tracker = api.createTemporalPoseTracker();
  tracker.update(raw(.9, 10, 10), 0, { width: 100, height: 100 });
  const coast = tracker.update(raw(.1, 12, 10), 100, { width: 100, height: 100 }).keypoints[0];
  assert.equal(coast.mode, api.TRACK_MODES.COASTING); assert.ok(coast.opacity > 0); assert.equal(coast.displayOnly, true); assert.equal(coast.rawScore, .1);
  const lost = tracker.sample(api.TRACKING.MAX_COAST_MS + 1).keypoints[0];
  assert.equal(lost.mode, api.TRACK_MODES.LOST); assert.equal(lost.opacity, 0);
});

test('returning observation reacquires from prediction and converges to tracked mode', () => {
  const { api } = load(); const tracker = api.createTemporalPoseTracker();
  tracker.update(raw(.9, 10, 10), 0, { width: 100, height: 100 }); tracker.update(raw(.1, 10, 10), 50, { width: 100, height: 100 });
  const reacquired = tracker.update(raw(.9, 30, 10), 100, { width: 100, height: 100 }).keypoints[0];
  assert.equal(reacquired.mode, api.TRACK_MODES.REACQUIRING); assert.ok(reacquired.x < tracker.joints.get('nose').filteredX);
  assert.equal(tracker.sample(100 + api.TRACKING.REACQUIRE_MS).keypoints[0].mode, api.TRACK_MODES.TRACKED);
});

test('display predictions never alter authoritative visibility or emitted raw pose', async () => {
  const { api, context } = load(); const tracker = api.createTemporalPoseTracker();
  const names = ['nose','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'];
  const confident = { keypoints: names.map((name, i) => ({ name, score: .9, x: i, y: i })) };
  tracker.update(confident, 0, { width: 100, height: 100 });
  const low = { keypoints: names.map((name, i) => ({ name, score: .1, x: i, y: i })) };
  const display = tracker.update(low, 10, { width: 100, height: 100 });
  assert.ok(display.keypoints.every((point) => point.mode === api.TRACK_MODES.COASTING && point.displayOnly));
  const truth = api.classifyPose(low, { videoWidth: 100, videoHeight: 100 });
  assert.equal(truth.faceVisible, false); assert.equal(truth.headShouldersVisible, false); assert.equal(truth.partialUpperBodyVisible, false); assert.equal(truth.framingState, 'LOW_CONFIDENCE');

  let callback; let emitted;
  context.addEventListener('pose-runtime:frame', (event) => { emitted = event.detail.pose; });
  api.startPoseLoop({ detector: { estimatePoses: async () => [low] }, video: { id: 'video', isConnected: true, videoWidth: 100, videoHeight: 100 }, requestAnimationFrame(fn) { callback = fn; return 1; }, cancelAnimationFrame() {} });
  await callback();
  assert.equal(emitted, low); assert.ok(emitted.keypoints.every((point) => point.score === .1 && !point.displayOnly));
});

test('overlay display loop is distinct and cannot create another estimatePoses call', async () => {
  const { api, context } = load(); let inferFrame; let overlayFrame; let calls = 0;
  context.requestAnimationFrame = (fn) => { overlayFrame = fn; return 2; }; context.cancelAnimationFrame = () => {};
  api.startPoseLoop({ detector: { estimatePoses: async () => { calls++; return [raw(.9, 1, 1)]; } }, video: { id:'video', isConnected:true, videoWidth:100, videoHeight:100 }, requestAnimationFrame(fn) { inferFrame = fn; return 1; }, cancelAnimationFrame() {} });
  await inferFrame(); assert.equal(calls, 1); overlayFrame(16); assert.equal(calls, 1);
  assert.ok(api.getState().displayTrackerGeneration >= 1);
});

test('tracker resets on stop and detector configuration explicitly enables MoveNet smoothing', async () => {
  const { api } = load(); let callback; let config;
  const loop = api.startPoseLoop({ detector: { estimatePoses: async () => [raw(.9, 1, 1)] }, video: { id:'video', isConnected:true, videoWidth:100, videoHeight:100 }, requestAnimationFrame(fn) { callback = fn; return 1; }, cancelAnimationFrame() {} });
  await callback(); assert.equal(api.getState().displayTrackerGeneration, 1); loop.stop(); assert.equal(api.getState().displayTrackerGeneration, 0);
  const tf = { setBackend: async () => true, ready: async () => {}, getBackend: () => 'cpu', version: { tfjs: '4.14.0' } };
  const poseDetection = { SupportedModels: { MoveNet: 'MoveNet' }, movenet: { modelType: { SINGLEPOSE_LIGHTNING: 'lightning' } }, createDetector: async (_model, value) => { config = value; return {}; } };
  await api.initMoveNetDetector({ tf, poseDetection });
  assert.equal(config.modelType, 'lightning'); assert.equal(config.enableSmoothing, true); assert.equal(api.getState().movenetSmoothingConfigured, true);
});

test('camera generation, source change, disconnect, and detector reset paths clear display tracking', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/pose-runtime.js'), 'utf8');
  assert.match(source, /state\.cameraGeneration !== key \|\| state\.sourceVideo !== video\) displayTracker\.reset/);
  assert.match(source, /state\.sourceVideo && state\.sourceVideo !== video\) displayTracker\.reset/);
  assert.match(source, /disconnected\|source element\|camera/);
  assert.match(source, /state\.detectorReady = false;\s+displayTracker\.reset/);
});
