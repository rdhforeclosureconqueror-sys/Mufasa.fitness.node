"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp, parseActionEnforcementFromEnv } = require("../server");

async function withServer(t, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-node-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const app = createApp({ rootDir: tmpRoot });
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(() => server.close());

  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return fn({ baseUrl, tmpRoot });
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "GET",
    headers
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

async function put(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

async function authBridge(baseUrl, payload) {
  const { res, json } = await post(baseUrl, "/api/auth/bridge", payload);
  assert.equal(res.status, 201);
  assert.equal(json.ok, true);
  return json.data.auth.token;
}

test("POST /api/sessions starts a session and persists it", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const { res, json } = await post(baseUrl, "/api/sessions", {
      userId: "pilot_user",
      sessionId: "sess_123",
      programId: "prog_1",
      exerciseId: "bodyweight_squat"
    }, { "x-request-id": "req-start-1" });

    assert.equal(res.status, 201);
    assert.equal(json.ok, true);
    assert.equal(json.error, null);
    assert.equal(json.requestId, "req-start-1");
    assert.equal(json.data.sessionId, "sess_123");

    const userPath = path.join(tmpRoot, "data", "users", "pilot_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.ok(user.sessions.sess_123);
    assert.equal(user.sessions.sess_123.programId, "prog_1");
    assert.equal(user.events.at(-1).command, "fitness.startSession");
  });
});

test("authenticated session writes derive user identity from auth when body userId is omitted", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authBridge(baseUrl, { userId: "auth_owned_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    const { res: startRes } = await post(baseUrl, "/api/sessions", {
      sessionId: "auth_sess_1",
      exerciseId: "bodyweight_squat"
    }, authHeader);
    assert.equal(startRes.status, 201);

    const { res: completeRes } = await post(baseUrl, "/api/sessions/auth_sess_1/complete", {
      repsCompleted: 9
    }, authHeader);
    assert.equal(completeRes.status, 200);

    const userPath = path.join(tmpRoot, "data", "users", "auth_owned_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.ok(user.sessions.auth_sess_1);
    assert.equal(user.sessions.auth_sess_1.summary.repsCompleted, 9);
  });
});

test("authenticated session writes reject mismatched request-body userId", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authBridge(baseUrl, { userId: "auth_guard_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    const { res, json } = await post(baseUrl, "/api/sessions", {
      userId: "spoofed_user",
      sessionId: "spoof_sess_1"
    }, authHeader);

    assert.equal(res.status, 403);
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "FORBIDDEN");
  });
});


test("authenticated rep writes derive user identity from auth when body userId is omitted", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authBridge(baseUrl, { userId: "rep_auth_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    await post(baseUrl, "/api/sessions", {
      sessionId: "rep_auth_sess",
      exerciseId: "bodyweight_squat"
    }, authHeader);

    const { res } = await post(baseUrl, "/api/sessions/rep_auth_sess/reps", {
      repsThisSet: 3,
      totalReps: 3,
      depthScore: 0.62,
      goodForm: true
    }, authHeader);

    assert.equal(res.status, 200);

    const userPath = path.join(tmpRoot, "data", "users", "rep_auth_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.equal(user.sessions.rep_auth_sess.repUpdates.length, 1);
    assert.equal(user.events.at(-1).command, "fitness.repUpdate");
  });
});

test("authenticated rep writes reject mismatched request-body userId", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authBridge(baseUrl, { userId: "rep_guard_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    await post(baseUrl, "/api/sessions", {
      sessionId: "rep_guard_sess",
      exerciseId: "bodyweight_squat"
    }, authHeader);

    const { res, json } = await post(baseUrl, "/api/sessions/rep_guard_sess/reps", {
      userId: "spoofed_rep_user",
      repsThisSet: 2,
      totalReps: 2,
      depthScore: 0.55
    }, authHeader);

    assert.equal(res.status, 403);
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "FORBIDDEN");
  });
});

test("POST /api/sessions/:id/reps appends rep update", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    await post(baseUrl, "/api/sessions", {
      userId: "pilot_user",
      sessionId: "sess_abc",
      exerciseId: "bodyweight_squat"
    });

    const { res, json } = await post(baseUrl, "/api/sessions/sess_abc/reps", {
      userId: "pilot_user",
      exerciseId: "bodyweight_squat",
      repsThisSet: 7,
      totalReps: 21,
      depthScore: 0.81,
      goodForm: true
    });

    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.repUpdatesCount, 1);

    const userPath = path.join(tmpRoot, "data", "users", "pilot_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.equal(user.sessions.sess_abc.repUpdates.length, 1);
    assert.equal(user.events.at(-1).command, "fitness.repUpdate");
  });
});

test("POST /api/sessions/:id/complete ends session", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    await post(baseUrl, "/api/sessions", {
      userId: "pilot_user",
      sessionId: "sess_done",
      exerciseId: "bodyweight_squat"
    });

    const { res, json } = await post(baseUrl, "/api/sessions/sess_done/complete", {
      userId: "pilot_user",
      repsCompleted: 30,
      exerciseId: "bodyweight_squat"
    });

    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.summary.repsCompleted, 30);

    const userPath = path.join(tmpRoot, "data", "users", "pilot_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.ok(user.sessions.sess_done.endedAt);
    assert.equal(user.events.at(-1).command, "fitness.endSession");
  });
});

test("validation failures return normalized error envelope", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const { res, json } = await post(baseUrl, "/api/sessions", {
      sessionId: "missing_user"
    });

    assert.equal(res.status, 400);
    assert.equal(json.ok, false);
    assert.equal(json.data, null);
    assert.equal(json.error.code, "VALIDATION_ERROR");
    assert.ok(json.requestId);
  });
});

test("legacy /command adapter for session command uses shared logic and deprecation headers", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const { res: r1, json: j1 } = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.startSession",
      userId: "legacy_user",
      payload: {
        sessionId: "legacy_sess",
        exerciseId: "bodyweight_squat"
      }
    });

    assert.equal(r1.status, 200);
    assert.equal(j1.ok, true);
    assert.equal(j1.data.legacy, true);
    assert.equal(r1.headers.get("x-api-deprecated"), "true");

    const { res: r2, json: j2 } = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.repUpdate",
      userId: "legacy_user",
      payload: {
        sessionId: "legacy_sess",
        repsThisSet: 5,
        totalReps: 5,
        depthScore: 0.7,
        goodForm: true
      }
    });

    assert.equal(r2.status, 200);
    assert.equal(j2.ok, true);

    const userPath = path.join(tmpRoot, "data", "users", "legacy_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.equal(user.sessions.legacy_sess.repUpdates.length, 1);
    assert.equal(user.events.filter(e => e.command === "fitness.startSession").length, 1);
    assert.equal(user.events.filter(e => e.command === "fitness.repUpdate").length, 1);
  });
});

test("auth-protected /api/me/profile rejects missing token", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const { res, json } = await get(baseUrl, "/api/me/profile");
    assert.equal(res.status, 401);
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "UNAUTHENTICATED");
  });
});

test("write observability endpoint reports explicit and legacy write usage", async (t) => {
  const prevSuper = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "obs_admin";
  t.after(() => {
    if (prevSuper == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevSuper;
  });

  await withServer(t, async ({ baseUrl }) => {
    await post(baseUrl, "/api/sessions", {
      userId: "obs_user",
      sessionId: "obs_sess_1"
    });

    await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.endSession",
      userId: "obs_user",
      payload: {
        sessionId: "obs_sess_1",
        repsCompleted: 5,
        _fallback: { reason: "unauthorized" }
      }
    });

    const adminToken = await authBridge(baseUrl, { userId: "obs_admin" });
    const { res, json } = await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${adminToken}` });
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.writes.explicit.success.session_start, 1);
    assert.equal(json.writes.enforcement.blocked.byAction.session_complete, 1);
    assert.equal(json.writes.enforcement.blocked.total, 1);
  });
});

test("legacy fallback can be disabled by config", async (t) => {
  const prev = process.env.LEGACY_FALLBACK_ENABLED;
  process.env.LEGACY_FALLBACK_ENABLED = "false";
  t.after(() => {
    if (prev == null) delete process.env.LEGACY_FALLBACK_ENABLED;
    else process.env.LEGACY_FALLBACK_ENABLED = prev;
  });

  await withServer(t, async ({ baseUrl }) => {
    const { res, json } = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.startSession",
      userId: "legacy_disabled_user",
      payload: { sessionId: "legacy_disabled_sess" }
    });
    assert.equal(res.status, 503);
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "LEGACY_FALLBACK_DISABLED");
  });
});

test("action-level fallback enforcement config parser supports list and per-action overrides", () => {
  const parsed = parseActionEnforcementFromEnv({
    LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: "session_complete, profile",
    LEGACY_FALLBACK_REQUIRE_EXPLICIT_PROFILE: "false",
    LEGACY_FALLBACK_REQUIRE_EXPLICIT_OHSA: "true"
  });

  assert.equal(parsed.enabledByAction.session_complete, true);
  assert.equal(parsed.enabledByAction.profile, false);
  assert.equal(parsed.enabledByAction.ohsa, true);
  assert.equal(parsed.enabledByAction.rep_update, false);
  assert.deepEqual(parsed.enforcedActions.sort(), ["ohsa", "session_complete"]);
});

test("action-level fallback enforcement parser supports boolean all-actions gate", () => {
  const parsed = parseActionEnforcementFromEnv({
    LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: "true"
  });
  assert.equal(parsed.enforcedActions.length > 0, true);
  assert.equal(parsed.enforcedActions.length, Object.keys(parsed.enabledByAction).length);
  for (const action of Object.keys(parsed.enabledByAction)) {
    assert.equal(parsed.enabledByAction[action], true);
  }
});

test("legacy /command fallback can be blocked per action while others stay compatible", async (t) => {
  const prev = process.env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS;
  const prevSuper = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  process.env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS = "session_complete";
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "enforce_admin";
  t.after(() => {
    if (prev == null) delete process.env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS;
    else process.env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS = prev;
    if (prevSuper == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevSuper;
  });

  await withServer(t, async ({ baseUrl }) => {
    const start = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.startSession",
      userId: "enforce_user",
      payload: { sessionId: "enforce_sess_1" }
    });
    assert.equal(start.res.status, 200);

    const blocked = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.endSession",
      userId: "enforce_user",
      payload: { sessionId: "enforce_sess_1", repsCompleted: 10 }
    });
    assert.equal(blocked.res.status, 409);
    assert.equal(blocked.json.error.code, "LEGACY_FALLBACK_BLOCKED");

    const adminToken = await authBridge(baseUrl, { userId: "enforce_admin" });
    const { json: obs } = await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${adminToken}` });
    assert.equal(obs.actionFallbackEnforcement.effective.enabledByAction.session_complete, true);
    assert.equal(obs.writes.enforcement.blocked.byAction.session_complete, 1);
    assert.equal(obs.writes.legacyFallback.byAction.session_start, 1);
    assert.equal(obs.writes.legacyFallback.byAction.session_complete, 0);
  });
});

test("profile read/write works with auth context ownership", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authBridge(baseUrl, { userId: "pilot_profile_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    const { res: putRes, json: putJson } = await put(baseUrl, "/api/me/profile", {
      profile: {
        age: 34,
        height_cm: 176,
        weight_kg: 82,
        goals: { primary_goal: "fat_loss", frequency_days_per_week: 4 },
        injuries: ["left knee"],
        notes: "Pilot athlete"
      }
    }, authHeader);

    assert.equal(putRes.status, 200);
    assert.equal(putJson.ok, true);
    assert.equal(putJson.data.profile.age, 34);

    const { res: getRes, json: getJson } = await get(baseUrl, "/api/me/profile", authHeader);
    assert.equal(getRes.status, 200);
    assert.equal(getJson.data.profile.goals.primary_goal, "fat_loss");

    const userPath = path.join(tmpRoot, "data", "users", "pilot_profile_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.equal(user.profile.weight_kg, 82);
    assert.equal(user.events.at(-1).command, "fitness.saveProfile");
  });
});

test("OHSA submission and me history endpoint are auth protected and persisted", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authBridge(baseUrl, { userId: "pilot_ohsa_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    await post(baseUrl, "/api/sessions", {
      sessionId: "sess_hist_1"
    }, authHeader);

    await post(baseUrl, "/api/sessions/sess_hist_1/complete", {
      repsCompleted: 12
    }, authHeader);

    const { res: ohsaPostRes, json: ohsaPostJson } = await post(baseUrl, "/api/ohsa", {
      source: "frontend",
      summary: {
        score: 70,
        riskLevel: "moderate",
        recommendations: ["mobility work", "single-leg balance"]
      }
    }, authHeader);

    assert.equal(ohsaPostRes.status, 201);
    assert.equal(ohsaPostJson.ok, true);
    assert.equal(ohsaPostJson.data.latest.riskLevel, "moderate");

    const { res: ohsaGetRes, json: ohsaGetJson } = await get(baseUrl, "/api/me/ohsa", authHeader);
    assert.equal(ohsaGetRes.status, 200);
    assert.equal(ohsaGetJson.data.count, 1);

    const { res: histRes, json: histJson } = await get(baseUrl, "/api/me/history", authHeader);
    assert.equal(histRes.status, 200);
    assert.equal(histJson.data.completedSessions.length, 1);
    assert.equal(histJson.data.completedSessions[0].repsCompleted, 12);
    assert.ok(histJson.data.recentActivity.length >= 2);
    assert.equal(histJson.data.summary.totalCompletedSessions, 1);
    assert.ok(Array.isArray(histJson.data.ohsaHistory));
  });
});

test("/api/avatar/upload rejects fake glb headers and accepts valid glb magic header", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authBridge(baseUrl, { userId: "avatar_magic_user" });

    const badForm = new FormData();
    badForm.append("avatar", new Blob([Buffer.from("NOT_GLB_CONTENT", "utf8")]), "avatar.glb");
    const badRes = await fetch(baseUrl + "/api/avatar/upload", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: badForm
    });
    const badJson = await badRes.json();
    assert.equal(badRes.status, 400);
    assert.equal(badJson.ok, false);
    assert.equal(badJson.error.code, "VALIDATION_ERROR");

    const validGlbBytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00]);
    const goodForm = new FormData();
    goodForm.append("avatar", new Blob([validGlbBytes]), "avatar.glb");
    const goodRes = await fetch(baseUrl + "/api/avatar/upload", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: goodForm
    });
    const goodJson = await goodRes.json();
    assert.equal(goodRes.status, 201);
    assert.equal(goodJson.ok, true);
    assert.match(goodJson.data.avatarModelUrl, /\/uploads\/avatars\/.+\.glb$/);
  });
});

test("legacy /command profile and ohsa actions remain compatible with stricter validation", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const { res: profileRes, json: profileJson } = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.saveProfile",
      userId: "legacy_profile_user",
      payload: {
        profile: {
          age: 45,
          injuries: ["shoulder"]
        }
      }
    });

    assert.equal(profileRes.status, 200);
    assert.equal(profileJson.ok, true);

    const { res: ohsaRes, json: ohsaJson } = await post(baseUrl, "/command", {
      domain: "fitness",
      command: "fitness.ohsaResult",
      userId: "legacy_profile_user",
      payload: {
        summary: {
          score: 82,
          riskLevel: "low",
          recommendations: ["continue progressive loading"]
        }
      }
    });
    assert.equal(ohsaRes.status, 200);
    assert.equal(ohsaJson.ok, true);

    const userPath = path.join(tmpRoot, "data", "users", "legacy_profile_user.json");
    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.equal(user.profile.age, 45);
    assert.equal(user.ohsa.length, 1);
    assert.equal(user.events.filter(e => e.command === "fitness.saveProfile").length, 1);
    assert.equal(user.events.filter(e => e.command === "fitness.ohsaResult").length, 1);
  });
});

test("profile/session/OHSA writes are non-destructive to unrelated user fields", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authBridge(baseUrl, { userId: "safe_write_user" });
    const authHeader = { authorization: `Bearer ${token}` };
    const userPath = path.join(tmpRoot, "data", "users", "safe_write_user.json");

    fs.mkdirSync(path.dirname(userPath), { recursive: true });
    fs.writeFileSync(userPath, JSON.stringify({
      userId: "safe_write_user",
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
      customFlags: { pilotTier: "alpha", keepMe: true },
      preferences: { units: "imperial" },
      events: [],
      sessions: {}
    }, null, 2));

    await put(baseUrl, "/api/me/profile", {
      profile: { age: 29, height_cm: 178, weight_kg: 74, injuries: [] }
    }, authHeader);

    await post(baseUrl, "/api/sessions", { sessionId: "safe_sess_1" }, authHeader);
    await post(baseUrl, "/api/sessions/safe_sess_1/complete", { repsCompleted: 16 }, authHeader);
    await post(baseUrl, "/api/ohsa", {
      summary: { score: 77, riskLevel: "low", recommendations: ["stay active"] }
    }, authHeader);

    const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
    assert.deepEqual(user.customFlags, { pilotTier: "alpha", keepMe: true });
    assert.deepEqual(user.preferences, { units: "imperial" });
    assert.equal(user.profile.age, 29);
    assert.equal(user.sessions.safe_sess_1.summary.repsCompleted, 16);
    assert.equal(user.ohsa.length, 1);
  });
});

test("history endpoint enforces bounded limit and coherent structure", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authBridge(baseUrl, { userId: "history_limit_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    for (let i = 0; i < 6; i += 1) {
      const sid = `limit_sess_${i}`;
      await post(baseUrl, "/api/sessions", { sessionId: sid }, authHeader);
      await post(baseUrl, `/api/sessions/${sid}/complete`, { repsCompleted: i + 1 }, authHeader);
    }

    const { res, json } = await get(baseUrl, "/api/me/history?limit=3", authHeader);
    assert.equal(res.status, 200);
    assert.equal(json.data.limits.itemLimit, 3);
    assert.equal(json.data.completedSessions.length, 3);
    assert.ok(json.data.summary.totalEvents >= 6);
    assert.equal(Array.isArray(json.data.ohsaHistory), true);
    assert.equal(Array.isArray(json.data.recentActivity), true);
  });
});

test("services remain compatible with malformed legacy stored user shapes", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authBridge(baseUrl, { userId: "legacy_shape_user" });
    const authHeader = { authorization: `Bearer ${token}` };
    const userPath = path.join(tmpRoot, "data", "users", "legacy_shape_user.json");

    fs.mkdirSync(path.dirname(userPath), { recursive: true });
    fs.writeFileSync(userPath, JSON.stringify({
      userId: "legacy_shape_user",
      events: {},
      sessions: [],
      ohsa: null,
      profile: { age: 40 }
    }, null, 2));

    const { res: profileRes } = await get(baseUrl, "/api/me/profile", authHeader);
    assert.equal(profileRes.status, 200);

    const { res: ohsaRes } = await post(baseUrl, "/api/ohsa", {
      summary: { score: 64, riskLevel: "moderate", recommendations: ["mobility"] }
    }, authHeader);
    assert.equal(ohsaRes.status, 201);

    const { res: startRes } = await post(baseUrl, "/api/sessions", {
      sessionId: "shape_sess_1"
    }, authHeader);
    assert.equal(startRes.status, 201);
  });
});


test("auth-protected /api/me/history rejects missing token", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const { res, json } = await get(baseUrl, "/api/me/history");
    assert.equal(res.status, 401);
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "UNAUTHENTICATED");
  });
});

test("/api/me/profile returns normalized default profile shape for new auth user", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authBridge(baseUrl, { userId: "new_profile_shape_user" });
    const authHeader = { authorization: `Bearer ${token}` };

    const { res, json } = await get(baseUrl, "/api/me/profile", authHeader);
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.userId, "new_profile_shape_user");
    assert.deepEqual(json.data.profile, {
      age: null,
      height_cm: null,
      weight_kg: null,
      goals: null,
      injuries: [],
      notes: null
    });
  });
});


test("default enforcement enables session_complete only", () => {
  const parsed = parseActionEnforcementFromEnv({});
  assert.equal(parsed.enabledByAction.session_complete, true);
  assert.equal(parsed.enabledByAction.rep_update, false);
  assert.equal(parsed.enabledByAction.session_start, false);
});

test("bootstrap super-admin can access ops surfaces while normal user is denied", async (t) => {
  const prevSuper = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  const prevAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "root_admin";
  process.env.AUTHZ_ADMIN_USER_IDS = "regular_admin";
  t.after(() => {
    if (prevSuper == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevSuper;
    if (prevAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = prevAdmin;
  });

  await withServer(t, async ({ baseUrl }) => {
    const superToken = await authBridge(baseUrl, { userId: "root_admin" });
    const adminToken = await authBridge(baseUrl, { userId: "regular_admin" });
    const userToken = await authBridge(baseUrl, { userId: "normal_user" });

    const denied = await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${userToken}` });
    assert.equal(denied.res.status, 403);

    const superAllowed = await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${superToken}` });
    assert.equal(superAllowed.res.status, 200);
    assert.equal(superAllowed.json.authorization.bootstrapConfigured.superAdminUserIdCount, 1);

    const adminAllowed = await get(baseUrl, "/api/ops/enforcement-config", { authorization: `Bearer ${adminToken}` });
    assert.equal(adminAllowed.res.status, 200);
  });
});

test("admin can update enforcement config and rep_update remains unenforced by default", async (t) => {
  const prevAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.AUTHZ_ADMIN_USER_IDS = "ops_admin";
  t.after(() => {
    if (prevAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = prevAdmin;
  });

  await withServer(t, async ({ baseUrl }) => {
    const adminToken = await authBridge(baseUrl, { userId: "ops_admin" });

    const getBefore = await get(baseUrl, "/api/ops/enforcement-config", { authorization: `Bearer ${adminToken}` });
    assert.equal(getBefore.res.status, 200);
    assert.equal(getBefore.json.actionFallbackEnforcement.effective.enabledByAction.session_complete, true);
    assert.equal(getBefore.json.actionFallbackEnforcement.effective.enabledByAction.rep_update, false);

    const putRes = await put(baseUrl, "/api/ops/enforcement-config", {
      enabledByAction: { session_start: true }
    }, { authorization: `Bearer ${adminToken}` });
    assert.equal(putRes.res.status, 200);
    assert.equal(putRes.json.data.actionFallbackEnforcement.effective.enabledByAction.session_start, true);
    assert.equal(putRes.json.data.actionFallbackEnforcement.effective.enabledByAction.rep_update, false);
  });
});

test("ops authorization decisions are observable", async (t) => {
  const prevAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.AUTHZ_ADMIN_USER_IDS = "audit_admin";
  t.after(() => {
    if (prevAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = prevAdmin;
  });

  await withServer(t, async ({ baseUrl }) => {
    const adminToken = await authBridge(baseUrl, { userId: "audit_admin" });
    const userToken = await authBridge(baseUrl, { userId: "audit_user" });

    await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${userToken}` });
    const allowed = await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${adminToken}` });
    assert.equal(allowed.res.status, 200);
    assert.ok(allowed.json.writes.authorization.adminOpsChecks.total >= 2);
    assert.ok(allowed.json.writes.authorization.adminOpsChecks.denied >= 1);
    assert.ok(allowed.json.writes.authorization.adminOpsChecks.allowed >= 1);
  });
});
