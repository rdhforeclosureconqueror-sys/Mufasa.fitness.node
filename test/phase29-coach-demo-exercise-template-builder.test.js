"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createApp } = require("../server");
const { createExerciseTemplateService } = require("../src/services/exerciseTemplateService");

function tmpRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-phase29-")); }

async function withServer(fn, envPatch = {}) {
  const previous = {};
  for (const key of Object.keys(envPatch)) {
    previous[key] = process.env[key];
    process.env[key] = envPatch[key];
  }
  const rootDir = tmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(baseUrl, rootDir); }
  finally {
    await new Promise((resolve) => server.close(resolve));
    for (const key of Object.keys(envPatch)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

async function jsonFetch(baseUrl, route, options = {}) {
  const res = await fetch(baseUrl + route, {
    method: options.method || "GET",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function login(baseUrl, roleUserId) {
  const { res, json } = await jsonFetch(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email: "coach@example.com", password: "test-password", testUserId: roleUserId, testRole: "user" }
  });
  assert.equal(res.status, 200);
  return json.token;
}

function auth(token) { return { authorization: `Bearer ${token}` }; }

const NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
];

function frame(offset = 0, score = 0.9) {
  return {
    timestamp: offset,
    keypoints: NAMES.map((name, index) => ({ name, x: 100 + index * 4, y: 80 + index * 3 + offset, score }))
  };
}

function frames() { return [frame(0), frame(20), frame(40)]; }

function loadEngine() {
  const code = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  const sandbox = { console, Date, Math, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, module: { exports: {} }, globalThis: null };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "public/workout-runtime.js" });
  return sandbox.__PILOT_FORM_RULE_ENGINE;
}

test("Phase 29 normal users cannot access or activate custom template judging", async () => {
  await withServer(async (baseUrl) => {
    const token = await login(baseUrl, "normal_user");
    const create = await jsonFetch(baseUrl, "/api/exercise-templates", {
      method: "POST",
      headers: auth(token),
      body: { exerciseName: "Secret Curl", movementPattern: "curl" }
    });
    assert.equal(create.res.status, 403);

    const active = await jsonFetch(baseUrl, "/api/exercise-templates/active/scoring", { headers: auth(token) });
    assert.equal(active.res.status, 200);
    assert.deepEqual(active.json.data.templates, []);
  }, { NODE_ENV: "test", PILOT_LOGIN_PASSWORD: "test-password", AUTH_TEST_LOGIN_FIXTURE_ENABLED: "true", AUTHZ_TRAINER_USER_IDS: "coach1" });
});

test("Phase 29 coach/admin can create a draft with required slots and positions", async () => {
  await withServer(async (baseUrl) => {
    const token = await login(baseUrl, "coach1");
    const { res, json } = await jsonFetch(baseUrl, "/api/exercise-templates", {
      method: "POST",
      headers: auth(token),
      body: {
        exerciseName: "Dumbbell Curl",
        movementPattern: "curl",
        description: "Elbow flexion demo",
        equipment: "dumbbells",
        difficulty: "beginner",
        positions: [{ name: "extension" }, { name: "contraction" }, { name: "extension" }]
      }
    });
    assert.equal(res.status, 201);
    const template = json.data.template;
    assert.equal(template.status, "draft");
    assert.equal(template.createdBy, "coach1");
    assert.deepEqual(template.demoSlots.map((slot) => slot.slot), ["front_view", "side_view", "optional_extra_view"]);
    assert.deepEqual(template.demoSlots.map((slot) => slot.required), [true, true, false]);
    assert.deepEqual(template.positions.map((position) => position.name), ["extension", "contraction", "extension"]);
  }, { NODE_ENV: "test", PILOT_LOGIN_PASSWORD: "test-password", AUTH_TEST_LOGIN_FIXTURE_ENABLED: "true", AUTHZ_TRAINER_USER_IDS: "coach1" });
});

test("Phase 29 demo capture stores MoveNet keypoints and derived measurements without raw video", () => {
  const root = tmpRoot();
  const svc = createExerciseTemplateService({ filePath: path.join(root, "data", "ops", "exercise-templates.json") });
  const draft = svc.createDraft({ exerciseName: "Demo Squat", movementPattern: "squat" }, { userId: "coach" });
  const result = svc.addDemoCapture(draft.id, { slot: "front_view", rawVideo: "ignored-by-service", frames: frames() });
  const capture = result.capture;
  assert.equal(capture.slot, "front_view");
  assert.equal(capture.frameCount, 3);
  assert.equal(capture.frames[0].keypoints.length, 17);
  assert.equal(typeof capture.frames[0].derivedAngles.kneeAngle, "number");
  assert.equal(capture.frames[0].rawVideo, undefined);
  assert.equal(capture.rawVideo, undefined);
});

test("Phase 29 phase review, test mode, and approval are required before active status", async () => {
  await withServer(async (baseUrl) => {
    const token = await login(baseUrl, "admin1");
    const draftRes = await jsonFetch(baseUrl, "/api/exercise-templates", { method: "POST", headers: auth(token), body: { exerciseName: "Coach Push", movementPattern: "push" } });
    const id = draftRes.json.data.template.id;

    let approval = await jsonFetch(baseUrl, `/api/exercise-templates/${id}/approve`, { method: "POST", headers: auth(token), body: { activate: true } });
    assert.equal(approval.res.status, 400);

    await jsonFetch(baseUrl, `/api/exercise-templates/${id}/demo-captures`, { method: "POST", headers: auth(token), body: { slot: "front_view", frames: frames() } });
    await jsonFetch(baseUrl, `/api/exercise-templates/${id}/demo-captures`, { method: "POST", headers: auth(token), body: { slot: "side_view", frames: frames() } });
    approval = await jsonFetch(baseUrl, `/api/exercise-templates/${id}/approve`, { method: "POST", headers: auth(token), body: { activate: true } });
    assert.equal(approval.res.status, 400);

    const reviewed = await jsonFetch(baseUrl, `/api/exercise-templates/${id}`, {
      method: "PUT",
      headers: auth(token),
      body: { phases: [{ name: "top", order: 1, keyFrame: 0 }, { name: "bottom", order: 2, keyFrame: 1 }], repCycle: ["top", "bottom", "top"] }
    });
    assert.equal(reviewed.json.data.template.status, "phase_review");
    approval = await jsonFetch(baseUrl, `/api/exercise-templates/${id}/approve`, { method: "POST", headers: auth(token), body: { activate: true } });
    assert.equal(approval.res.status, 400);

    const testRun = await jsonFetch(baseUrl, `/api/exercise-templates/${id}/test-runs`, { method: "POST", headers: auth(token), body: { frames: frames() } });
    assert.equal(testRun.res.status, 201);
    assert.equal(testRun.json.data.testRun.wouldCountRep, true);

    approval = await jsonFetch(baseUrl, `/api/exercise-templates/${id}/approve`, { method: "POST", headers: auth(token), body: { activate: true } });
    assert.equal(approval.res.status, 200);
    assert.equal(approval.json.data.template.status, "active");
    assert.equal(approval.json.data.template.approvedBy, "admin1");
  }, { NODE_ENV: "test", PILOT_LOGIN_PASSWORD: "test-password", AUTH_TEST_LOGIN_FIXTURE_ENABLED: "true", AUTHZ_ADMIN_USER_IDS: "admin1" });
});

test("Phase 29 draft and testing templates are not used for public rep counting", () => {
  const engine = loadEngine();
  assert.equal(engine.isCustomTemplateEligibleForScoring({ status: "draft" }), false);
  assert.equal(engine.isCustomTemplateEligibleForScoring({ status: "testing" }), false);
  assert.equal(engine.isCustomTemplateEligibleForScoring({ status: "rejected" }), false);
  assert.equal(engine.isCustomTemplateEligibleForScoring({ status: "active" }), true);

  const analysis = engine.analyzeMovement({ exercise: { exerciseId: "custom_secret_curl", name: "Secret Curl" }, pose: { keypoints: [] } });
  assert.equal(analysis.unsupportedExercise, true);
  assert.equal(analysis.formWarning, "Tracking unavailable for this exercise in pilot.");
});

test("Phase 29 built-in Squat, Push-Up, Lunge, and Push-Up Challenge remain intact", () => {
  const engine = loadEngine();
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Bodyweight Squat" }), "squat");
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Push-Up" }), "pushup");
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Lunge" }), "lunge");
  assert.equal(typeof globalThis.PushupChallengeRuntime === "undefined", true);
  const challengeSource = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  assert.match(challengeSource, /PushupChallengeRuntime/);
  assert.match(challengeSource, /startChallenge/);
});

test("Phase 29 Request New Exercise pilot-safe message remains visible", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "workout.html"), "utf8");
  assert.match(html, /id="defineExerciseBtn"[^>]*>Request New Exercise<\/button>/);
  assert.match(html, /Custom exercise creation is coming soon\. For this pilot, use Squat, Push-Up, Lunge, or Push-Up Challenge\./);
  assert.match(html, /id="exerciseTemplateDraftBtn"[^>]*hidden>Create Exercise Template Draft<\/button>/);
  assert.match(html, /Raw video is not stored/);
});
