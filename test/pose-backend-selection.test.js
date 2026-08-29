const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/pose-runtime.js'), 'utf8');

function load() {
  const context = { console, Date, performance: { now: (() => { let now = 0; return () => ++now; })() }, document: { getElementById: () => null }, setInterval() {}, addEventListener() {}, dispatchEvent() {}, CustomEvent: class {} };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return context.PoseRuntime;
}

function runtime({ webgl = true, webglSet = true, probeFails = false } = {}) {
  let active = 'cpu'; const calls = [];
  return {
    calls,
    findBackendFactory(name) { return name === 'cpu' || (name === 'webgl' && webgl); },
    async ready() { calls.push(`ready:${active}`); },
    async setBackend(name) { calls.push(`set:${name}`); if (name === 'webgl' && !webglSet) return false; active = name; return true; },
    getBackend() { return active; },
    scalar(value) { calls.push(`probe:${active}`); return { async data() { if (probeFails) throw new Error('probe exploded'); return [value]; }, dispose() { calls.push('dispose'); } }; },
    version: { tfjs: '4.14.0' }
  };
}

test('WebGL is selected, verified, and probed before detector creation', async () => {
  const api = load(); const tf = runtime(); let detectorBackend;
  const poseDetection = { SupportedModels: { MoveNet: 'MoveNet' }, movenet: { modelType: { SINGLEPOSE_LIGHTNING: 'lightning' } }, async createDetector() { tf.calls.push('detector'); detectorBackend = tf.getBackend(); return {}; } };
  await api.initMoveNetDetector({ tf, poseDetection });
  assert.equal(detectorBackend, 'webgl');
  assert.ok(tf.calls.indexOf('probe:webgl') < tf.calls.indexOf('detector'));
  assert.equal(api.getState().detectorBackend, 'webgl');
});

test('failed WebGL probe falls back to CPU and records the exact reason', async () => {
  const api = load(); const tf = runtime({ probeFails: true }); const trace = {};
  assert.equal(await api.selectInferenceBackend(tf, trace), 'cpu');
  assert.deepEqual(tf.calls.filter(call => call.startsWith('set:')), ['set:webgl', 'set:cpu']);
  assert.equal(trace.backendFallbackUsed, true);
  assert.match(trace.backendFallbackReason, /probe exploded/);
  assert.equal(trace.backendFinalActive, 'cpu');
});

test('unregistered WebGL uses the existing CPU fallback without attempting WebGL selection', async () => {
  const api = load(); const tf = runtime({ webgl: false }); const trace = {};
  await api.selectInferenceBackend(tf, trace);
  assert.deepEqual(tf.calls.filter(call => call.startsWith('set:')), ['set:cpu']);
  assert.equal(trace.backendPrimaryAvailable, false);
  assert.match(trace.backendFallbackReason, /not registered/);
});

test('production ownership remains singular and has no mobile blanket CPU forcing', () => {
  const workout = fs.readFileSync(path.join(root, 'public/workout.html'), 'utf8');
  const alternate = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(source, /mobileDevice\s*\?\s*['"]cpu/);
  for (const html of [workout, alternate]) {
    assert.equal((html.match(/pose-runtime\.js\?v=2026-08-29-ios-webgl-backend-v1/g) || []).length, 1);
    assert.doesNotMatch(html, /tf\.setBackend/);
    assert.match(html, /PoseRuntime\.initMoveNetDetector/);
  }
  assert.equal((source.match(/pose-runtime:frame', \{ detail: \{ pose, posePacket, poses \} \}/g) || []).length, 1);
  assert.doesNotMatch(source, /navigator\.mediaDevices\.getUserMedia\s*\(|createElement\(['"]video/);
});
