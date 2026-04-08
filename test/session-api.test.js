"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");

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
      userId: "different_user_should_be_ignored",
      sessionId: "sess_hist_1"
    }, authHeader);

    await post(baseUrl, "/api/sessions/sess_hist_1/complete", {
      userId: "different_user_should_be_ignored",
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

    await post(baseUrl, "/api/sessions", { userId: "ignored", sessionId: "safe_sess_1" }, authHeader);
    await post(baseUrl, "/api/sessions/safe_sess_1/complete", { userId: "ignored", repsCompleted: 16 }, authHeader);
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
      await post(baseUrl, "/api/sessions", { userId: "ignored", sessionId: sid }, authHeader);
      await post(baseUrl, `/api/sessions/${sid}/complete`, { userId: "ignored", repsCompleted: i + 1 }, authHeader);
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
      userId: "ignored",
      sessionId: "shape_sess_1"
    }, authHeader);
    assert.equal(startRes.status, 201);
  });
});
