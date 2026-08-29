"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../public/workout.html"), "utf8");
const presentationSource = fs.readFileSync(path.join(__dirname, "../public/workout-presentation-state.js"), "utf8");
const CACHE_ID = "2026-08-29-render-mode-wiring-v1";

class FakeSelect {
  constructor(id) { this.id = id; this.value = "camera"; this.listeners = {}; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatch(type) {
    const event = { type, target: this, currentTarget: this };
    for (const handler of this.listeners[type] || []) handler(event);
  }
}

function loadInstaller(presentationState) {
  const start = html.indexOf("function installRenderModeSelectorBinding(");
  const end = html.indexOf("    function getAuthoritativeRenderSelector", start);
  assert.ok(start > 0 && end > start, "binding installer is present in workout.html");
  const errors = [];
  const window = { WorkoutPresentationState: presentationState };
  const context = { window, console: { error(...args) { errors.push(args); } }, Date };
  vm.runInNewContext(html.slice(start, end), context, { filename: "workout-render-mode-binding-inline.js" });
  return { install: context.installRenderModeSelectorBinding, window, errors };
}

function presentationStateFixture() {
  const window = { window: null, console, addEventListener() {}, dispatchEvent() {}, document: { getElementById() {} } };
  window.window = window;
  vm.runInNewContext(presentationSource, { window, console });
  return window.WorkoutPresentationState;
}

test("presentation state and workout runtime use one coherent cache identifier", () => {
  for (const asset of ["workout-presentation-state.js", "workout-runtime.js"]) {
    assert.match(html, new RegExp(`/${asset.replace(".", "\\.")}\\?v=${CACHE_ID}`));
  }
  assert.doesNotMatch(html, /src="\/workout-(?:presentation-state|runtime)\.js\?v=2026-08-27-movenet-visible-audible-v22"/);
});

test("missing binder fails visibly without throwing or claiming handlers are active", () => {
  const { install, window, errors } = loadInstaller(undefined);
  let visibleDiagnostic = null;
  const proof = install({
    presentationState: undefined,
    desktopSelector: new FakeSelect("renderModeSelect"),
    mobileSelector: new FakeSelect("renderModeMobileSelect"),
    reportError(message) { visibleDiagnostic = message; }
  });
  assert.equal(proof.binderAvailable, false);
  assert.equal(proof.binderAttached, false);
  assert.equal(proof.desktopHandlerAttached, false);
  assert.equal(proof.mobileHandlerAttached, false);
  assert.equal(proof.bindingError, "RENDER_MODE_BINDER_MISSING");
  assert.match(visibleDiagnostic, /RENDER_MODE_BINDER_MISSING/);
  assert.equal(errors[0][0], "RENDER_MODE_BINDER_MISSING");
  assert.strictEqual(window.__renderModeBindingProof, proof);
});

test("real binder attaches both selectors and both changes invoke the canonical owner", () => {
  const state = presentationStateFixture();
  const { install } = loadInstaller(state);
  const desktop = new FakeSelect("renderModeSelect");
  const mobile = new FakeSelect("renderModeMobileSelect");
  const presentation = { dataset: { avatarPresentation: "camera" } };
  let canonical = "camera";
  const calls = [];
  const proof = install({
    presentationState: state, desktopSelector: desktop, mobileSelector: mobile,
    getCanonicalRenderMode: () => canonical, presentationElement: presentation,
    applyRenderMode(mode, options) {
      calls.push({ mode, source: options.source });
      canonical = desktop.value = mobile.value = presentation.dataset.avatarPresentation = mode;
      return mode;
    }
  });
  assert.equal(proof.binderAttached, true);
  assert.equal(proof.desktopHandlerAttached, true);
  assert.equal(proof.mobileHandlerAttached, true);

  mobile.value = "avatar_only"; mobile.dispatch("change");
  assert.deepEqual(calls[0], { mode: "avatar_only", source: "mobile" });
  assert.equal(proof.canonicalRenderMode, "avatar_only");
  assert.equal(proof.workoutPresentationDataset, "avatar_only");
  assert.equal(desktop.value, "avatar_only");
  desktop.value = "avatar_overlay"; desktop.dispatch("change");
  assert.deepEqual(calls[1], { mode: "avatar_overlay", source: "user" });
  assert.equal(mobile.value, "avatar_overlay");
  assert.ok(proof.lastApplyRenderModeTimestamp);
});

test("responsive CSS presents exactly one render selector", () => {
  assert.match(html, /\.camera-mobile-controls \{[\s\S]*?display: none;/);
  const mobileControl = html.indexOf("      .camera-mobile-controls {\n        display: grid;");
  const mobileRulesStart = html.lastIndexOf("@media (max-width: 800px) {", mobileControl);
  const desktopControlHidden = html.indexOf("      #renderModeControl {", mobileControl);
  const mobileRules = html.slice(mobileRulesStart, html.indexOf("      }", desktopControlHidden) + 7);
  assert.match(mobileRules, /\.camera-mobile-controls \{\s*display: grid;/);
  assert.match(mobileRules, /#renderModeControl \{\s*display: none !important;/);
  assert.match(html, /<label id="renderModeControl"[\s\S]*?<select id="renderModeSelect">/);
  assert.match(html, /<select id="renderModeMobileSelect"/);
});
