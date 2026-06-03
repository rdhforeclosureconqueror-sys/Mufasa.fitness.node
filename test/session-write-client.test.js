"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSessionWriteClient } = require("../public/session-write.js");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("rep updates prefer explicit session API and are debounced to latest payload", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url, body: JSON.parse(init.body || "{}") });
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, data: {} }; }
    };
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "pilot_user",
    getAuthToken: () => "token_abc",
    repDebounceMs: 25,
    logger: { warn() {} }
  });

  client.enqueueRepUpdate({ sessionId: "sess_1", totalReps: 1, repsThisSet: 1, depthScore: 0.6 });
  client.enqueueRepUpdate({ sessionId: "sess_1", totalReps: 2, repsThisSet: 2, depthScore: 0.7 });
  client.enqueueRepUpdate({ sessionId: "sess_1", totalReps: 3, repsThisSet: 3, depthScore: 0.8 });

  await delay(70);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://node/api/sessions/sess_1/reps");
  assert.equal(calls[0].body.totalReps, 3);
});

test("rep updates fall back to legacy /command when explicit API is unavailable", async (t) => {
  const calls = [];
  let fallbackNotice = null;
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url, body: JSON.parse(init.body || "{}") });
    if (url.includes("/api/sessions/")) {
      return {
        ok: false,
        status: 401,
        async json() { return { ok: false, error: { message: "unauthorized" } }; }
      };
    }
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true }; }
    };
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "legacy_user",
    getAuthToken: () => "token_abc",
    repDebounceMs: 10,
    onFallbackUsed: (notice) => { fallbackNotice = notice; },
    logger: { warn() {} }
  });

  client.enqueueRepUpdate({
    sessionId: "sess_fallback",
    repsThisSet: 4,
    totalReps: 4,
    depthScore: 0.72,
    exerciseId: "bodyweight_squat"
  });

  await delay(50);

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://node/api/sessions/sess_fallback/reps");
  assert.equal(calls[1].url, "http://node/command");
  assert.equal(calls[1].body.command, "fitness.repUpdate");
  assert.equal(calls[1].body.userId, "legacy_user");
  assert.equal(calls[1].body.payload._fallback.reason, "unauthorized");
  assert.equal(client.getObservabilitySnapshot().fallbackToLegacy.rep_update, 1);
  assert.equal(client.getObservabilitySnapshot().lastFallback.reason, "unauthorized");
  assert.equal(fallbackNotice.action, "rep_update");
  assert.equal(fallbackNotice.reason, "unauthorized");
});

test("write observability tracks explicit writes and mode state", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() { return { ok: true, data: {} }; }
  });
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "obs_user",
    getAuthToken: () => "token_abc",
    logger: { warn() {} }
  });

  await client.startSession({ sessionId: "obs_sess" });
  const snapshot = client.getObservabilitySnapshot();
  assert.equal(snapshot.explicitSuccess.session_start, 1);
  assert.equal(client.getWriteModeStatus().mode, "explicit_api");
});

test("fallback reason classifier captures common categories", () => {
  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "obs_user",
    getAuthToken: () => null,
    logger: { warn() {} }
  });

  assert.equal(client._classifyFallbackReasonForTests({ code: "MISSING_AUTH_TOKEN" }), "missing_auth_token");
  assert.equal(client._classifyFallbackReasonForTests({ code: "UNAUTHORIZED" }), "unauthorized");
  assert.equal(client._classifyFallbackReasonForTests({ code: "REQUEST_FAILED", status: 503 }), "explicit_api_5xx");
});

test("blocked legacy fallback reports a clear frontend callback without silent failure", async (t) => {
  const calls = [];
  let blockedNotice = null;
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url, body: JSON.parse(init.body || "{}") });
    if (url.includes("/api/sessions/")) {
      return {
        ok: false,
        status: 401,
        async json() { return { ok: false, error: { message: "unauthorized" } }; }
      };
    }
    return {
      ok: false,
      status: 409,
      async json() {
        return { ok: false, error: { code: "LEGACY_FALLBACK_BLOCKED", message: "blocked_by_policy" } };
      }
    };
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "legacy_user",
    getAuthToken: () => "token_abc",
    repDebounceMs: 10,
    onFallbackBlocked: (evt) => { blockedNotice = evt; },
    logger: { warn() {} }
  });

  client.enqueueRepUpdate({ sessionId: "blocked_sess", totalReps: 5 });
  await delay(50);

  assert.equal(calls.length, 2);
  assert.equal(blockedNotice.action, "rep_update");
  assert.equal(blockedNotice.errorCode, "LEGACY_FALLBACK_BLOCKED");
  assert.equal(client.getObservabilitySnapshot().blockedFallback.rep_update, 1);
});


test("session complete blocked fallback provides non-invasive notice and status metadata", async (t) => {
  let notice = null;
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes("/complete")) {
      return {
        ok: false,
        status: 503,
        async json() { return { ok: false, error: { message: "server_down" } }; }
      };
    }
    return {
      ok: false,
      status: 409,
      async json() {
        return { ok: false, error: { code: "LEGACY_FALLBACK_BLOCKED", message: "blocked_by_policy" } };
      }
    };
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "legacy_user",
    getAuthToken: () => "token_abc",
    onFallbackBlocked: (evt) => { notice = evt; },
    logger: { warn() {} }
  });

  await client.completeSession("sess_blocked", { repsCompleted: 11 });

  assert.equal(notice.action, "session_complete");
  assert.equal(notice.adminAccessUnaffected, true);
  const status = client.getWriteModeStatus();
  assert.equal(status.blockedTotal, 1);
  assert.equal(status.lastBlockedFallback.action, "session_complete");
});

test("legacy fallback can require explicit actions via client config gate", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url, body: JSON.parse(init.body || "{}") });
    return {
      ok: false,
      status: 503,
      async json() { return { ok: false, error: { message: "service_unavailable" } }; }
    };
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "pilot_gate",
    getAuthToken: () => "token_abc",
    legacyFallbackRequireExplicitActions: true,
    legacyFallbackAllowedActions: ["session_complete"],
    logger: { warn() {} }
  });

  await assert.rejects(
    client.startSession({ sessionId: "sess_gate_1" }),
    (err) => err?.code === "LEGACY_FALLBACK_REQUIRES_EXPLICIT_ACTION"
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://node/api/sessions");
});

test("session create, reps, and complete use the same canonical token resolver", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalAuthRuntime = globalThis.AuthStateRuntime;
  const originalAppAuth = globalThis.APP_AUTH;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.AuthStateRuntime = {
    getCanonicalAuthState: () => ({ token: "canonical-token" }),
    getAuthToken: () => "runtime-token"
  };
  globalThis.APP_AUTH = { token: "app-token" };
  globalThis.localStorage = { getItem: () => "stored-token" };
  global.fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers || {}, body: JSON.parse(init.body || "{}") });
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, data: {} }; }
    };
  };
  t.after(() => {
    global.fetch = originalFetch;
    globalThis.AuthStateRuntime = originalAuthRuntime;
    globalThis.APP_AUTH = originalAppAuth;
    globalThis.localStorage = originalLocalStorage;
  });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "pilot_user",
    getAuthTokenInfo: () => ({ token: "injected-token", source: "injected" }),
    repDebounceMs: 10,
    logger: { log() {}, warn() {}, error() {} }
  });

  await client.startSession({ sessionId: "sess_shared" });
  client.enqueueRepUpdate({ sessionId: "sess_shared", totalReps: 7, repsThisSet: 7 });
  await delay(40);
  await client.completeSession("sess_shared", { repsCompleted: 7 });

  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.url), [
    "http://node/api/sessions",
    "http://node/api/sessions/sess_shared/reps",
    "http://node/api/sessions/sess_shared/complete"
  ]);
  assert.ok(calls.every((call) => call.headers.Authorization === "Bearer canonical-token"));
  const diagnostics = client.getPersistenceDiagnosticsSnapshot();
  assert.equal(diagnostics.sessionCreateTokenSource, "AuthStateRuntime.getCanonicalAuthState");
  assert.equal(diagnostics.repPersistTokenSource, "AuthStateRuntime.getCanonicalAuthState");
  assert.equal(diagnostics.completeTokenSource, "AuthStateRuntime.getCanonicalAuthState");
});

test("APP_AUTH token wins over stale localStorage token when AuthStateRuntime is unavailable", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalAuthRuntime = globalThis.AuthStateRuntime;
  const originalAppAuth = globalThis.APP_AUTH;
  const originalLocalStorage = globalThis.localStorage;

  delete globalThis.AuthStateRuntime;
  globalThis.APP_AUTH = { token: "fresh-app-token" };
  globalThis.localStorage = { getItem: (key) => key === "maatAuthToken" ? "stale-storage-token" : null };
  global.fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers || {} });
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, data: {} }; }
    };
  };
  t.after(() => {
    global.fetch = originalFetch;
    globalThis.AuthStateRuntime = originalAuthRuntime;
    globalThis.APP_AUTH = originalAppAuth;
    globalThis.localStorage = originalLocalStorage;
  });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "pilot_user",
    getAuthToken: () => "injected-token",
    repDebounceMs: 10,
    logger: { warn() {} }
  });

  await client.startSession({ sessionId: "sess_app_auth" });
  client.enqueueRepUpdate({ sessionId: "sess_app_auth", totalReps: 2 });
  await delay(40);

  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.headers.Authorization === "Bearer fresh-app-token"));
  assert.equal(client.getPersistenceDiagnosticsSnapshot().repPersistTokenSource, "window.APP_AUTH.token");
});

test("create success plus reps invalid_token shows warning and does not trigger legacy fallback", async (t) => {
  const calls = [];
  const warnings = [];
  const originalFetch = global.fetch;
  const originalAuthRuntime = globalThis.AuthStateRuntime;

  globalThis.AuthStateRuntime = {
    getCanonicalAuthState: () => ({ token: "canonical-token" }),
    getAuthToken: () => "canonical-token"
  };
  global.fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers || {}, bodyText: init.body || "" });
    if (url.endsWith("/reps")) {
      return {
        ok: false,
        status: 401,
        headers: { get: (name) => /www-authenticate/i.test(name) ? 'Bearer error="invalid_token"' : null },
        async json() { return { ok: false, error: { message: "unauthorized" } }; }
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      async json() { return { ok: true, data: {} }; }
    };
  };
  t.after(() => {
    global.fetch = originalFetch;
    globalThis.AuthStateRuntime = originalAuthRuntime;
  });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "pilot_user",
    repDebounceMs: 10,
    onFallbackUsed: (notice) => warnings.push(notice),
    logger: { warn(message) { warnings.push(message); }, log() {}, error() {} }
  });

  await client.startSession({ sessionId: "sess_invalid" });
  client.enqueueRepUpdate({ sessionId: "sess_invalid", totalReps: 3 });
  await delay(40);

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://node/api/sessions");
  assert.equal(calls[1].url, "http://node/api/sessions/sess_invalid/reps");
  assert.ok(!calls.some((call) => call.url === "http://node/command"));
  assert.equal(client.getObservabilitySnapshot().fallbackToLegacy.rep_update, 0);
  const diagnostics = client.getPersistenceDiagnosticsSnapshot();
  assert.equal(diagnostics.repPersistStatus, 401);
  assert.equal(diagnostics.repPersistErrorCode, "invalid_token");
  assert.equal(diagnostics.repPersistAuthHeaderPresent, true);
  assert.equal(diagnostics.lastPersistenceMessage, "Workout started, but reps are not saving. Please log in again.");
  assert.ok(warnings.includes("Workout started, but reps are not saving. Please log in again."));
});

test("session persistence diagnostics never display token values", async (t) => {
  const originalFetch = global.fetch;
  const originalAuthRuntime = globalThis.AuthStateRuntime;
  const secretToken = "secret-token-that-must-not-display";

  globalThis.AuthStateRuntime = {
    getCanonicalAuthState: () => ({ token: secretToken }),
    getAuthToken: () => secretToken
  };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    async json() { return { ok: true, data: {} }; }
  });
  t.after(() => {
    global.fetch = originalFetch;
    globalThis.AuthStateRuntime = originalAuthRuntime;
  });

  const client = createSessionWriteClient({
    baseUrl: "http://node",
    commandUrl: "http://node/command",
    getUserId: () => "pilot_user",
    repDebounceMs: 10,
    logger: { warn() {} }
  });

  await client.startSession({ sessionId: "sess_no_token_display" });
  client.enqueueRepUpdate({ sessionId: "sess_no_token_display", totalReps: 1 });
  await delay(40);

  const serializedDiagnostics = JSON.stringify(client.getPersistenceDiagnosticsSnapshot());
  assert.ok(!serializedDiagnostics.includes(secretToken));
  assert.ok(serializedDiagnostics.includes("AuthStateRuntime.getCanonicalAuthState"));
});

test("Phase 24 pilot form-rule engine remains present", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const workoutRuntime = fs.readFileSync(path.join(__dirname, "../public/workout-runtime.js"), "utf8");
  const phase24Test = fs.readFileSync(path.join(__dirname, "phase24-pilot-form-rule-engine.test.js"), "utf8");

  assert.match(workoutRuntime, /Phase 24: minimal pilot form-rule engine/);
  assert.match(workoutRuntime, /pushup/);
  assert.match(workoutRuntime, /lunge/);
  assert.match(phase24Test, /deep squat keypoints produce depth good/);
});
