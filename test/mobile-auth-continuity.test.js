"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const runtimeSource = fs.readFileSync(path.join(__dirname, "../public/auth-state-runtime.js"), "utf8");
const token = (exp = Math.floor(Date.now() / 1000) + 3600) => `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.sig`;

function harness({ initial = {}, delayed = false, unavailable = false } = {}) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: key => { if (unavailable) throw new Error("SecurityError"); return values.get(key) ?? null; },
    setItem: (key, value) => { if (unavailable) throw new Error("QuotaExceededError"); if (delayed && key === "maatAuthToken") setTimeout(() => values.set(key, String(value)), 35); else values.set(key, String(value)); },
    removeItem: key => values.delete(key)
  };
  const sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const window = { localStorage, sessionStorage, location: { origin: "https://mufasafitsite.onrender.com" }, navigator: {}, setTimeout, atob: value => Buffer.from(value, "base64").toString("binary"), CustomEvent: class {}, dispatchEvent() {}, addEventListener() {}, fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true, user: { id: "a", roles: ["admin"] } }) }) };
  window.window = window;
  vm.runInNewContext(runtimeSource, { window, globalThis: window, console, Date, JSON, Promise, Buffer });
  return { window, values };
}

test("delayed Safari storage is verified before login navigation may continue", async () => {
  const { window, values } = harness({ delayed: true });
  const result = await window.AuthStateRuntime.persistCanonicalAuthState({ token: token(), user: { roles: ["admin"] } }, { reason: "login", rememberMe: true });
  assert.equal(result.ok, true);
  assert.equal(values.get("maatAuthToken"), result.state.token);
  assert.equal(values.get("maatAuthOrigin"), "https://mufasafitsite.onrender.com");
});

test("unavailable localStorage returns useful persistence failure", async () => {
  const { window } = harness({ unavailable: true });
  const result = await window.AuthStateRuntime.persistCanonicalAuthState({ token: token(), user: { roles: ["admin"] } }, { rememberMe: true });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "storage_verification_failed");
  assert.match(window.AuthStateRuntime.ensureDebugState().lastAuthError, /could not be persisted/);
});

test("malformed, expired, and alternate tokens are diagnosed without exposing credentials", () => {
  const malformed = harness({ initial: { maatAuthToken: "not-a-jwt", maatAuthPersistence: "persistent", authToken: "retired-secret" } }).window.AuthStateRuntime.getSafeDiagnostics();
  assert.equal(malformed.tokenFormatValid, false);
  const expired = harness({ initial: { maatAuthToken: token(1), maatAuthPersistence: "persistent" } }).window.AuthStateRuntime.getSafeDiagnostics();
  assert.equal(expired.expiryState, "expired");
  const source = fs.readFileSync(path.join(__dirname, "../public/mobile-auth-diagnostics.js"), "utf8");
  assert.match(source, /retired\/alternate auth keys present/);
  assert.doesNotMatch(source, /output\.textContent\s*=.*Bearer \" \+ token/);
});

test("mobile initialization, same-origin reporting, API checks, and redirect persistence are wired", () => {
  const login = fs.readFileSync(path.join(__dirname, "../public/login.js"), "utf8");
  const runClub = fs.readFileSync(path.join(__dirname, "../public/run-club-login.js"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  assert.match(login, /AuthStateRuntime\.persistCanonicalAuthState[\s\S]+AuthStateRuntime\.refreshAuthStatus[\s\S]+location\.replace/);
  assert.match(runClub, /await runtime\.persistCanonicalAuthState[\s\S]+await runtime\.refreshAuthStatus[\s\S]+location\.assign/);
  assert.match(runtimeSource, /pageshow-restore/);
  assert.match(runtimeSource, /storage-event-restore/);
  assert.match(dashboard, /mobile-auth-diagnostics\.js\?v=20260812-mobile-auth/);
  assert.match(fs.readFileSync(path.join(__dirname, "../public/mobile-auth-diagnostics.js"), "utf8"), /\/api\/auth\/me[\s\S]+\/api\/me\/history[\s\S]+\/api\/admin\/diagnostics\/summary/);
});
