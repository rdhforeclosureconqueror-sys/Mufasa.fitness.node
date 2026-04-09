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
