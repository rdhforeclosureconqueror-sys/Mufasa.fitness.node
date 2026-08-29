"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const runtimeSource = fs.readFileSync(path.join(__dirname, "../public/auth-state-runtime.js"), "utf8");
const navigationSource = fs.readFileSync(path.join(__dirname, "../public/auth-navigation.js"), "utf8");
const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
function storage(initial = {}) { const values = new Map(Object.entries(initial)); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }; }
function harness({ session = {}, local = {}, responses = [{ status: 200, body: { ok: true, user: { id: "admin-1", role: "admin", roles: ["admin"] } } }] } = {}) {
  const calls = [], events = [], queue = [...responses];
  const window = { sessionStorage: storage(session), localStorage: storage(local), location: { origin: "https://frontend.example", href: "https://frontend.example/admin-avatar-development.html", pathname: "/admin-avatar-development.html", search: "", hash: "", replace() {}, assign() {} }, MAAT_BACKEND_ORIGIN: "https://api.example", CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }, dispatchEvent: event => events.push(event), addEventListener() {}, atob: value => Buffer.from(value, "base64").toString("binary"), fetch: async (input, options) => { calls.push({ input: String(input), options }); const next = queue.shift(); if (next?.error) throw next.error; return { status: next.status, ok: next.status >= 200 && next.status < 300, headers: { get: () => null }, json: async () => next.body }; } };
  window.window = window;
  const context = { window, globalThis: window, console, Date, JSON, Promise, Buffer, URL, URLSearchParams, Set };
  vm.runInNewContext(runtimeSource, context); vm.runInNewContext(navigationSource, context);
  return { window, calls, events };
}

test("Avatar board canonical restore accepts session and consented persistent tokens", async () => {
  for (const stored of [{ session: { maatAuthToken: token } }, { local: { maatAuthToken: token, maatAuthPersistence: "persistent" } }]) {
    const h = harness(stored); const result = await h.window.AuthNavigation.requireUser({ redirect: false });
    assert.equal(result.ok, true); assert.equal(h.calls.length, 1); assert.match(h.calls[0].input, /https:\/\/api\.example\/api\/auth\/me/);
    assert.equal(h.calls[0].options.headers.authorization, `Bearer ${token}`); assert.equal(h.window.APP_AUTH.isAuthenticated, true);
    assert.ok(h.events.some(event => event.type === "auth:changed")); assert.ok(h.events.some(event => event.type === "auth:ready"));
  }
});

test("unconsented persistent token is rejected without a validation request", async () => {
  const h = harness({ local: { maatAuthToken: token } });
  assert.equal((await h.window.AuthStateRuntime.whenReady()).reason, "missing_token"); assert.equal(h.calls.length, 0);
  assert.equal(h.window.AuthStateRuntime.getPropagationProof().selectedTokenSource, "none");
});

test("temporary validation failure is retryable and forced canonical retry recovers", async () => {
  const h = harness({ session: { maatAuthToken: token }, responses: [{ error: new TypeError("offline") }, { status: 200, body: { ok: true, user: { id: "admin-1", role: "admin" } } }] });
  assert.equal((await h.window.AuthNavigation.requireUser({ redirect: false })).retryable, true);
  const retry = await h.window.AuthStateRuntime.restoreCanonicalAuthState({ force: true, reason: "readiness-board-retry" });
  assert.equal(retry.ok, true); assert.equal(h.calls.length, 2); assert.equal(h.window.APP_AUTH.isAuthenticated, true);
});

test("readiness shells share canonical dependencies and board has no credential path", () => {
  const avatar = fs.readFileSync(path.join(__dirname, "../public/admin-avatar-development.html"), "utf8");
  const launch = fs.readFileSync(path.join(__dirname, "../public/admin-launch-readiness.html"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  const board = fs.readFileSync(path.join(__dirname, "../public/admin-launch-readiness.js"), "utf8");
  for (const html of [avatar, launch]) { assert.ok(html.indexOf("runtime-config.js") < html.indexOf("api-client.js")); assert.ok(html.indexOf("api-client.js") < html.indexOf("auth-state-runtime.js")); assert.ok(html.indexOf("auth-state-runtime.js") < html.indexOf("auth-navigation.js")); }
  assert.match(dashboard, /MAAT_BACKEND_ORIGIN/); assert.match(board, /AuthNavigation\.requireUser/); assert.match(board, /readiness-board-retry/);
  assert.doesNotMatch(board, /localStorage|sessionStorage|maatAuthToken|[?&](token|auth)=/i);
  assert.doesNotMatch(`${avatar}\n${launch}`, /maat_auth_token|mufasa_auth_token|authToken|pocket_pt_auth_token/);
});
