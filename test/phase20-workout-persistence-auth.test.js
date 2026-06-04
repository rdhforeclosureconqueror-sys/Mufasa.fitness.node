"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { createSessionWriteClient } = require("../public/session-write.js");

const repoRoot = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

function createOkResponse(status = 200, data = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ ok: true, data }) };
}

function makeClient(fetchCalls, tokenInfo = { token: "canonical-token", source: "AuthStateRuntime.getCanonicalAuthState" }) {
  return createSessionWriteClient({
    baseUrl: "https://mufasa-fitness-node.onrender.com",
    commandUrl: "https://mufasa-fitness-node.onrender.com/command",
    getUserId: () => "phase20_user",
    getAuthToken: () => tokenInfo.token,
    getAuthTokenInfo: () => tokenInfo,
    repDebounceMs: 1,
    logger: { log() {}, warn() {}, error() {} }
  });
}

test("Phase 20 session create, reps, and complete use the same canonical current token", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options, body: JSON.parse(options.body || "{}") });
    if (String(url).endsWith("/api/sessions")) return createOkResponse(201, { sessionId: "sess_phase20" });
    if (String(url).endsWith("/reps")) return createOkResponse(200, { saved: true });
    if (String(url).endsWith("/complete")) return createOkResponse(200, { completed: true });
    return createOkResponse(200, {});
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = makeClient(calls);
  await client.startSession({ exerciseId: "bodyweight_squat" });
  client.enqueueRepUpdate({ sessionId: "sess_phase20", exerciseId: "bodyweight_squat", repsThisSet: 1, totalReps: 1 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  await client.completeSession("sess_phase20", { workoutId: "phase20_workout" });

  const sessionWriteCalls = calls.filter((call) => String(call.url).includes("/api/sessions"));
  assert.equal(sessionWriteCalls.length, 3);
  for (const call of sessionWriteCalls) {
    assert.equal(call.options.headers.authorization, "Bearer canonical-token");
    assert.equal(call.options.headers.Authorization, "Bearer canonical-token");
  }
  assert.deepEqual(sessionWriteCalls.map((call) => call.url), [
    "https://mufasa-fitness-node.onrender.com/api/sessions",
    "https://mufasa-fitness-node.onrender.com/api/sessions/sess_phase20/reps",
    "https://mufasa-fitness-node.onrender.com/api/sessions/sess_phase20/complete"
  ]);
  assert.equal(client.getPersistenceDiagnosticsSnapshot().tokenSourceUsed, "AuthStateRuntime.getCanonicalAuthState");
});

test("Phase 20 APP_AUTH/AuthStateRuntime token wins over stale localStorage token in session writes and reads", () => {
  const indexHtml = read("public/workout.html");
  const backendRead = read("public/backend-read.js");

  assert.match(indexHtml, /function getAuthTokenInfo\(\)[\s\S]*AuthStateRuntime\?\.getCanonicalAuthState/);
  assert.match(indexHtml, /source: "AuthStateRuntime\.getCanonicalAuthState"/);
  assert.match(indexHtml, /source: "AuthStateRuntime\.getAuthToken"/);
  assert.match(indexHtml, /source: "window\.APP_AUTH\.token"/);
  assert.match(indexHtml, /source: "localStorage\.maatAuthToken"/);
  assert.ok(indexHtml.indexOf("AuthStateRuntime?.getCanonicalAuthState") < indexHtml.indexOf("localStorage.getItem(\"maatAuthToken\")"));

  assert.match(backendRead, /function getAuthTokenInfo\(\)[\s\S]*AuthStateRuntime\?\.getCanonicalAuthState/);
  assert.ok(backendRead.indexOf("AuthStateRuntime?.getCanonicalAuthState") < backendRead.indexOf("localStorage.getItem(\"maatAuthToken\")"));
});

test("Phase 20 401 invalid_token shows session expired message and does not expose token value", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  const elements = new Map([
    ["poseStatus", { textContent: "" }],
    ["brainStatus", { textContent: "" }]
  ]);
  const events = [];
  global.window = {
    document: { getElementById: (id) => elements.get(id) || null },
    dispatchEvent: (event) => { events.push(event); }
  };
  global.CustomEvent = function CustomEvent(type, init = {}) { return { type, detail: init.detail }; };
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options, body: JSON.parse(options.body || "{}") });
    return {
      ok: false,
      status: 401,
      headers: { get: (name) => /www-authenticate/i.test(name) ? 'Bearer realm="mufasa", error="invalid_token"' : null },
      json: async () => ({ ok: false, error: { code: "invalid_token", message: "invalid token" } })
    };
  };
  t.after(() => { global.fetch = originalFetch; global.window = originalWindow; delete global.CustomEvent; });

  const client = makeClient(calls, { token: "secret-current-token", source: "window.APP_AUTH.token" });
  await assert.rejects(() => client.startSession({ exerciseId: "bodyweight_squat" }), /unauthorized/);

  assert.equal(elements.get("poseStatus").textContent, "Session expired. Please log in again.");
  assert.equal(elements.get("brainStatus").textContent, "Session expired. Please log in again.");
  assert.equal(events.some((event) => event.type === "mufasa:session-auth-expired" && event.detail.errorCode === "invalid_token"), true);
  assert.equal(client.getPersistenceDiagnosticsSnapshot().tokenSourceUsed, "window.APP_AUTH.token");
  assert.doesNotMatch(JSON.stringify(client.getPersistenceDiagnosticsSnapshot()), /secret-current-token/);
  assert.doesNotMatch(JSON.stringify(events), /secret-current-token/);
});

test("Phase 20 session persistence diagnostics expose safe fields only", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => createOkResponse(201, { sessionId: "sess_diag" });
  t.after(() => { global.fetch = originalFetch; });

  const client = makeClient([], { token: "diagnostic-secret-token", source: "AuthStateRuntime.getAuthToken" });
  await client.startSession({ exerciseId: "bodyweight_squat" });
  const diagnostics = client.getPersistenceDiagnosticsSnapshot();

  for (const field of [
    "sessionCreateAttempted",
    "sessionCreateSucceeded",
    "repPersistAttempted",
    "repPersistSucceeded",
    "repPersistFailed",
    "repPersistStatus",
    "repPersistErrorCode",
    "tokenSourceUsed"
  ]) {
    assert.ok(Object.hasOwn(diagnostics, field), `${field} should be present`);
  }
  assert.equal(diagnostics.sessionCreateAttempted, true);
  assert.equal(diagnostics.sessionCreateSucceeded, true);
  assert.equal(diagnostics.tokenSourceUsed, "AuthStateRuntime.getAuthToken");
  assert.doesNotMatch(JSON.stringify(diagnostics), /diagnostic-secret-token/);
});

test("Phase 20 active public shell has no unguarded toSafeUserId reference", () => {
  const indexHtml = read("public/workout.html");
  assert.doesNotMatch(indexHtml, /\btoSafeUserId,\s*\n/);
  assert.match(indexHtml, /toSafeUserId: safeUserIdFrom/);
  assert.match(indexHtml, /function safeUserIdFrom\(value\)/);
});
