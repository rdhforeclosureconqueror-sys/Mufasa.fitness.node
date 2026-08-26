"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRuntime({ appAuth, token }) {
  const fetchedProfile = {
    age: 30,
    avatar: { avatarProvider: "avaturn", avatarModelUrl: "/api/me/avatar/assets/uploaded" }
  };
  let fetches = 0;
  let fetchOptions = null;
  const backendReadClient = {
    getAuthToken: () => token,
    fetchProfile: async (options) => { fetches += 1; fetchOptions = options; return { profile: fetchedProfile }; },
    normalizeProfile: (profile, fallback) => ({ ...fallback, ...profile })
  };
  const window = {
    APP_AUTH: appAuth,
    BACKEND_READ_CLIENT: backendReadClient,
    console: { log() {}, warn() {} },
    performance: { now: () => 0 },
    queueMicrotask,
    setTimeout: () => 1,
    clearTimeout() {}
  };
  window.window = window;
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../public/app-hydration-runtime.js"), "utf8"),
    { window, console: window.console, Date, Error, setTimeout, clearTimeout }
  );
  let profile = {};
  window.AppHydrationRuntime.configure({
    backendReadClient,
    getProfile: () => profile,
    setProfile: next => { profile = next; },
    persistUser() {}
  });
  return { window, getFetches: () => fetches, getFetchOptions: () => fetchOptions, getProfile: () => profile };
}

test("profile reload uses the canonical token when the APP_AUTH snapshot is stale", async () => {
  const runtime = loadRuntime({ appAuth: { isAuthenticated: false }, token: "upload-token" });

  assert.equal(await runtime.window.AppHydrationRuntime.hydrateProfileFromBackend(), true);
  assert.equal(runtime.getFetches(), 1);
  assert.equal(runtime.getProfile().avatar.avatarModelUrl, "/api/me/avatar/assets/uploaded");
});

test("profile reload reuses the token accepted by the avatar upload", async () => {
  const runtime = loadRuntime({ appAuth: { isAuthenticated: false }, token: null });

  assert.equal(await runtime.window.AppHydrationRuntime.hydrateProfileFromBackend({ authToken: "accepted-upload-token" }), true);
  assert.equal(runtime.getFetches(), 1);
  assert.equal(runtime.getFetchOptions().authToken, "accepted-upload-token");
});

test("profile reload still stops before the backend when neither auth signal exists", async () => {
  const runtime = loadRuntime({ appAuth: { isAuthenticated: false }, token: null });

  assert.equal(await runtime.window.AppHydrationRuntime.hydrateProfileFromBackend(), false);
  assert.equal(runtime.getFetches(), 0);
});
