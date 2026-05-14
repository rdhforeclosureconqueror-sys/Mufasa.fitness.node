const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');

function createButton(id, disabled = false) {
  return {
    id,
    disabled,
    hidden: false,
    textContent: '',
    title: '',
    attributes: {},
    style: {},
    classList: { remove() {}, add() {} },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; if (name === 'disabled') this.disabled = false; },
    getAttribute(name) { return this.attributes[name] || null; },
    addEventListener() {},
    getBoundingClientRect() { return { width: 100, height: 40 }; }
  };
}

function createRuntimeHarness() {
  const elements = {
    connectBtn: createButton('connectBtn', true),
    startBtn: createButton('startBtn', true),
    fullscreenCameraBtn: createButton('fullscreenCameraBtn', true),
    ohsaBtn: createButton('ohsaBtn', true),
    dashboardBtn: createButton('dashboardBtn', true),
    exerciseLibraryBtn: createButton('exerciseLibraryBtn', true),
    runSystemDiagnosticBtn: createButton('runSystemDiagnosticBtn', true),
    retentionFlowStatus: { textContent: 'Retention Motivation Status: NOT_READY' },
    profileSummary: { textContent: 'Signed in as pilot@example.com' },
    poseStatus: { textContent: '', classList: { add() {}, remove() {} } },
    brainStatus: { textContent: '', classList: { add() {}, remove() {} } },
    featureActivationStatus: { textContent: '', classList: { add() {}, remove() {} } },
    video: {
      id: 'video', autoplay: false, playsInline: false, muted: false, srcObject: null,
      style: {}, readyState: 1, videoWidth: 640, videoHeight: 480, clientWidth: 640, clientHeight: 480,
      play: async () => undefined,
      addEventListener() {}, removeEventListener() {},
      getBoundingClientRect() { return { width: 640, height: 480 }; }
    },
    workoutHud: {},
    appActivationStatus: { textContent: '', classList: { add() {}, remove() {} } },
    appShell: { style: {}, hidden: false },
    authOverlay: { style: {}, hidden: false }
  };
  const listeners = {};
  let getUserMediaCalls = 0;
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Promise,
    Error,
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    location: { origin: 'https://app.example', href: 'https://app.example/' },
    localStorage: { getItem: () => null },
    APP_AUTH: { isAuthenticated: true },
    document: { getElementById: (id) => elements[id] || null, body: { classList: { toggle() {}, remove() {} } } },
    navigator: { mediaDevices: { getUserMedia: async (constraints) => { getUserMediaCalls += 1; return { constraints, getTracks: () => [] }; } } },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach((handler) => handler(event)); },
    updateActivationStatusPanel() {},
    setCanonicalAuthState() {},
    __collectDiagnosticReport: async () => ({ ok: true })
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['public/button-runtime.js', 'public/workout-runtime.js', 'public/app-runtime.js']) {
    vm.runInContext(fs.readFileSync(path.join(repoRoot, file), 'utf8'), context, { filename: file });
  }
  context.WorkoutRuntime.configureWorkoutRuntime({
    beforeConnectCamera() {},
    afterConnectCamera: async () => undefined,
    onCameraError() {}
  });
  context.ButtonRuntime.configurePrimaryButtonsAfterLogin({
    refs: {
      dashboardBtn: elements.dashboardBtn,
      exerciseLibraryBtn: elements.exerciseLibraryBtn,
      connectBtn: elements.connectBtn,
      runSystemDiagnosticBtn: elements.runSystemDiagnosticBtn
    },
    deps: { connectCamera: context.connectCamera, bootStatus: { lastBootError: 'none' } }
  });
  return { context, elements, getUserMediaCalls: () => getUserMediaCalls };
}

test('Connect Camera is enabled when authenticated even if retention is NOT_READY and calls getUserMedia on click', async () => {
  const { context, elements, getUserMediaCalls } = createRuntimeHarness();
  await context.__appRuntime.forceActivate('phase13-test');
  assert.equal(elements.connectBtn.disabled, false);
  assert.equal(elements.connectBtn.style.pointerEvents, 'auto');
  assert.equal(elements.connectBtn.getAttribute('aria-disabled'), 'false');
  await elements.connectBtn.onclick();
  assert.equal(getUserMediaCalls(), 1);
  assert.match(elements.featureActivationStatus.textContent, /camera getUserMedia called: yes/);
});

test('Dashboard, Exercise Library, and System Diagnostic are enabled for authenticated users', async () => {
  const { context, elements } = createRuntimeHarness();
  await context.__appRuntime.forceActivate('phase13-test');
  for (const id of ['dashboardBtn', 'exerciseLibraryBtn', 'runSystemDiagnosticBtn']) {
    assert.equal(elements[id].disabled, false, `${id} should be enabled`);
    assert.equal(elements[id].style.pointerEvents, 'auto', `${id} should accept pointer events`);
  }
  elements.dashboardBtn.onclick();
  assert.equal(context.location.href, '/dashboard.html');
  elements.exerciseLibraryBtn.onclick();
  assert.equal(context.location.href, '/exercise-library.html');
});

test('Start Workout explains missing setup instead of being silently disabled', async () => {
  const { context, elements } = createRuntimeHarness();
  await context.__appRuntime.forceActivate('phase13-test');
  assert.equal(elements.startBtn.getAttribute('data-blocked-reason'), 'Complete intake/goals or choose an exercise first.');
  context.__appRuntime.updateFeaturePanel('phase13-test');
  assert.match(elements.featureActivationStatus.textContent, /start workout blocked reason: Complete intake\/goals or choose an exercise first\./);
});

test('Overhead Squat Assessment and Expand Camera become enabled after camera connects', async () => {
  const { context, elements } = createRuntimeHarness();
  await context.__appRuntime.forceActivate('phase13-test');
  await elements.connectBtn.onclick();
  context.__appRuntime.applyAuthenticatedPilotButtonGates('after-camera');
  assert.equal(elements.fullscreenCameraBtn.disabled, false);
  assert.equal(elements.fullscreenCameraBtn.style.pointerEvents, 'auto');
  assert.equal(elements.ohsaBtn.disabled, false);
  assert.equal(elements.ohsaBtn.style.pointerEvents, 'auto');
});

test('stale toSafeUserId error is cleared after authenticated activation', async () => {
  const { context } = createRuntimeHarness();
  context.__lastAppError = "Can't find variable: toSafeUserId";
  await context.__appRuntime.forceActivate('phase13-test');
  assert.equal(context.__lastAppError, null);
});

test('camera error copy distinguishes unsupported, denied, and browser-blocked failures', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'public/index.html'), 'utf8');
  assert.match(index, /Camera unsupported in this browser or no camera device was found\./);
  assert.match(index, /Camera permission denied\. Allow camera access in the browser and try again\./);
  assert.match(index, /Browser blocked camera or another app is using it\./);
});
