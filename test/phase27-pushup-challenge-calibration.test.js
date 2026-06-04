"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");
const { createChallengeService } = require("../src/services/challengeService");

const NAMES = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
];

function loadRuntime() {
  const elements = new Map();
  function element(id, value = "") {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value,
        checked: false,
        textContent: "",
        innerHTML: "",
        disabled: false,
        addEventListener: () => {},
        scrollIntoView: () => {},
        classList: { add: () => {}, remove: () => {} }
      });
    }
    return elements.get(id);
  }
  [
    "challengeDisplayName", "challengeTeam", "challengeEmail", "challengePhone", "challengeConsent",
    "challengeStartBtn", "challengeStopBtn", "challengeTimer", "challengeValidReps", "challengeScore",
    "challengeSaveStatus", "challengeRejectedReason", "challengeVariantNote", "challengeDiagnosticsStatus",
    "challengeLeaderboardBody"
  ].forEach((id) => element(id));
  element("challengeDisplayName").value = "Pilot";
  element("challengeConsent").checked = true;

  const code = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  const sandbox = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    module: { exports: {} },
    globalThis: null,
    document: { readyState: "complete", getElementById: (id) => elements.get(id) || null },
    fetch: async () => ({ json: async () => ({ data: { leaderboard: [] } }) })
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "public/workout-runtime.js" });
  return { runtime: sandbox.PushupChallengeRuntime, elements };
}

function basePose(score = 0.95) {
  return { keypoints: NAMES.map((name) => ({ name, part: name, x: 0, y: 0, score })) };
}
function setPoint(pose, name, x, y, score = 0.95) {
  Object.assign(pose.keypoints.find((kp) => kp.name === name), { x, y, score });
}
function wristForAngle(shoulder, elbow, degrees) {
  const length = 70;
  const radians = (Math.PI - (degrees * Math.PI / 180));
  return { x: elbow.x + Math.cos(radians) * length, y: elbow.y + Math.sin(radians) * length };
}
function pushupPose({ angle = 90, oneHand = false, score = 0.95, body = "green", standing = false } = {}) {
  const pose = basePose(score);
  const hipYOffset = body === "red" ? 95 : body === "yellow" ? 42 : 8;
  for (const side of ["left", "right"]) {
    const lane = side === "left" ? -18 : 18;
    const shoulder = standing ? { x: 100, y: 100 + lane } : { x: 320, y: 100 + lane };
    const elbow = standing ? { x: 100, y: 190 + lane } : { x: 390, y: 100 + lane };
    const wrist = wristForAngle(shoulder, elbow, angle);
    const armScore = oneHand && side === "right" ? 0.1 : score;
    setPoint(pose, `${side}_shoulder`, shoulder.x, shoulder.y, score);
    setPoint(pose, `${side}_elbow`, elbow.x, elbow.y, armScore);
    setPoint(pose, `${side}_wrist`, wrist.x, wrist.y, armScore);
    setPoint(pose, `${side}_hip`, standing ? 100 : 135, standing ? 300 + lane : 100 + lane + hipYOffset, score);
    setPoint(pose, `${side}_ankle`, standing ? 100 : 0, standing ? 480 + lane : 100 + lane, body === "yellow" ? 0.1 : score);
  }
  if (oneHand) {
    setPoint(pose, "right_wrist", 650, 45, score);
  }
  return pose;
}

async function calibrate(runtime, { bottomAngle = 90, topAngle = 165 } = {}) {
  const starting = runtime.startChallenge({ calibrationTimeoutMs: 1000, countdownMs: 0, durationSeconds: 60 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: bottomAngle }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: bottomAngle }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: topAngle }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: topAngle }) });
  await starting;
}

function feedRep(runtime, options = {}) {
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90, ...options }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 165, ...options }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90, ...options }) });
  return runtime.getState();
}

test("Phase 27 participant does not need to choose a push-up variant before challenge", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  assert.doesNotMatch(source, /challengeVariantSelect/);
  assert.match(source, /Do any valid push-up variation\. Two-hand reps count 1 point\. One-hand reps count 2 points\./);
  const svc = createChallengeService({ filePath: path.join(fs.mkdtempSync(path.join(require("node:os").tmpdir(), "pushup27-")), "pushup.json") });
  const saved = svc.savePushupResult({ displayName: "Auto", consent: true, validRepCount: 2, twoHandRepCount: 1, oneHandRepCount: 1, totalScore: 3 });
  assert.equal(saved.totalScore, 3);
});

test("Phase 27 calibration prompts full-body step-back and captures bottom/top angles", async () => {
  const { runtime } = loadRuntime();
  const starting = runtime.startChallenge({ calibrationTimeoutMs: 1000, countdownMs: 0, durationSeconds: 60 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90, score: 0.1 }) });
  assert.equal(runtime.getState().rejectedRepReason, "Step back so I can see your full body.");
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 165 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 165 }) });
  await starting;
  const state = runtime.getState();
  assert.equal(state.calibrationStatus, "challenge_running");
  assert.ok(state.bottomElbowAngle >= 89 && state.bottomElbowAngle <= 91);
  assert.ok(state.topElbowAngle >= 164 && state.topElbowAngle <= 166);
  assert.ok(state.requiredRange > 55);
});

test("Phase 27 invalid calibration rejects shallow bottom, bent top, and invalid overall range", async () => {
  const shallow = loadRuntime().runtime;
  shallow.startChallenge({ calibrationTimeoutMs: 1000, countdownMs: 0 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  shallow.handlePoseAnalysis({ pose: pushupPose({ angle: 120 }) });
  shallow.handlePoseAnalysis({ pose: pushupPose({ angle: 120 }) });
  assert.equal(shallow.getState().rejectedRepReason, "Bend your elbows closer to 90 degrees for the bottom position.");

  const bentTop = loadRuntime().runtime;
  bentTop.startChallenge({ calibrationTimeoutMs: 1000, countdownMs: 0 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  bentTop.handlePoseAnalysis({ pose: pushupPose({ angle: 90 }) });
  bentTop.handlePoseAnalysis({ pose: pushupPose({ angle: 90 }) });
  bentTop.handlePoseAnalysis({ pose: pushupPose({ angle: 140 }) });
  bentTop.handlePoseAnalysis({ pose: pushupPose({ angle: 140 }) });
  assert.equal(bentTop.getState().rejectedRepReason, "Push up higher until your arms are nearly straight.");

  const invalidRange = loadRuntime().runtime;
  invalidRange.startChallenge({ calibrationTimeoutMs: 1000, countdownMs: 0 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  invalidRange.handlePoseAnalysis({ pose: pushupPose({ angle: 105 }) });
  invalidRange.handlePoseAnalysis({ pose: pushupPose({ angle: 105 }) });
  invalidRange.handlePoseAnalysis({ pose: pushupPose({ angle: 150 }) });
  invalidRange.handlePoseAnalysis({ pose: pushupPose({ angle: 150 }) });
  assert.equal(invalidRange.getState().rejectedRepReason, "Calibration failed. Reset and try again with your full body in view.");
});

test("Phase 27 calibrated 80 percent range allows imperfect two-hand reps for 1 point", async () => {
  const { runtime } = loadRuntime();
  await calibrate(runtime, { bottomAngle: 90, topAngle: 170 });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 98 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 162 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 98 }) });
  const state = runtime.getState();
  assert.equal(state.validRepCount, 1);
  assert.equal(state.twoHandRepCount, 1);
  assert.equal(state.lastRepVariant, "two_hand");
  assert.equal(state.lastRepPoints, 1);
  assert.equal(state.totalScore, 1);
});

test("Phase 27 good one-hand reps score 2 and mixed reps total correctly", async () => {
  const { runtime } = loadRuntime();
  await calibrate(runtime);
  feedRep(runtime);
  feedRep(runtime, { oneHand: true });
  const state = runtime.getState();
  assert.equal(state.validRepCount, 2);
  assert.equal(state.twoHandRepCount, 1);
  assert.equal(state.oneHandRepCount, 1);
  assert.equal(state.lastRepVariant, "one_hand");
  assert.equal(state.lastRepPoints, 2);
  assert.equal(state.totalScore, 3);
});

test("Phase 27 rejects shallow reps, standing footsteps, and red body alignment", async () => {
  const { runtime } = loadRuntime();
  await calibrate(runtime);
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 115 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 165 }) });
  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 115 }) });
  assert.equal(runtime.getState().validRepCount, 0);

  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90, standing: true }) });
  assert.equal(runtime.getState().validRepCount, 0);
  assert.match(runtime.getState().rejectedRepReason, /push-up stance|straight|bottom/i);

  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90, body: "red" }) });
  assert.equal(runtime.getState().validRepCount, 0);
  assert.equal(runtime.getState().rejectedRepReason, "Keep your body straight.");
});

test("Phase 27 yellow body alignment can count while low-confidence support classifies unclear or rejects", async () => {
  const { runtime } = loadRuntime();
  await calibrate(runtime);
  feedRep(runtime, { body: "yellow" });
  assert.equal(runtime.getState().validRepCount, 1);
  assert.equal(runtime.getState().bodyAlignmentStatus, "yellow");

  runtime.handlePoseAnalysis({ pose: pushupPose({ angle: 90, score: 0.1 }) });
  assert.equal(runtime.getState().validRepCount, 1);
  assert.equal(runtime.getState().rejectedRepReason, "Move so I can see your shoulders, elbows, wrists, and hips.");
});

test("Phase 27 leaderboard hides private fields and sorts by score, reps, then earliest timestamp", () => {
  const svc = createChallengeService({ filePath: path.join(fs.mkdtempSync(path.join(require("node:os").tmpdir(), "pushup27-")), "pushup.json") });
  svc.savePushupResult({ displayName: "Early", email: "a@example.com", phone: "555", team: "A", consent: true, validRepCount: 2, twoHandRepCount: 2, totalScore: 2 });
  svc.savePushupResult({ displayName: "High", consent: true, validRepCount: 2, oneHandRepCount: 2, totalScore: 4 });
  svc.savePushupResult({ displayName: "More reps", consent: true, validRepCount: 4, twoHandRepCount: 4, totalScore: 4 });
  const rows = svc.getPushupLeaderboard().leaderboard;
  assert.equal(rows[0].displayName, "More reps");
  assert.equal(rows[1].displayName, "High");
  assert.equal(rows[2].displayName, "Early");
  assert.equal(rows[2].email, undefined);
  assert.equal(rows[2].phone, undefined);
  assert.equal(rows[0].totalScore, 4);
});

