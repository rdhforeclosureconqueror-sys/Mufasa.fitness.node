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
  assert.equal(runtime.window.AppHydrationRuntime.getState().lastProfileReload.code, "MISSING_AUTH_TOKEN");
});

test("backend read profile request uses a caller-provided accepted token instead of stale storage", async () => {
  const requests = [];
  const localStorage = {
    getItem: key => key === "maatAuthToken" ? "stale-storage-token" : null,
    setItem() {},
    removeItem() {}
  };
  const window = { localStorage };
  window.window = window;
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../public/backend-read.js"), "utf8"),
    {
      window,
      localStorage,
      console: { log() {}, info() {} },
      fetch: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, status: 200, json: async () => ({ ok: true, data: { profile: { age: 30 } } }) };
      }
    }
  );

  const client = window.MufasaBackendRead.createClient({ baseUrl: "https://api.example" });
  await client.fetchProfile({ authToken: "accepted-upload-token" });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers.authorization, "Bearer accepted-upload-token");
});

test("production browser script wiring exposes the real backend-read client to hydration", async () => {
  const workout = fs.readFileSync(path.join(__dirname, "../public/workout.html"), "utf8");
  assert.ok(workout.indexOf('src="/backend-read.js') < workout.indexOf('src="/app-hydration-runtime.js'));

  const requests = [];
  const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const window = {
    location: { origin: "https://frontend.example" },
    localStorage,
    APP_AUTH: { isAuthenticated: false },
    console: { log() {}, warn() {} },
    performance: { now: () => 0 },
    queueMicrotask,
    setTimeout: () => 1,
    clearTimeout() {}
  };
  window.window = window;
  const context = {
    window, localStorage, console: window.console, Date, Error, CustomEvent: function CustomEvent() {},
    setTimeout, clearTimeout,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ ok: true, data: { profile: { age: 30, avatar: { avatarModelUrl: "/api/me/avatar/assets/uploaded" } } } }) };
    }
  };

  // Execute the deployed plain-browser assets, in their production order, with
  // no injected backendReadClient mock.
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/backend-read.js"), "utf8"), context);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/app-hydration-runtime.js"), "utf8"), context);
  let profile = {};
  window.AppHydrationRuntime.configure({ getProfile: () => profile, setProfile: value => { profile = value; }, persistUser() {} });

  assert.equal(await window.AppHydrationRuntime.hydrateProfileFromBackend({ authToken: "accepted-upload-token" }), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://frontend.example/api/me/profile");
  assert.equal(requests[0].options.headers.authorization, "Bearer accepted-upload-token");
  assert.equal(window.AppHydrationRuntime.getState().lastProfileReload.status, 200);
});
