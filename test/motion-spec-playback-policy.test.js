'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-playback-policy.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');

function loadPolicy() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.PocketPTMotionSpecPlaybackPolicy;
}

function runtimeDouble() {
  return {
    createMotionSession() {
      return {
        loop: true,
        loadMotionSpec() { return { status: 'ready' }; },
        setLoop(enabled) { this.loop = Boolean(enabled); return { status: 'ready', loop: this.loop }; }
      };
    }
  };
}

test('Motion Spec loop=false becomes authoritative for generated playback', () => {
  const policy = loadPolicy();
  const runtime = policy.install(runtimeDouble());
  const session = runtime.createMotionSession();
  const out = session.loadMotionSpec({ loop: false }, {});
  assert.equal(out.status, 'ready');
  assert.equal(session.loop, false);
  assert.equal(policy.snapshot().loopRequested, false);
  assert.equal(policy.snapshot().loopApplied, false);
});

test('missing Motion Spec loop preserves historical loop=true default', () => {
  const policy = loadPolicy();
  const runtime = policy.install(runtimeDouble());
  const session = runtime.createMotionSession();
  session.loadMotionSpec({}, {});
  assert.equal(session.loop, true);
});

test('playback policy installs after disposable session and before rest-pose/session wrappers', () => {
  const disposable = bootstrap.indexOf('/dev/motion-lab-assets/disposable-motion-session.js');
  const policy = bootstrap.indexOf('/dev/motion-lab-assets/motion-spec-playback-policy.js');
  const rest = bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-rest-pose-guard.js');
  assert.ok(disposable >= 0 && policy > disposable && rest > policy);
  assert.match(bootstrap, /motion_spec_playback_policy_install/);
  assert.match(bootstrap, /motion_spec_playback_policy_install_failed/);
});
