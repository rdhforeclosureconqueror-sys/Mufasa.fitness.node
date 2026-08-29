"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const publicAsset = name => fs.readFileSync(path.join(__dirname, "../public", name), "utf8");

class FakeSelect {
  constructor(id, value = "camera") { this.id = id; this.value = value; this.listeners = {}; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) {
    event.target = this; event.currentTarget = this;
    for (const handler of this.listeners[event.type] || []) handler(event);
  }
}

function fixture() {
  const listeners = new Map();
  const window = {
    window: null, console, __avatarRuntimeStatus: {},
    addEventListener(type, fn) { (listeners.get(type) || listeners.set(type, []).get(type)).push(fn); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); },
    document: { getElementById() { return null; } }
  };
  window.window = window;
  vm.runInNewContext(publicAsset("workout-presentation-state.js"), { window, console });
  return window;
}

test("mobile and desktop changes execute the canonical presentation path without touching capture", () => {
  const window = fixture();
  const desktop = new FakeSelect("renderModeSelect");
  const mobile = new FakeSelect("renderModeMobileSelect");
  const stream = { active: true, getTracks: () => [{ stop() { throw new Error("camera track stopped"); } }] };
  const video = { srcObject: stream, style: { display: "block", visibility: "visible" } };
  const overlay = { style: { display: "block", visibility: "visible" } };
  const avatar = { style: { display: "none", visibility: "hidden" } };
  const getComputedStyle = element => ({
    display: element.style.display,
    visibility: element.style.visibility
  });
  const presentation = { dataset: { avatarPresentation: "camera" } };
  let canonical = "camera";
  const applyRenderMode = mode => {
    canonical = mode;
    desktop.value = mobile.value = mode;
    presentation.dataset.avatarPresentation = mode;
    video.style.visibility = overlay.style.visibility = mode === "avatar_only" ? "hidden" : "visible";
    avatar.style.display = mode === "camera" ? "none" : "block";
    avatar.style.visibility = mode === "camera" ? "hidden" : "visible";
    return mode;
  };
  window.WorkoutPresentationState.bindRenderModeSelectors({ desktopSelector: desktop, mobileSelector: mobile, applyRenderMode });

  const originalStream = video.srcObject;
  mobile.value = "avatar_only";
  mobile.dispatchEvent({ type: "change" });
  assert.equal(mobile.value, "avatar_only");
  assert.equal(desktop.value, "avatar_only");
  assert.equal(canonical, "avatar_only");
  assert.equal(presentation.dataset.avatarPresentation, "avatar_only");
  assert.equal(getComputedStyle(video).visibility, "hidden");
  assert.equal(getComputedStyle(overlay).visibility, "hidden");
  assert.notEqual(getComputedStyle(avatar).visibility, "hidden");
  assert.notEqual(getComputedStyle(avatar).display, "none");
  assert.strictEqual(video.srcObject, originalStream);

  mobile.value = "avatar_overlay"; mobile.dispatchEvent({ type: "change" });
  assert.equal(presentation.dataset.avatarPresentation, "avatar_overlay");
  assert.equal(getComputedStyle(video).visibility, "visible");
  assert.equal(getComputedStyle(avatar).visibility, "visible");
  desktop.value = "camera"; desktop.dispatchEvent({ type: "change" });
  assert.equal(mobile.value, "camera");
  assert.equal(presentation.dataset.avatarPresentation, "camera");
  assert.equal(getComputedStyle(video).visibility, "visible");
});

test("avatar runtime replay cannot overwrite a newer avatar-only selection", () => {
  const window = fixture();
  let canonical = "avatar_only";
  let applications = 0;
  window.WorkoutPresentationState.configure({
    getRenderMode: () => canonical,
    getRenderDiagnostics: () => ({ preferenceSource: "mobile" }),
    applyRenderMode(mode) { applications += 1; canonical = mode; return mode; },
    setAvatarLabel() {}
  });
  window.WorkoutPresentationState.consumePresentation({ savedAvatarState: "active", avatarPresentationState: "ACTIVE", presentationMode: "avatar_overlay" });
  assert.equal(canonical, "avatar_only");
  assert.equal(applications, 0);
  assert.equal(window.WorkoutPresentationState.getState().appliedRenderMode, "avatar_only");
});

test("workout stop resets presentation through the canonical owner", async () => {
  const window = { window: null, location: { search: "" }, document: { getElementById() { return null; } }, console, addEventListener() {} };
  window.window = window;
  vm.runInNewContext(publicAsset("workout-runtime.js"), { window, globalThis: window, console, URLSearchParams, Date, Math });
  let canonical = "avatar_only";
  const desktop = { value: "avatar_only" };
  const mobile = { value: "avatar_only" };
  const presentation = { dataset: { avatarPresentation: "avatar_only" } };
  const video = { style: { visibility: "hidden" } };
  const callbacks = window.WorkoutRuntime.createSessionCallbackGlue({
    refs: {},
    deps: {
      getWorkoutProgressionRuntime: () => ({ pauseWorkout() {} }),
      setRunning() {}, getAnimId: () => null,
      resetRenderModeToCamera() {
        canonical = desktop.value = mobile.value = presentation.dataset.avatarPresentation = "camera";
        video.style.visibility = "visible";
      }
    }
  });
  await callbacks.onWorkoutStopped();
  assert.equal(canonical, "camera");
  assert.equal(desktop.value, "camera");
  assert.equal(mobile.value, "camera");
  assert.equal(presentation.dataset.avatarPresentation, "camera");
  assert.equal(video.style.visibility, "visible");
});
