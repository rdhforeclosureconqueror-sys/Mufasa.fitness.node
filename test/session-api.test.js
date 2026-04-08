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
