'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {create, visible, visibilityEvidence} = require('../public/arena-camera');
const {CameraController} = require('../public/push-up-challenge');
const frame = () => ({side:'left', analysisUsable: true, trackingState: 'LOCKED', sequenceLandmarks: Object.fromEntries(['shoulder', 'elbow', 'wrist', 'hip', 'ankle'].map(name => [name, {x: .5, y: .5, confidence: .9}]))});
const deferred = () => {let resolve, reject; const promise = new Promise((a, b) => {resolve = a; reject = b;}); return {promise, resolve, reject};};
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(getUserMedia) {
  let stopped = 0, starts = 0, captureStops = 0, id = 0, capture;
  const timers = new Map(), marks = [], visibility = [], poses = [], events = new Map();
  const track = {stop() {stopped++;}, getSettings: () => ({deviceId: 'private-camera-id', facingMode: 'user'}), addEventListener: (name, cb) => events.set(name, cb), removeEventListener: name => events.delete(name)};
  const stream = {getTracks: () => [track], getVideoTracks: () => [track]};
  const video = {style: {}, videoWidth: 640, videoHeight: 480, readyState: 2, srcObject: null, play: async () => {}};
  const root = {
    navigator: {mediaDevices: {getUserMedia: getUserMedia || (async () => stream), enumerateDevices: async () => [{kind: 'videoinput', deviceId: 'private-camera-id', label: 'Private camera label'}]}},
    isSecureContext: true,
    setTimeout(fn, delay) {timers.set(++id, {fn, delay}); return id;}, clearTimeout: id => timers.delete(id),
    __loadExternalScript: async () => {}, __ensurePoseRuntime: async () => {},
    PoseRuntime: {initMoveNetDetector: async () => ({})},
    PushUpChallenge: {CameraController, getPushUpProfile: () => ({poseAnalysis: {rules: [{minimumLandmarkConfidence: .75}]}}),
      PoseCaptureEngine: class {constructor(options) {capture = this; this.options = options;} async start() {starts++;} stop() {captureStops++;} resetTracking() {}}
    }
  };
  const camera = create({root, video, onVisibility: v => visibility.push(v), onPose: (...value) => poses.push(value), onStatus: (...args) => marks.push(args)});
  return {camera, root, stream, video, timers, marks, visibility, poses, events, stats: () => ({stopped, starts, captureStops}), capture: () => capture};
}

test('calibration visibility checks required joints without borrowing the stricter scoring lock', () => {
  assert.equal(visible(frame(), .5), true);
  const degraded = frame(); degraded.analysisUsable = false; degraded.trackingState = 'DEGRADED';
  for (const point of Object.values(degraded.sequenceLandmarks)) point.confidence = .55;
  assert.equal(visible(degraded, .5), true);
  for (const patch of [{cached: true}, {displayOnly: true}, {confidence: NaN}, {confidence: .2}, {x: Infinity}, {x: 0}, {y: 1.1}]) {
    const f = frame(); Object.assign(f.sequenceLandmarks.elbow, patch); assert.equal(visible(f, .5), false);
  }
  const missing = frame(); delete missing.sequenceLandmarks.wrist; assert.equal(visible(missing, .5), false);
  const noSide = frame(); delete noSide.side; assert.equal(visible(noSide, .5), false);
  assert.equal(visible(frame(), NaN), false);
});

test('camera does not request permission until explicit start and reuses canonical controller', async () => {
  const f = fixture(); assert.equal(f.video.srcObject, null); assert.equal(f.stats().starts, 0);
  await f.camera.start(); assert.equal(f.video.srcObject, f.stream); assert.equal(f.stats().starts, 1);
  assert.equal(f.video.muted, true); assert.equal(f.video.playsInline, true);
  f.capture().options.onFrame(frame()); assert.equal(f.visibility.at(-1), true);
  assert.equal(f.poses.at(-1)[0].trackingState, 'LOCKED'); assert.equal(f.poses.at(-1)[1], .4);
  assert.equal(f.poses.at(-1)[0].sourceWidth, 640); assert.equal(f.poses.at(-1)[0].sourceHeight, 480);
  assert.equal(f.poses.at(-1)[0].calibrationUsable, true);
  [...f.timers.values()].find(timer => timer.delay === 1500).fn(); assert.equal(f.visibility.at(-1), false); assert.equal(f.poses.at(-1)[0], null);
  f.camera.stop(); assert.equal(f.video.srcObject, null); assert.equal(f.stats().captureStops, 1); assert.equal(f.timers.size, 0);
});

test('low-confidence required joint stays visible to the overlay instead of erasing the pose packet', async () => {
  const f = fixture(); await f.camera.start();
  const weak = frame(); weak.analysisUsable = false; weak.trackingState = 'DEGRADED'; weak.sequenceLandmarks.ankle.confidence = .3;
  const packet = {video:{width:640,height:480},keypoints:[{name:'left_ankle',x:300,y:400,score:.3}]};
  f.capture().options.onFrame(weak, {posePacket:packet});
  assert.equal(f.visibility.at(-1), false);
  assert.ok(f.poses.at(-1)[0]);
  assert.equal(f.poses.at(-1)[0].calibrationUsable, false);
  assert.equal(f.poses.at(-1)[2], packet);
});

test('camera replacement ignores old callbacks and supplies the new source geometry', async () => {
  const f = fixture(); await f.camera.start(); const old = f.capture().options.onFrame;
  await f.camera.start(); f.video.videoWidth = 480; f.video.videoHeight = 640;
  const count = f.poses.length; old(frame()); assert.equal(f.poses.length, count);
  f.capture().options.onFrame(frame());
  assert.equal(f.poses.at(-1)[0].sourceWidth, 480); assert.equal(f.poses.at(-1)[0].sourceHeight, 640);
  f.camera.stop(); const stopped = f.poses.length; f.capture().options.onFrame(frame()); assert.equal(f.poses.length, stopped);
});

test('permission granted after cancellation stops the late stream without mounting or inference', async () => {
  const grant = deferred(), f = fixture(() => grant.promise);
  const start = f.camera.start(); const rejected = assert.rejects(start, {name: 'AbortError'});
  f.camera.stop(); await rejected; grant.resolve(f.stream); await flush();
  assert.equal(f.stats().stopped, 1); assert.equal(f.stats().starts, 0); assert.equal(f.video.srcObject, null);
});

test('denied permission preserves a safe failure without raw browser error or device details', async () => {
  const f = fixture(async () => {throw Object.assign(new Error('secret-token private-device'), {name: 'NotAllowedError'});});
  await assert.rejects(f.camera.start(), {name: 'AbortError'});
  assert.ok(f.marks.some(x => x[0] === 'CAMERA_PERMISSION' && x[1] === 'FAIL' && x[2] === 'CAMERA_DENIED'));
  assert.equal(JSON.stringify(f.marks).includes('secret-token'), false); assert.equal(f.video.srcObject, null);
});

test('ignored permission prompt times out and a later grant cannot restart capture', async () => {
  const grant = deferred(), f = fixture(() => grant.promise);
  const rejected = assert.rejects(f.camera.start(), {name: 'AbortError'});
  [...f.timers.values()].find(timer => timer.delay === 30000).fn(); await rejected;
  grant.resolve(f.stream); await flush(); assert.equal(f.stats().starts, 0); assert.equal(f.video.srcObject, null);
  assert.ok(f.marks.some(x => x[2] === 'CAMERA_START_TIMEOUT'));
});

test('cancel during model initialization stops camera and cannot start a late inference loop', async () => {
  const model = deferred(), f = fixture(); f.root.PoseRuntime.initMoveNetDetector = () => model.promise;
  const rejected = assert.rejects(f.camera.start(), {name: 'AbortError'}); await flush();
  f.camera.stop(); await rejected; model.resolve({}); await flush(); assert.equal(f.stats().starts, 0); assert.equal(f.video.srcObject, null);
});

test('an ended camera stops the canonical capture loop and clears visibility', async () => {
  const f = fixture(); await f.camera.start(); f.capture().options.onFrame(frame());
  f.events.get('ended')(); assert.equal(f.video.srcObject, null); assert.equal(f.visibility.at(-1), false);
  assert.equal(f.stats().captureStops, 1); assert.ok(f.marks.some(x => x[2] === 'CAMERA_ENDED'));
});

test('a superseded camera request cannot clear or replace the newer stream', async () => {
  const old = deferred(), f = fixture(); let attempts = 0;
  f.root.navigator.mediaDevices.getUserMedia = () => ++attempts === 1 ? old.promise : Promise.resolve(f.stream);
  const rejected = assert.rejects(f.camera.start(), {name: 'AbortError'});
  await f.camera.start(); await rejected;
  let oldStopped = 0; old.resolve({getTracks: () => [{stop: () => oldStopped++}]}); await flush();
  assert.equal(oldStopped, 1); assert.equal(f.video.srcObject, f.stream); assert.equal(f.stats().starts, 1); f.camera.stop();
});

test('video and model failures identify the actual first failing boundary', async () => {
  for (const expected of ['CAMERA_STREAM', 'BODY_DETECTOR']) {
    const f = fixture();
    if (expected === 'CAMERA_STREAM') f.video.play = async () => {throw new Error('private playback detail');};
    else f.root.PoseRuntime.initMoveNetDetector = async () => {throw new Error('private model detail');};
    await assert.rejects(f.camera.start());
    assert.deepEqual(f.marks.filter(x => x[1] === 'FAIL').map(x => x[0]), [expected]);
    assert.equal(f.video.srcObject, null); assert.equal(JSON.stringify(f.marks).includes('private'), false);
  }
});

test('camera switching reuses one canonical detector and session exit disposes it', async () => {
  const f = fixture(); let initialized = 0, disposed = 0;
  f.root.PoseRuntime.initMoveNetDetector = async () => {initialized++; return {dispose: () => disposed++};};
  await f.camera.start(); await f.camera.start('private-camera-id');
  assert.equal(initialized, 1); assert.equal(f.stats().starts, 2);
  f.camera.dispose(); await flush(); assert.equal(disposed, 1); assert.equal(f.video.srcObject, null);
});

test('session exit disposes a detector that finishes loading after cancellation', async () => {
  const f = fixture(), model = deferred(); let disposed = 0;
  f.root.PoseRuntime.initMoveNetDetector = () => model.promise;
  const rejected = assert.rejects(f.camera.start()); await flush();
  f.camera.dispose(); await rejected; model.resolve({dispose: () => disposed++}); await flush();
  assert.equal(disposed, 1); assert.equal(f.stats().starts, 0);
});

test('visibility evidence reports the exact unusable side-chain joint and confidence', () => {
  const weak = frame();
  weak.sequenceLandmarks.wrist.confidence = .23;
  const evidence = visibilityEvidence(weak, .4);
  assert.equal(evidence.visible, false);
  assert.equal(evidence.side, weak.side);
  assert.deepEqual(evidence.missing, ['wrist']);
  assert.equal(evidence.joints.wrist.confidence, .23);
  assert.equal(evidence.joints.wrist.usable, false);
  assert.equal(evidence.joints.shoulder.usable, true);
});
