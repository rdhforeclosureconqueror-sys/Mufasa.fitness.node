'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function clearGlobals() {
  delete global.PocketPTPoseStability;
  delete global.__loadExternalScript;
  delete global.AvatarRuntime;
  delete global.__mirrorMotionDiagnostics;
}

function loadWithFakeStabilizer(processImpl) {
  clearGlobals();
  const modulePath = require.resolve('../public/mirror-motion-phase2.js');
  delete require.cache[modulePath];
  global.PocketPTPoseStability = {
    createPoseStabilizer() {
      return {
        process: processImpl,
        reset() {}
      };
    }
  };
  global.__avatarRuntimeStatus = {
    presentationAppliedMode: 'avatar_overlay',
    renderLoopState: 'RUNNING',
    retargetFramesExecuted: 1,
    bonesChangedLastFrame: 4
  };
  const api = require(modulePath);
  api.install();
  return api;
}

function fullPacket(overrides = {}) {
  const names = [
    'nose','left_eye','right_eye','left_ear','right_ear',
    'left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist',
    'left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'
  ];
  return {
    timestampMs: 100,
    keypoints: names.map((name, index) => ({ name, x: 100 + index, y: 200 + index, score: 0.95, stabilityState: 'smoothed' })),
    ...overrides
  };
}

test('avatar renderer receives stabilized packet while the raw packet remains separate', () => {
  const stabilized = fullPacket({ stabilizedMarker: true, stability: { frameStats: { accepted: 0, smoothed: 17, coasted: 0, clamped: 0, dropped: 0 } } });
  const phase2 = loadWithFakeStabilizer(() => stabilized);
  phase2.reset();
  let received = null;
  const wrapped = phase2.wrapRenderer((packet) => { received = packet; return 'rendered'; });
  const raw = fullPacket({ rawMarker: true });
  assert.equal(wrapped(raw), 'rendered');
  assert.equal(received, stabilized);
  assert.equal(raw.rawMarker, true);
  assert.equal(raw.stabilizedMarker, undefined);
  const diagnostics = phase2.diagnostics();
  assert.equal(diagnostics.rawFrames, 1);
  assert.equal(diagnostics.stabilizedFrames, 1);
});

test('first-failure diagnostics identify a dropped critical joint before downstream rendering', () => {
  const phase2 = loadWithFakeStabilizer(packet => packet);
  phase2.reset();
  phase2.wrapRenderer(() => true);
  const stabilized = fullPacket();
  stabilized.keypoints.find(point => point.name === 'left_knee').stabilityState = 'dropped';
  assert.equal(phase2.deriveFirstFailure(fullPacket(), stabilized, { renderLoopState: 'RUNNING', presentationAppliedMode: 'avatar_overlay' }), 'STABILIZATION_DROPPED:left_knee');
});

test('healthy stabilized packet reports no upstream failure when renderer is bound', () => {
  const phase2 = loadWithFakeStabilizer(packet => packet);
  phase2.reset();
  phase2.wrapRenderer(() => true);
  assert.equal(phase2.deriveFirstFailure(fullPacket(), fullPacket(), { renderLoopState: 'RUNNING', presentationAppliedMode: 'avatar_overlay' }), 'NONE');
});

test('renderer errors are surfaced as the retarget boundary and rethrown', () => {
  const stabilized = fullPacket({ stability: { frameStats: { accepted: 0, smoothed: 17, coasted: 0, clamped: 0, dropped: 0 } } });
  const phase2 = loadWithFakeStabilizer(() => stabilized);
  phase2.reset();
  const wrapped = phase2.wrapRenderer(() => { throw new Error('retarget exploded'); });
  assert.throws(() => wrapped(fullPacket()), /retarget exploded/);
  const diagnostics = phase2.diagnostics();
  assert.equal(diagnostics.firstFailingBoundary, 'RETARGET_RENDERER_ERROR');
  assert.equal(diagnostics.rendererErrors, 1);
});

test('concrete stabilizer load failure replaces transient loading status', async () => {
  clearGlobals();
  const modulePath = require.resolve('../public/mirror-motion-phase2.js');
  delete require.cache[modulePath];
  global.__avatarRuntimeStatus = { presentationAppliedMode: 'avatar_overlay', renderLoopState: 'RUNNING' };
  global.__loadExternalScript = () => Promise.reject(new Error('network down'));
  const phase2 = require(modulePath);
  phase2.install();
  await new Promise(resolve => setImmediate(resolve));
  const diagnostics = phase2.diagnostics();
  assert.equal(diagnostics.persistentFailure, 'STABILIZER_LOAD_FAILED');
  assert.equal(diagnostics.firstFailingBoundary, 'STABILIZER_LOAD_FAILED');
});

test('long frame gaps reset stabilizer history before accepting a new stream', () => {
  const phase2 = loadWithFakeStabilizer(packet => packet);
  phase2.reset();
  phase2.wrapRenderer(() => true);
  const originalNow = Date.now;
  try {
    let now = 1000;
    Date.now = () => now;
    phase2.processForAvatar(fullPacket({ timestampMs: 100 }));
    const before = phase2.diagnostics().trackerResets;
    now = 2000;
    phase2.processForAvatar(fullPacket({ timestampMs: 200 }));
    assert.ok(phase2.diagnostics().trackerResets > before);
  } finally {
    Date.now = originalNow;
  }
});

test('debug text includes the first failing boundary and pipeline counters', () => {
  const phase2 = loadWithFakeStabilizer(packet => packet);
  phase2.reset();
  const text = phase2.diagnosticsText();
  assert.match(text, /First failing boundary:/);
  assert.match(text, /Persistent failure:/);
  assert.match(text, /Raw \/ stabilized frames:/);
  assert.match(text, /Critical joint issue:/);
  assert.match(text, /Tracker resets:/);
});
