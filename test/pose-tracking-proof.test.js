const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime(options = {}) {
  const listeners = {};
  const context = {
    console, URLSearchParams, Date, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    performance: { now: () => 10 }, location: { search: '' },
    document: options.document || { hidden: false, getElementById: () => null },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach(fn => fn(event)); },
    setInterval() {}, Date: options.Date || Date,
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

test('recognizes close-range head and shoulders without weakening workout readiness', () => {
  const { api } = runtime();
  const result = api.classifyPose(pose(['nose', 'left_shoulder', 'right_shoulder']), video);
  assert.equal(result.headShouldersVisible, true);
  assert.equal(result.partialUpperBodyVisible, true);
  assert.equal(result.framingState, 'LOW_CONFIDENCE');
});

test('face-only observation is FACE_VISIBLE and not partial upper body', () => {
  const { api } = runtime();
  const result = api.classifyPose(pose(['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear']), video);
  assert.equal(result.faceVisible, true);
  assert.equal(result.headShouldersVisible, false);
  assert.equal(result.partialUpperBodyVisible, false);
  assert.equal(result.framingState, 'LOW_CONFIDENCE');
});

test('nose and both shoulders at threshold are HEAD_SHOULDERS_VISIBLE', () => {
  const { api } = runtime();
  const result = api.classifyPose(pose(['nose', 'left_shoulder', 'right_shoulder'], .6, .3), video);
  assert.equal(result.headShouldersVisible, true);
  assert.equal(result.framingState, 'LOW_CONFIDENCE');
});

test('a torso or limb joint is partial upper body without changing readiness thresholds', () => {
  const { api } = runtime();
  const result = api.classifyPose(pose(['left_elbow']), video);
  assert.equal(result.partialUpperBodyVisible, true);
  assert.equal(result.headShouldersVisible, false);
  assert.equal(result.framingState, 'LOW_CONFIDENCE');
  assert.equal(api.classifyPose(pose(upper), video).framingState, 'UPPER_BODY_READY');
  assert.equal(api.classifyPose(pose([...upper, ...lower]), video).framingState, 'FULL_BODY_READY');
});

test('enabled CoachRuntime receives pose speech only on semantic transitions', async () => {
  const { api, context } = runtime(); let callback; const spoken = [];
  context.CoachRuntime = {
    getState: () => ({ muted: false, audioUnlocked: true }),
    stopAllSpeech() {},
    speak: async (message, source) => { spoken.push({ message, source }); return { ok: true }; }
  };
  const source = { id: 'video', isConnected: true, videoWidth: 640, videoHeight: 480, getBoundingClientRect: () => ({ width: 640, height: 480 }) };
  api.startPoseLoop({ detector: { estimatePoses: async () => [pose(['nose', 'left_eye'])] }, video: source, requestAnimationFrame: fn => { callback = fn; return 1; }, cancelAnimationFrame() {} });
  await callback();
  assert.equal(api.getState().voiceFeedbackEnabled, true);
  assert.equal(api.getState().speechCount, 1);
  assert.equal(api.getState().speechSuppressedReason, 'NONE');
  assert.deepEqual(spoken.map(({ message }) => message), ['I can see your face.']);
  await callback();
  assert.equal(api.getState().speechCount, 1);
  assert.equal(api.getState().speechSuppressedReason, 'STATE_UNCHANGED');
});

test('object-fit cover transform inverts inference flip and includes centered crop', () => {
  const { api } = runtime();
  const transform = api.createSourceToDisplayTransform(480, 640, 400, 300, true);
  assert.equal(transform.scale, 400 / 480);
  assert.equal(transform.offsetX, 0);
  assert.ok(transform.offsetY < 0);
  const projected = transform.project({ x: 480, y: 320 });
  assert.equal(projected.x, 0); assert.equal(projected.y, 150);
});

test('overlay progressively draws only confident points and valid segments', () => {
  const { api } = runtime();
  const calls = { arcs: 0, lines: 0 };
  const ctx = { setTransform(){}, clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){ calls.lines++; }, stroke(){}, arc(){ calls.arcs++; }, fill(){} };
  const canvas = { isConnected: true, width: 0, height: 0, getContext: () => ctx };
  const source = { videoWidth: 480, videoHeight: 640, getBoundingClientRect: () => ({ width: 400, height: 300, left: 0, top: 0 }) };
  const closeup = { keypoints: Array.from({ length: 17 }, (_, i) => kp(['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder'][i] || `p${i}`, [0,5,6].includes(i) ? .9 : .1, 100 + i, 100 + i)) };
  assert.equal(api.renderPoseOverlay(closeup, source, canvas), true);
  assert.equal(calls.arcs, 3);
  assert.equal(calls.lines, 1);
  assert.equal(api.getState().overlayFirstFailingBoundary, 'APPLIED');
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

test('live performance mode throttles proof DOM only, preserves internal events, and restores normal rendering', () => {
  let now = 1000;
  class ClockDate extends Date { static now() { return now; } }
  const writes = { tracking: 0, performance: 0 };
  const panel = name => ({ set textContent(_value) { writes[name]++; }, get textContent() { return ''; } });
  const panels = { poseTrackingProofValues: panel('tracking'), posePerformanceProofValues: panel('performance') };
  const document = { hidden: false, getElementById: id => panels[id] || null };
  const { api, context } = runtime({ document, Date: ClockDate });
  api.setLivePerformanceMode(true);
  writes.tracking = writes.performance = 0;
  now += 100; api.renderProof(); api.renderProof();
  assert.deepEqual(writes, { tracking: 0, performance: 0 });
  context.dispatchEvent(new context.CustomEvent('pose-runtime:frame', { detail: {} }));
  assert.equal(api.getState().poseEventReceivedCount, 1, 'internal event state advances while UI is throttled');
  now += 400; api.renderProof();
  assert.deepEqual(writes, { tracking: 1, performance: 1 }, 'visible proof renders at the 2 Hz boundary');
  const active = api.getState();
  assert.deepEqual([...active.pausedSubsystems], ['guided-experience overlay']);
  assert.deepEqual([...active.throttledSubsystems], ['pose proof diagnostic DOM']);
  assert.deepEqual([...active.completedSubsystems], ['mobile-layout-containment proof']);
  now += 1; api.setLivePerformanceMode(false);
  assert.deepEqual(writes, { tracking: 2, performance: 2 }, 'inactive mode restores immediate proof rendering');
  assert.equal(api.getState().livePerformanceMode, 'INACTIVE');
});
