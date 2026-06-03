"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createApp } = require("../server");
const { createChallengeService } = require("../src/services/challengeService");

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-phase26-"));
}

async function withServer(fn) {
  const rootDir = tmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(baseUrl, rootDir); }
  finally { await new Promise((resolve) => server.close(resolve)); }
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

const NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
];

function loadEngine() {
  const code = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  const sandbox = { console, Date, Math, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, module: { exports: {} }, globalThis: null };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "public/workout-runtime.js" });
  return sandbox.__PILOT_FORM_RULE_ENGINE;
}

function basePose(score = 0.95) {
  return { keypoints: NAMES.map((name, index) => ({ name, part: name, x: 100 + index, y: 100 + index, score })) };
}

function setPoint(pose, name, x, y, score = 0.95) {
  Object.assign(pose.keypoints.find((kp) => kp.name === name), { x, y, score });
}

function pushupPose(phase = "top", score = 0.95) {
  const pose = basePose(score);
  for (const side of ["left", "right"]) {
    const offset = side === "left" ? 0 : 20;
    setPoint(pose, `${side}_shoulder`, 100, 100 + offset, score);
    if (phase === "bottom") {
      setPoint(pose, `${side}_elbow`, 180, 150 + offset, score);
      setPoint(pose, `${side}_wrist`, 100, 200 + offset, score);
    } else if (phase === "shallow") {
      setPoint(pose, `${side}_elbow`, 180, 120 + offset, score);
      setPoint(pose, `${side}_wrist`, 245, 120 + offset, score);
    } else {
      setPoint(pose, `${side}_elbow`, 200, 100 + offset, score);
      setPoint(pose, `${side}_wrist`, 300, 100 + offset, score);
    }
    setPoint(pose, `${side}_hip`, 45, 112 + offset, score);
  }
  return pose;
}

test("Phase 26 challenge result route does not require auth, intake, or program", async () => {
  await withServer(async (baseUrl) => {
    const { res, json } = await jsonFetch(baseUrl, "/api/challenges/pushup/results", {
      method: "POST",
      body: { displayName: "Alex", consent: true, variant: "standard_pushup", validRepCount: 3 }
    });
    assert.equal(res.status, 201);
    assert.equal(json.ok, true);
    assert.equal(json.data.result.displayName, "Alex");
    assert.equal(json.data.result.score, 3);
  });
});

test("Phase 26 participant can start/save with displayName only plus required consent", () => {
  const svc = createChallengeService({ filePath: path.join(tmpRoot(), "data", "ops", "pushup.json") });
  const result = svc.savePushupResult({ displayName: "Display Only", consent: true, variant: "standard_pushup", validRepCount: 1 });
  assert.equal(result.displayName, "Display Only");
  assert.equal(result.team, null);
  assert.equal(result.score, 1);
});

test("Phase 26 standard push-up valid rep scores 1 point and one-hand scores 2 points", () => {
  const svc = createChallengeService({ filePath: path.join(tmpRoot(), "pushup.json") });
  assert.equal(svc.savePushupResult({ displayName: "Std", consent: true, variant: "standard_pushup", validRepCount: 1 }).score, 1);
  assert.equal(svc.savePushupResult({ displayName: "One", consent: true, variant: "one_hand_pushup", validRepCount: 1 }).score, 2);
});

test("Phase 26 shallow push-up does not count and low-confidence keypoints do not count", () => {
  const engine = loadEngine();
  engine.resetCycle();
  engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose("top") }));
  engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose("shallow") }));
  const shallow = engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose("top") }));
  assert.equal(shallow.repDetected, false);

  engine.resetCycle();
  const low = engine.completeCycle(engine.analyzeMovement({ exercise: { name: "Push-Up" }, pose: pushupPose("bottom", 0.1) }));
  assert.equal(low.keypointConfidenceOk, false);
  assert.equal(low.repDetected, false);
  assert.equal(low.feedback, "Move so I can see your shoulders, elbows, wrists, and hips.");
});

test("Phase 26 leaderboard sorts by score desc, valid reps desc, then earliest timestamp", () => {
  const svc = createChallengeService({ filePath: path.join(tmpRoot(), "pushup.json") });
  svc.savePushupResult({ displayName: "Early", consent: true, variant: "standard_pushup", validRepCount: 4 });
  svc.savePushupResult({ displayName: "High", consent: true, variant: "one_hand_pushup", validRepCount: 3 });
  svc.savePushupResult({ displayName: "More reps tie", consent: true, variant: "standard_pushup", validRepCount: 6 });
  const rows = svc.getPushupLeaderboard().leaderboard;
  assert.equal(rows[0].displayName, "More reps tie");
  assert.equal(rows[1].displayName, "High");
  assert.equal(rows[2].displayName, "Early");
});

test("Phase 26 public leaderboard hides email and phone", async () => {
  await withServer(async (baseUrl) => {
    await jsonFetch(baseUrl, "/api/challenges/pushup/results", {
      method: "POST",
      body: { displayName: "Private", email: "p@example.com", phone: "555-0100", team: "Rugby", consent: true, variant: "one_hand_pushup", validRepCount: 2 }
    });
    const { json } = await jsonFetch(baseUrl, "/api/challenges/pushup/leaderboard");
    const row = json.data.leaderboard[0];
    assert.equal(row.displayName, "Private");
    assert.equal(row.team, "Rugby");
    assert.equal(row.email, undefined);
    assert.equal(row.phone, undefined);
  });
});

test("Phase 26 existing workout session flow still requires auth", async () => {
  await withServer(async (baseUrl) => {
    const { res } = await jsonFetch(baseUrl, "/api/sessions", { method: "POST", body: { exerciseId: "push_up" } });
    assert.equal(res.status, 401);
  });
});

test("Phase 24 form rules remain present", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  assert.match(source, /Phase 24: minimal pilot form-rule engine/);
  assert.match(source, /analyzePushup/);
  assert.match(source, /pushup/);
});
