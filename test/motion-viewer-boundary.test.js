"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Boundary = require("../public/motion/motion-viewer-boundary");

function view() {
  return { states: [], show(status, actions = {}) { this.states.push(status); this.actions = actions; }, viewerRoot() { return {}; } };
}

function session({ mount = async () => ({ status: "ready" }), dispose = () => {} } = {}) {
  return { mount, dispose };
}

function setup(loadViewer, options = {}) {
  const rendered = view();
  const boundary = Boundary.create({ descriptor: { exerciseId: "bodyweight_squat" }, enabled: options.enabled !== false, view: rendered, loadViewer, timeoutMs: options.timeoutMs ?? 30, onDiagnostic: options.onDiagnostic });
  boundary.mount();
  return { boundary, rendered };
}

const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

test("scenario A: disabled does not load and core-owned exercise content remains independent", async () => {
  let loads = 0;
  const { boundary, rendered } = setup(async () => { loads++; }, { enabled: false });
  await boundary.retry();
  assert.equal(loads, 0);
  assert.equal(boundary.getStatus(), "disabled");
  assert.deepEqual(rendered.states, ["disabled"]);
});

test("scenario B: successful load reaches ready without global state", async () => {
  const before = Object.keys(globalThis);
  const { boundary, rendered } = setup(async () => ({ createSession: () => session() }));
  await boundary.retry();
  assert.equal(boundary.getStatus(), "ready");
  assert.deepEqual(rendered.states, ["idle", "loading", "ready"]);
  assert.deepEqual(Object.keys(globalThis), before);
  boundary.unmount();
});

for (const [name, loader] of [
  ["scenario C: import rejection", async () => { throw new Error("import rejected"); }],
  ["scenario D: initialization throw", async () => ({ createSession() { throw new Error("init failed"); } })],
  ["malformed implementation status", async () => ({ createSession: () => session({ mount: async () => ({ status: "surprise" }) }) })]
]) test(name + " is locally contained", async () => {
  const { boundary, rendered } = setup(loader);
  await boundary.retry();
  assert.equal(boundary.getStatus(), "failed");
  assert.equal(rendered.states.at(-1), "failed");
  assert.equal(typeof rendered.actions.retry, "function");
  boundary.unmount();
});

test("scenario E: never-resolving load has a bounded local timeout", async () => {
  const { boundary, rendered } = setup(() => new Promise(() => {}), { timeoutMs: 5 });
  boundary.retry();
  await tick(15);
  assert.equal(boundary.getStatus(), "timed_out");
  assert.equal(rendered.states.at(-1), "timed_out");
  boundary.unmount();
});

test("scenario F: post-ready runtime failure is contained", async () => {
  let runtimeError;
  const { boundary, rendered } = setup(async () => ({ createSession(options) { runtimeError = options.onError; return session(); } }));
  await boundary.retry();
  runtimeError(new Error("render failed"));
  assert.equal(boundary.getStatus(), "failed");
  assert.equal(rendered.states.at(-1), "failed");
  boundary.unmount();
});

test("scenario G: unmount aborts and ignores a late load", async () => {
  let resolveLoad, signal, disposed = 0;
  const { boundary, rendered } = setup(({ signal: supplied }) => { signal = supplied; return new Promise(resolve => { resolveLoad = resolve; }); });
  const attempt = boundary.retry();
  boundary.unmount();
  assert.equal(signal.aborted, true);
  resolveLoad({ createSession: () => session({ dispose: () => disposed++ }) });
  await attempt;
  assert.equal(disposed, 0);
  assert.equal(rendered.states.at(-1), "loading");
});

test("scenario H: repeated lifecycle disposes each session and leaves no timeout alive", async () => {
  let disposed = 0;
  const { boundary } = setup(async () => ({ createSession: () => session({ dispose: () => disposed++ }) }));
  for (let index = 0; index < 5; index++) { await boundary.retry(); boundary.unmount(); boundary.mount(); }
  boundary.unmount();
  assert.equal(disposed, 5);
  await tick(40);
  assert.notEqual(boundary.getStatus(), "timed_out");
});

test("retry starts a fresh load attempt rather than reusing a rejected promise", async () => {
  let attempts = 0;
  const { boundary } = setup(async () => { attempts++; if (attempts === 1) throw new Error("first"); return { createSession: () => session() }; });
  await boundary.retry();
  await boundary.retry();
  assert.equal(attempts, 2);
  assert.equal(boundary.getStatus(), "ready");
  boundary.unmount();
});

test("core boot paths cannot acquire static dependencies on motion implementation", () => {
  const root = path.resolve(__dirname, "..");
  const protectedPaths = ["server.js", "public/boot-core.js", "public/auth-navigation.js", "public/dashboard-runtime.js", "public/workout-runtime.js", "public/app-runtime.js"];
  for (const relative of protectedPaths) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert.doesNotMatch(source, /(?:require\s*\(|from\s+|<script[^>]+src=)[^\n]*(?:motion-viewer(?:\.js)?|shared3d-loader|disposable-motion-session|avatar-runtime|motion-engine|three)/i, `${relative} must not import a viewer implementation`);
  }
  const libraryHtml = fs.readFileSync(path.join(root, "exercise-library.html"), "utf8");
  assert.doesNotMatch(libraryHtml, /<script[^>]+(?:motion-viewer\.js|shared3d-loader|disposable-motion-session|three)/i, "optional implementation must not be eager-loaded");
});

test("exercise library keeps images, instructions, workout navigation, and local motion fallback ownership", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../exercise-library.js"), "utf8");
  assert.match(source, /card\.appendChild\(img\)/);
  assert.match(source, /firstInstructionLines\(ex\)/);
  assert.match(source, /window\.location\.href = "\/index\.html#today-workout"/);
  assert.match(source, /MotionViewerBoundary\.create/);
  assert.doesNotMatch(source, /avatar-runtime|THREE|WebGL|\.glb|\.fbx/i);
});
