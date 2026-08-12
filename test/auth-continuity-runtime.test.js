"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/auth-state-runtime.js"), "utf8");
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), has: key => values.has(key) };
}
function browser({ persisted = {}, me = { ok: true, user: { id: "admin-1", roles: ["admin"] } }, status = 200 } = {}) {
  const localStorage = storage(persisted), sessionStorage = storage({ authToken: "retired" }), events = [];
  const window = { localStorage, sessionStorage, location: { origin: "https://app.example" }, RuntimeState: { getBackendOrigin: () => "https://api.example" }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }, dispatchEvent: event => events.push(event), addEventListener() {}, atob: value => Buffer.from(value, "base64").toString("binary"), fetch: async (_url, options) => ({ status, ok: status >= 200 && status < 300, json: async () => me, options }) };
  window.window = window;
  vm.runInNewContext(source, { window, globalThis: window, console, Date, JSON, Promise, Buffer });
  return { window, localStorage, sessionStorage, events };
}
const token = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.signature`;

test("login persistence and a Safari-style page reload restore the one canonical admin identity", async () => {
  const first = browser();
  first.window.AuthStateRuntime.setCanonicalAuthState({ token: ` Bearer ${token} `, user: { id: "admin-1", roles: ["admin"] } }, { reason: "login" });
  assert.equal(first.localStorage.getItem("maatAuthToken"), token);
  const reloaded = browser({ persisted: { maatAuthToken: first.localStorage.getItem("maatAuthToken") } });
  const restored = await reloaded.window.AuthStateRuntime.whenReady();
  assert.equal(restored.ok, true);
  assert.equal(reloaded.window.AuthStateRuntime.getCanonicalAuthState().user.roles[0], "admin");
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.window.AuthStateRuntime.getSafeDiagnostics())), { authenticated: true, credentialPresent: true, source: "AuthStateRuntime.memory", role: "admin", tokenFormatValid: true, expiryState: "valid", lastRestoreResult: "restored" });
});

test("invalid auth is cleared everywhere and logout removes canonical and retired aliases", async () => {
  const invalid = browser({ persisted: { maatAuthToken: token }, status: 401, me: { ok: false, error: "expired" } });
  assert.equal((await invalid.window.AuthStateRuntime.whenReady()).reason, "invalid_session");
  assert.equal(invalid.localStorage.getItem("maatAuthToken"), null);
  invalid.localStorage.setItem("authToken", "retired");
  invalid.window.AuthStateRuntime.clearCanonicalAuthState("logout", { clearLastUser: true });
  assert.equal(invalid.localStorage.has("authToken"), false);
  assert.equal(invalid.sessionStorage.has("authToken"), false);
});

test("dashboard and both diagnostics surfaces wait for canonical restoration and never use URL tokens", () => {
  const dashboard = fs.readFileSync(path.join(__dirname, "../public/dashboard.js"), "utf8");
  const health = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  const runClub = fs.readFileSync(path.join(__dirname, "../public/admin-run-club-diagnostics.js"), "utf8");
  assert.match(dashboard, /await window\.AuthStateRuntime\?\.whenReady\?\.\(\)/);
  assert.match(dashboard, /authorization: `Bearer \$\{authToken\}`/);
  assert.match(health, /id="authContinuityStatus"/);
  assert.match(runClub, /await runtime\.whenReady\(\)/);
  assert.doesNotMatch(`${dashboard}\n${runClub}`, /[?&](token|auth)=/i);
});
