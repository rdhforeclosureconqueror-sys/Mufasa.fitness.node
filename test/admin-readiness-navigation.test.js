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
const launch = [{ id: "launch-one", category: "LAUNCH", title: "Launch-only card", status: "BACKLOG", automated: "PASS" }];
const validData = { summaries: { launch: { counts: { ...counts, BACKLOG: 1 }, remaining: 1 }, avatar: { counts, remaining: 20 } }, boards: { launch, avatar } };

test("both board shells exist and use one coherent versioned bootstrap", () => {
  const expected = "/admin-launch-readiness.js?v=2026-08-29-readiness-api-routing-v1";
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

function harness({ guard = { ok: true }, auth = { isAuthenticated: true, token: "canonical-token", user: { role: "admin" } }, status = 200, data = validData, rejectFetch = false, throwRender = false, defaultBoard = "avatar" } = {}) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { dataset: {}, className: "", innerHTML: "", addEventListener() {}, querySelector() { return null; } });
    return elements.get(selector);
  };
  const board = element("#board");
  if (throwRender) Object.defineProperty(board, "innerHTML", { get() { return ""; }, set(value) { if (String(value).includes('class="column"')) throw new Error("DOM failure"); this.value = value; } });
  const listeners = {};
  const document = { body: { dataset: { defaultBoard } }, querySelector: element, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
  let guardCalls = 0;
  const requests = [];
  const location = { pathname: "/admin-avatar-development.html", origin: "https://example.test" };
  const window = { document, location, AuthStateRuntime: { whenReady: async () => ({ ok: true }), getCanonicalAuthState: () => auth }, AuthNavigation: { requireUser: async options => { guardCalls++; assert.equal(options.redirect, false); return guard; }, loginUrl: () => "/login.html" }, MaatApiClient: { origin: () => "https://api.example.test", resolve: route => `https://api.example.test${route}`, request: async (route, options = {}) => { requests.push({ route, options }); const diagnostics = { url: `https://api.example.test${route}`, apiOrigin: "https://api.example.test", crossOrigin: true, dispatched: !rejectFetch, backendReached: rejectFetch ? null : true, status: rejectFetch ? null : status }; return rejectFetch ? { ok: false, error: new TypeError("offline"), diagnostics } : { ok: status >= 200 && status < 300, payload: { data }, diagnostics }; } } };
  window.window = window;
  vm.runInNewContext(read("public/admin-launch-readiness.js"), { window, document, location, globalThis: window, console, Error, Object, String, Array, JSON, URL });
  return { elements, board, requests, listeners, guardCalls: () => guardCalls };
}
const settle = () => new Promise(resolve => setImmediate(() => setImmediate(resolve)));

test("canonical auth restoration completes before the protected canonical API request", async () => {
  const run = harness();
  assert.equal(run.requests.length, 0);
  await settle();
  assert.equal(run.guardCalls(), 1);
  assert.equal(run.requests.length, 1);
  assert.equal(run.requests[0].route, "/api/admin/launch-readiness");
  assert.equal(run.requests[0].options.headers, undefined, "the board does not build a second Authorization header");
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
    assert.match(run.elements.get("#bootstrap-status").innerHTML, new RegExp(`Readiness HTTP status<\\/dt><dd>${status}`));
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

test("routing diagnostics prove the protected request resolves from frontend to backend", async () => {
  const run = harness(); await settle(); const proof = run.elements.get("#bootstrap-status").innerHTML;
  assert.match(proof, /Readiness request route<\/dt><dd>\/api\/admin\/launch-readiness/);
  assert.match(proof, /Resolved readiness origin<\/dt><dd>https:\/\/api\.example\.test/);
  assert.match(proof, /Resolved readiness URL<\/dt><dd>https:\/\/api\.example\.test\/api\/admin\/launch-readiness/);
  assert.match(proof, /Frontend origin<\/dt><dd>https:\/\/example\.test/);
  assert.match(proof, /Cross-origin request<\/dt><dd>YES/);
  assert.match(proof, /Readiness backend reached<\/dt><dd>YES/);
});

test("launch and avatar shells select distinct board arrays", async () => {
  const launchRun = harness({ defaultBoard: "launch" }); await settle();
  assert.match(launchRun.board.innerHTML, /Launch-only card/);
  assert.doesNotMatch(launchRun.board.innerHTML, /Card 0/);
  launchRun.listeners.click({ target: { closest: selector => selector === "[data-board]" ? { dataset: { board: "avatar" } } : null } });
  assert.match(launchRun.board.innerHTML, /Card 0/);
  assert.doesNotMatch(launchRun.board.innerHTML, /Launch-only card/);
  const avatarRun = harness({ defaultBoard: "avatar" }); await settle();
  assert.match(avatarRun.board.innerHTML, /Card 0/);
});

test("GET and PATCH are owned by the canonical client rather than raw same-origin fetch", () => {
  const source = read("public/admin-launch-readiness.js");
  assert.match(source, /global\.MaatApiClient\.request\(path, options\)/);
  assert.match(source, /request\(`\/api\/admin\/launch-readiness\/\$\{form\.board\.value\}\/\$\{form\.id\.value\}`/);
  assert.doesNotMatch(source, /global\.fetch|fetch\(/);
});

test("every global navigation document target is a frontend static asset", () => {
  const source = read("public/global-nav.js"), hrefs = [...source.matchAll(/href:"([^"#]+)(?:#[^"]*)?"/g)].map(match => match[1]);
  for (const href of hrefs) assert.ok(fs.existsSync(path.join(__dirname, "../public", href.replace(/^\//, ""))), `${href} must exist on the static frontend host`);
  assert.match(source, /label:"Client Management",href:"\/admin-members\.html"/);
});
