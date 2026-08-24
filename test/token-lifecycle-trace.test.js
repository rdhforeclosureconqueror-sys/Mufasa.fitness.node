"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const runtimeSource = fs.readFileSync(path.join(__dirname, "../public/auth-state-runtime.js"), "utf8");
const loginSource = fs.readFileSync(path.join(__dirname, "../public/run-club-login.js"), "utf8");
const greatnessHtml = fs.readFileSync(path.join(__dirname, "../public/greatness.html"), "utf8");
const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;

function storage(initial = {}, behavior = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return behavior.readMismatch && key === "maatAuthToken" ? "different.token.value" : values.get(key) ?? null; },
    setItem(key, value) { if (behavior.writeFailure && key === "maatAuthToken") throw new Error("quota"); values.set(key, String(value)); },
    removeItem: key => values.delete(key)
  };
}

function browser({ status = 200, localBehavior, pathname = "/greatness.html" } = {}) {
  const listeners = {}, localStorage = storage({}, localBehavior), sessionStorage = storage();
  const window = { localStorage, sessionStorage, location: { origin: "https://web.example", pathname }, RuntimeState: { getBackendOrigin: () => "https://api.example" }, addEventListener: (name, fn) => { listeners[name] = fn; }, dispatchEvent() {}, CustomEvent: class {}, atob: value => Buffer.from(value, "base64").toString("binary"), setTimeout, fetch: async () => ({ ok: status === 200, status, json: async () => status === 200 ? { ok: true, user: { id: "member-1" } } : { ok: false } }) };
  window.window = window;
  vm.runInNewContext(runtimeSource, { window, globalThis: window, console, Date, JSON, Promise, Buffer, setTimeout });
  return { window, localStorage, sessionStorage, listeners };
}

test("valid token persists, validates on auth me 200, and remains for Greatness", async () => {
  const page = browser();
  const persisted = await page.window.AuthStateRuntime.persistCanonicalAuthState({ token, user: { id: "member-1" } }, { reason: "test-login", rememberMe: true });
  assert.equal(persisted.ok, true);
  const validation = await page.window.AuthStateRuntime.refreshAuthStatus({ token, reason: "login-page" });
  assert.equal(validation.ok, true);
  assert.equal(page.localStorage.getItem("maatAuthToken"), token);
});

test("login-issued token rejected by auth me 401 is cleared and attributed", async () => {
  const page = browser({ status: 401, pathname: "/run-club-login.html" });
  await page.window.AuthStateRuntime.persistCanonicalAuthState({ token, user: { id: "member-1" } }, { rememberMe: true });
  assert.equal((await page.window.AuthStateRuntime.refreshAuthStatus({ token, reason: "login-page" })).reason, "invalid_session");
  assert.equal(page.localStorage.getItem("maatAuthToken"), null);
  assert.match(page.window.AuthStateRuntime.readLifecycle().tokenClearedBy, /refreshAuthStatus\/login-page:invalid_session/);
});

test("token cleared during navigation records the responsible file, function, and reason", async () => {
  const page = browser();
  await page.window.AuthStateRuntime.persistCanonicalAuthState({ token, user: { id: "member-1" } }, { rememberMe: true });
  page.window.AuthStateRuntime.clearCanonicalAuthState("navigation-test", { file: "public/navigation-test.js", function: "bootstrap" });
  const trace = page.window.AuthStateRuntime.readLifecycle();
  assert.equal(page.localStorage.getItem("maatAuthToken"), null);
  assert.equal(trace.tokenClearedBy, "public/navigation-test.js/bootstrap/navigation-test");
  assert.equal(trace.lastTokenDeletion.relativeToAuthMe, "before_or_without_auth_me");
});

for (const [name, behavior] of [["persistence write failure", { writeFailure: true }], ["persistence read-back mismatch", { readMismatch: true }]]) {
  test(name, async () => assert.equal((await browser({ localBehavior: behavior }).window.AuthStateRuntime.persistCanonicalAuthState({ token, user: { id: "member-1" } }, { rememberMe: true })).ok, false));
}

test("Safari pageshow restores while a same-value storage event does not clear auth", async () => {
  const page = browser({ pathname: "/greatness.html" });
  await page.window.AuthStateRuntime.persistCanonicalAuthState({ token, user: { id: "member-1" } }, { rememberMe: true });
  page.listeners.pageshow({ persisted: true });
  page.listeners.storage({ key: "maatAuthToken", oldValue: token, newValue: token });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(page.localStorage.getItem("maatAuthToken"), token);
});

test("login and first Greatness execution contain all mandatory redacted checkpoints", () => {
  for (const name of ["LOGIN_CHECKPOINT_1", "LOGIN_CHECKPOINT_2", "LOGIN_CHECKPOINT_3", "LOGIN_CHECKPOINT_4"]) assert.match(loginSource, new RegExp(name));
  assert.match(greatnessHtml, /GREATNESS_CHECKPOINT_1/);
  assert.match(runtimeSource, /GREATNESS_CHECKPOINT_2/);
  assert.match(runtimeSource, /GREATNESS_CHECKPOINT_3/);
  assert.doesNotMatch(`${loginSource}\n${runtimeSource}`, /record(Lifecycle|Checkpoint)\([^\n]*(normalizedToken|returnedToken)/);
});
