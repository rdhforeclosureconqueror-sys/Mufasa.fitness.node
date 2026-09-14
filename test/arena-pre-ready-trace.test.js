'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'arena-pre-ready-trace.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'arena-push-up.html'), 'utf8');

test('pre-READY trace is isolated from the proven arena launcher', () => {
  assert.match(html, /arena-pre-ready-trace\.js\?v=20260914-pre-ready-v1[\s\S]*arena-push-up\.js\?v=20260903-arena-diagnostics-v1/);
  assert.doesNotMatch(source, /GODOT_HANDSHAKE/);
  assert.doesNotMatch(source, /phone\?\.connect|PocketPTArenaPhoneUI/);
});

test('trace accepts only protocol-v1 messages from the exact arena iframe', () => {
  const listeners = new Map();
  const frameWindow = {};
  let trace = null;
  const board = {
    querySelector(selector) { return selector === '#godotPreReadyStage' ? trace : null; },
    prepend(node) { trace = node; }
  };
  const document = {
    readyState: 'complete',
    getElementById(id) { if (id === 'game') return {contentWindow: frameWindow}; if (id === 'bridgeDebugBoard') return board; return null; },
    createElement() { return {id: '', style: {}, dataset: {}, textContent: ''}; }
  };
  class Observer { constructor(callback) { this.callback = callback; } observe() {} }
  const context = {
    document,
    location: {origin: 'https://arena.example'},
    MutationObserver: Observer,
    addEventListener(name, callback) { listeners.set(name, callback); },
    console
  };
  context.window = context;
  vm.runInNewContext(source, context);
  const message = listeners.get('message');
  assert.equal(typeof message, 'function');

  const valid = {type: 'POCKETPT_GODOT_BRIDGE', event: 'STARTUP_STAGE', protocolVersion: 1, stage: 'CLIENT_INITIALIZE_QUEUED', status: 'PASS'};
  message({source: {}, origin: context.location.origin, data: valid});
  assert.equal(trace, null, 'another same-origin window cannot write the trace');
  message({source: frameWindow, origin: 'https://evil.example', data: valid});
  assert.equal(trace, null, 'wrong origin cannot write the trace');
  message({source: frameWindow, origin: context.location.origin, data: {...valid, stage: '<script>private</script>'}});
  assert.equal(trace, null, 'arbitrary stage text is rejected');
  message({source: frameWindow, origin: context.location.origin, data: valid});
  assert.equal(trace.textContent, 'PRE-READY GODOT STAGE: CLIENT_INITIALIZE_QUEUED · PASS');
  assert.equal(trace.dataset.stage, 'CLIENT_INITIALIZE_QUEUED');
});

test('READY may update the trace but cannot be converted into control authority here', () => {
  assert.match(source, /data\.event === 'READY'/);
  assert.match(source, /lastStage = 'READY_SENT'/);
  assert.match(source, /trace\.textContent/);
  assert.doesNotMatch(source, /postMessage\(|createArenaSession|CONTROL_INTENT/);
});
