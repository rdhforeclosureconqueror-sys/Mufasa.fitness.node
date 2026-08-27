"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const asset = name => fs.readFileSync(path.join(__dirname, "../public", name), "utf8");

function browserFixture() {
  const listeners = new Map();
  const elements = new Map();
  const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  class Event { constructor(type) { this.type = type; } }
  const window = {
    window: null, location: { origin: "https://frontend.example", href: "https://frontend.example/workout.html" },
    localStorage, APP_AUTH: { isAuthenticated: false }, performance: { now: () => 0 },
    console: { log() {}, warn() {}, error() {} }, queueMicrotask, setTimeout, clearTimeout,
    document: { getElementById(id) { return elements.get(id) || null; } },
    addEventListener(type, fn) { const group = listeners.get(type) || []; group.push(fn); listeners.set(type, group); },
    removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== fn)); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); }
  };
  window.window = window;
  const requests = [];
  const context = { window, localStorage, CustomEvent, Event, Date, Error, URL, console: window.console,
    performance: window.performance, queueMicrotask, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ ok: true, data: { profile: {
        age: 30, avatar: { avatarProvider: "custom", avatarModelUrl: "/api/me/avatar/assets/saved-glb" }
      } } }) };
    }
  };
  return { window, context, requests, elements };
}

test("production asset order projects backend hydration through avatar runtime into workout presentation", async () => {
  const f = browserFixture();
  for (const name of ["backend-read.js", "avatar-runtime.js", "app-hydration-runtime.js", "workout-presentation-state.js"]) {
    vm.runInNewContext(asset(name), f.context, { filename: name });
  }

  let uiProfile = null;
  let renderMode = "camera";
  let label = "No avatar saved.";
  const mountedRuntime = { avatarRoot: {}, scene: { children: [] } };
  mountedRuntime.scene.children.push(mountedRuntime.avatarRoot);
  f.window.AvatarRuntime.configureAssetPipeline({
    getProfile: () => f.window.AppHydrationRuntime.getCanonicalProfile(),
    getRenderMode: () => renderMode,
    normalizeAvatarProfile: avatar => avatar,
    probeAvatarModelRuntime: async () => ({ assetFound: true, runtimeLoaded: true, arrayBuffer: new ArrayBuffer(8) }),
    mountAvatarGlbModel: async () => ({ mappedBones: [] }),
    activatePresentation: () => { renderMode = "avatar_overlay"; return renderMode; },
    getRuntime: () => mountedRuntime, ensureRuntime: () => mountedRuntime,
    setActiveAvatarAsset() {}, setCanvasVisibility() {}, setThumbnail() {}, updateOverlayDiagnostics() {},
    setAssetStatus(value) { label = value; }, setRuntimeStatus() {}, setCreateButtonLabel() {}
  });
  f.window.WorkoutPresentationState.configure({
    getProfile: () => uiProfile, getRenderMode: () => renderMode,
    applyRenderMode(mode) { renderMode = mode; return mode; }, setAvatarLabel(value) { label = value; }
  });
  f.window.AppHydrationRuntime.configure({
    getProfile: () => uiProfile, setProfile(profile) { uiProfile = profile; }, persistUser() {},
    loadAvatarAssetForCurrentUser: source => f.window.AvatarRuntime.loadAvatarAssetForCurrentUser(source)
  });

  assert.equal(await f.window.AppHydrationRuntime.hydrateProfileFromBackend({ authToken: "accepted-token" }), true);
  await new Promise(resolve => setImmediate(resolve));

  const hydration = f.window.AppHydrationRuntime.getState();
  const presentation = f.window.WorkoutPresentationState.getState();
  assert.equal(f.requests[0].url, "https://frontend.example/api/me/profile");
  assert.strictEqual(uiProfile, f.window.AppHydrationRuntime.getCanonicalProfile());
  assert.equal(hydration.profileResponseReceived, true);
  assert.equal(hydration.profileNormalizationComplete, true);
  assert.equal(hydration.canonicalAvatarUrlPresent, true);
  assert.equal(presentation.canonicalProfileState, "ready");
  assert.equal(presentation.presentationState, "active");
  assert.equal(presentation.appliedRenderMode, "avatar_overlay");
  assert.equal(presentation.uiProfileMatchesHydration, true);
  assert.notEqual(label, "No avatar saved.");
  assert.equal(presentation.visibleAvatarLabelState, "saved");
});

test("post-save reload proves the HTTP 200 object reached the canonical owner and presentation consumer", async () => {
  const f = browserFixture();
  for (const name of ["backend-read.js", "app-hydration-runtime.js", "workout-presentation-state.js"]) {
    vm.runInNewContext(asset(name), f.context, { filename: name });
  }
  let uiProfile = null;
  f.window.WorkoutPresentationState.configure({
    getProfile: () => uiProfile, getRenderMode: () => "camera",
    applyRenderMode: mode => mode, setAvatarLabel() {}
  });
  f.window.AppHydrationRuntime.configure({
    getProfile: () => uiProfile, setProfile: profile => { uiProfile = profile; }, persistUser() {}
  });

  const result = await f.window.AppHydrationRuntime.reloadCanonicalProfileAfterSave({ authToken: "upload-token" });
  const hydration = f.window.AppHydrationRuntime.getState();
  const presentation = f.window.WorkoutPresentationState.getState();

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.profileReceived, true);
  assert.equal(result.profileNormalized, true);
  assert.equal(result.canonicalAdoptionAttempted, true);
  assert.ok(result.generationAfter > result.generationBefore);
  assert.strictEqual(result.profile, f.window.AppHydrationRuntime.getCanonicalProfile());
  assert.strictEqual(uiProfile, result.profile);
  assert.equal(hydration.postSaveReload.profileMatchesCanonical, true);
  assert.equal(hydration.postSaveReload.canonicalProfileEventDispatched, true);
  assert.ok(hydration.postSaveReload.eventConsumers.includes("WorkoutPresentationState"));
  assert.equal(presentation.hydrationProfileGeneration, result.generationAfter);
  assert.equal(presentation.canonicalAvatarPresent, true);
  assert.equal(presentation.profilePanelState, "ready");
});

test("avatar presentation subscription replays activation that happened before listener registration", () => {
  const f = browserFixture();
  vm.runInNewContext(asset("avatar-runtime.js"), f.context, { filename: "avatar-runtime.js" });
  f.window.AvatarRuntime.updateStatus({ savedAvatarState: "active", presentationMode: "avatar_only", presentationGeneration: 4 });
  let received = null;
  f.window.AvatarRuntime.subscribePresentation(detail => { received = detail; });
  assert.equal(received.savedAvatarState, "active");
  assert.equal(received.presentationMode, "avatar_only");
  assert.equal(received.presentationGeneration, 4);
});
