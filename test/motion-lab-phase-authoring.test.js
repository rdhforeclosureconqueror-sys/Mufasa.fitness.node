const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-phase-authoring.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');

function fakeButton() {
  return {
    dataset: {},
    disabled: false,
    listeners: {},
    cloneNode() { const clone = fakeButton(); clone.disabled = this.disabled; return clone; },
    replaceWith(next) { this.replacement = next; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
}

function truthGuard() {
  return {
    installCalls: 0,
    install() { this.installCalls += 1; return true; }
  };
}

test('phase authoring is loaded after Pose Editor and before adjusted preview persistence', () => {
  const editor = bootstrap.indexOf('motion-lab-pose-editor.js');
  const phase = bootstrap.indexOf('motion-lab-phase-authoring.js');
  const persistence = bootstrap.indexOf('motion-lab-adjusted-preview-persistence.js');
  assert.ok(editor >= 0);
  assert.ok(phase > editor);
  assert.ok(persistence > phase);
  assert.match(bootstrap, /phase_authoring_install/);
  assert.match(bootstrap, /motion_lab_phase_authoring_install_failed/);
});

test('exact phase sampler forces the selected action time to the requested phase timestamp', () => {
  const button = fakeButton();
  const select = { value: 'split_plant' };
  const status = { textContent: '', dataset: {} };
  let updateCalls = 0;
  const action = { enabled: false, paused: false, time: 0, play() { this.played = true; } };
  const mixer = { setTime() {}, update(delta) { assert.equal(delta, 0); updateCalls += 1; } };
  const session = {
    action, mixer,
    motionSpec: { durationSeconds: 10, phases: [{ id: 'split_plant', normalizedTime: 0.25 }] },
    avatar: { updateMatrixWorld() {} }, pause() {}
  };
  const editor = {
    getActiveSession() { return session; },
    samplePhase(id) { assert.equal(id, 'split_plant'); session.mixer.setTime(2.5); return { status: 'ready', phaseId: id, time: 2.5 }; }
  };
  const document = { getElementById(id) {
    if (id === 'poseEditorLoadPhase') return button.replacement || button;
    if (id === 'poseEditorPhase') return select;
    if (id === 'poseEditorStatus') return status;
    return null;
  } };
  const guard = truthGuard();
  const window = { PocketPTMotionLabPoseEditor: editor, PocketPTMotionLabPoseEditorPreviewGuard: guard };
  vm.runInNewContext(source, { window, document, Object, console });
  const api = window.PocketPTMotionLabPhaseAuthoring;
  assert.ok(api.install());
  const out = api.samplePhase('split_plant');
  assert.equal(out.status, 'ready');
  assert.equal(action.time, 2.5);
  assert.equal(action.paused, true);
  assert.ok(updateCalls >= 2);
  assert.equal(api.snapshot().phaseId, 'split_plant');
  assert.equal(api.snapshot().time, 2.5);
  assert.equal(guard.installCalls, 1);
});

test('replacement Load Phase button reinstalls the existing preview-truth guard before authoring', () => {
  const button = fakeButton();
  const guard = truthGuard();
  const document = { getElementById(id) { return id === 'poseEditorLoadPhase' ? (button.replacement || button) : null; } };
  const window = {
    PocketPTMotionLabPoseEditor: { samplePhase() {}, getActiveSession() { return null; } },
    PocketPTMotionLabPoseEditorPreviewGuard: guard
  };
  vm.runInNewContext(source, { window, document, Object, console });
  const api = window.PocketPTMotionLabPhaseAuthoring;
  assert.ok(api.install());
  assert.ok(button.replacement, 'old button should be replaced');
  assert.equal(button.replacement.dataset.exactPhaseAuthoring, 'true');
  assert.equal(guard.installCalls, 1, 'preview truth guard must be reattached to replacement button');
  assert.equal(typeof button.replacement.listeners.click, 'function');
});

test('phase authoring fails closed if replacement button cannot preserve preview truth', () => {
  const button = fakeButton();
  const document = { getElementById(id) { return id === 'poseEditorLoadPhase' ? (button.replacement || button) : null; } };
  const window = { PocketPTMotionLabPoseEditor: { samplePhase() {}, getActiveSession() { return null; } } };
  vm.runInNewContext(source, { window, document, Object, console });
  assert.equal(window.PocketPTMotionLabPhaseAuthoring.install(), null);
});
