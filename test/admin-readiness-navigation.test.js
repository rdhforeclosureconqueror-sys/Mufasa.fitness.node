"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { ROLE_PERMISSIONS, PERMISSIONS } = require("../src/lib/authorization");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const groups = { "RUNTIME FOUNDATION": 3, "POSE PIPELINE": 3, "LIVE MIRROR": 3, "MOTION RECORDING": 3, "FIXTURES / REGISTRY": 4, "ACCEPTANCE": 4 };
const avatar = Object.entries(groups).flatMap(([category, count]) => Array.from({ length: count }, (_, index) => ({ id: `${category}-${index}`, category, title: `Card ${index}`, status: "BACKLOG", automated: "NOT_RUN" })));
const counts = { BACKLOG: 20, IN_PROGRESS: 0, BLOCKED: 0, HUMAN_TEST_REQUIRED: 0, DONE: 0, POST_LAUNCH: 0 };
const validData = { summaries: { launch: { counts, remaining: 0 }, avatar: { counts, remaining: 20 } }, boards: { launch: [], avatar } };

test("both board shells exist and use one coherent versioned bootstrap", () => {
  const expected = "/admin-launch-readiness.js?v=2026-08-29-avatar-readiness-board-v1";
  for (const file of ["public/admin-launch-readiness.html", "public/admin-avatar-development.html"]) {
    const html = read(file);
    assert.match(html, /id="bootstrap-status"/);
    assert.equal((html.match(new RegExp(expected.replace(/[?]/g, "\\?"), "g")) || []).length, 1);
  }
});
test("global menu contains exactly one restored-admin Avatar Development entry", () => {
  const source = read("public/global-nav.js");
  assert.equal((source.match(/label:"Avatar Development Board"/g) || []).length, 1);
  assert.match(source, /label:"Avatar Development Board",href:"\/admin-avatar-development\.html"[^\n]+roles:\["admin","super_admin"\]/);
  assert.match(source, /item\.roles\.some\(role=>roleSet\(state\.user\)\.has\(role\)\)/);
});
test("public board shells and permission-protected API routes are explicit", () => {
  const server = read("server.js");
  assert.match(server, /app\.get\("\/admin-avatar-development\.html", \(_req, res\)/);
  assert.match(server, /app\.get\("\/admin\/launch-readiness\.html", \(_req, res\)/);
  assert.match(server, /app\.get\("\/api\/admin\/launch-readiness", requireAuth, permission\(authorizationResolver\.PERMISSIONS\.OPS_READ_OBSERVABILITY\)/);
});
test("read-only operators and both canonical admin roles own observability permission", () => {
  for (const role of ["super_admin", "admin", "operator"]) assert.ok(ROLE_PERMISSIONS[role].includes(PERMISSIONS.OPS_READ_OBSERVABILITY));
  assert.equal(ROLE_PERMISSIONS.superadmin, undefined, "retired superadmin spelling is not silently elevated");
  const contract = require("../config/route-authorization-contract");
  for (const shell of ["/admin/launch-readiness.html", "/admin-avatar-development.html"]) assert.equal(contract.find(item => item.path === shell).authentication, "public-shell");
});

function harness({ guard = { ok: true }, auth = { isAuthenticated: true, token: "canonical-token", user: { role: "admin" } }, status = 200, data = validData, rejectFetch = false, throwRender = false } = {}) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { dataset: {}, className: "", innerHTML: "", addEventListener() {}, querySelector() { return null; } });
    return elements.get(selector);
  };
  const board = element("#board");
  if (throwRender) Object.defineProperty(board, "innerHTML", { get() { return ""; }, set(value) { if (String(value).includes('class="column"')) throw new Error("DOM failure"); this.value = value; } });
  const document = { body: { dataset: { defaultBoard: "avatar" } }, querySelector: element, querySelectorAll: () => [], addEventListener() {} };
  let guardCalls = 0;
  const requests = [];
  const location = { pathname: "/admin-avatar-development.html", origin: "https://example.test" };
  const window = { document, location, AuthStateRuntime: { whenReady: async () => ({ ok: true }), getCanonicalAuthState: () => auth }, AuthNavigation: { requireUser: async options => { guardCalls++; assert.equal(options.redirect, false); return guard; }, loginUrl: () => "/login.html" }, fetch: async (url, options) => { requests.push({ url, options }); if (rejectFetch) throw new Error("offline"); return { ok: status >= 200 && status < 300, status, json: async () => ({ data }) }; } };
  window.window = window;
  vm.runInNewContext(read("public/admin-launch-readiness.js"), { window, document, location, globalThis: window, console, Error, Object, String, Array, JSON });
  return { elements, board, requests, guardCalls: () => guardCalls };
}
const settle = () => new Promise(resolve => setImmediate(() => setImmediate(resolve)));

test("canonical auth restoration completes before the protected request and supplies its token", async () => {
  const run = harness();
  assert.equal(run.requests.length, 0);
  await settle();
  assert.equal(run.guardCalls(), 1);
  assert.equal(run.requests.length, 1);
  assert.equal(run.requests[0].options.headers.Authorization, "Bearer canonical-token");
  assert.match(run.elements.get("#bootstrap-status").innerHTML, /Session restored<\/dt><dd>YES/);
  assert.match(run.elements.get("#bootstrap-status").innerHTML, /Render<\/dt><dd>COMPLETE/);
  assert.match(run.board.innerHTML, /class="column"/);
});
test("auth restoring, unauthenticated, and missing-token states never make an early request", async () => {
  for (const options of [
    { guard: { ok: false, retryable: true }, expected: /Session verification/ },
    { guard: { ok: false, retryable: false }, expected: /Sign in to view/ },
    { auth: { isAuthenticated: true, token: "", user: { role: "admin" } }, expected: /does not contain an authentication token/ }
  ]) {
    const run = harness(options); await settle();
    assert.equal(run.requests.length, 0); assert.match(run.board.innerHTML, options.expected);
  }
});
test("401, 403, and 500 responses remain visible with exact failure stages", async () => {
  for (const [status, message, stage] of [[401, /no longer authorized/, "AUTH"], [403, /does not have Avatar Development Board permission/, "AUTHORIZATION"], [500, /could not be loaded/, "API"]]) {
    const run = harness({ status }); await settle();
    assert.match(run.board.innerHTML, message);
    assert.match(run.elements.get("#bootstrap-status").innerHTML, new RegExp(`HTTP status<\\/dt><dd>${status}`));
    assert.match(run.elements.get("#bootstrap-status").innerHTML, new RegExp(`Failure stage<\\/dt><dd>${stage}`));
  }
});
test("network, response-shape, count, and render failures are explicit", async () => {
  const cases = [
    [{ rejectFetch: true }, /could not be loaded/, "API"],
    [{ data: {} }, /data is incomplete/, "RESPONSE_SHAPE"],
    [{ data: { ...validData, boards: { ...validData.boards, avatar: avatar.slice(1) } } }, /expected 20 canonical workstreams but received 19/, "RESPONSE_SHAPE"],
    [{ throwRender: true }, /Kanban view could not be rendered/, "RENDER"]
  ];
  for (const [options, message, stage] of cases) { const run = harness(options); await settle(); assert.match(run.board.innerHTML || run.board.value, message); assert.match(run.elements.get("#bootstrap-status").innerHTML, new RegExp(`Failure stage<\\/dt><dd>${stage}`)); }
});
