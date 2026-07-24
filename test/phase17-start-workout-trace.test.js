"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { createSessionWriteClient } = require("../public/session-write.js");

const repoRoot = path.resolve(__dirname, "..");
const workoutRuntimeSource = fs.readFileSync(path.join(repoRoot, "public/workout-runtime.js"), "utf8");
const liveBreakpointSource = fs.readFileSync(path.join(repoRoot, "public/live-workout-breakpoints.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(repoRoot, "public/workout.html"), "utf8");
const statusPanels = fs.readFileSync(path.join(repoRoot, "public/status-panels.js"), "utf8");

function createRuntimeHarness(overrides = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: "ready",
        disabled: false,
        style: {},
        classList: { add() {}, remove() {} },
        getBoundingClientRect: () => ({ width: 320, height: 240 }),
        removeAttribute(name) { delete this[name]; },
        setAttribute(name, value) { this[name] = value; }
      });
    }
    return elements.get(id);
  }
  element("video").srcObject = { active: true };

  const context = {
    console,
    Date,
    JSON,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    document: { getElementById: element, body: { classList: { add() {}, remove() {}, toggle() {} } } },
    __appRuntime: { updateFeaturePanel() {} },
    addEventListener() {},
    ...overrides
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(liveBreakpointSource, context, { filename: "public/live-workout-breakpoints.js" });
  vm.runInContext(workoutRuntimeSource, context, { filename: "public/workout-runtime.js" });
  return { context, elements };
}

test("Phase 17 Start Workout sets workoutStartClicked", async () => {
  const { context } = createRuntimeHarness();
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat" }),
    createSession: async () => ({ sessionId: "sess_phase17_clicked" }),
    ensureDetectorReady: async () => ({}),
    isDetectorReady: () => true,
    onWorkoutStarted: async () => {}
  });

  await context.WorkoutRuntime.startWorkout();

  assert.equal(context.__liveWorkoutBreakpoints.milestones.workoutStartClicked.status, "pass");
  assert.equal(context.__liveWorkoutBreakpoints.milestones.workoutStartHandlerEntered.status, "pass");
});

test("Phase 17 Start Workout sets sessionCreateAttempted before calling /api/sessions", async () => {
  const { context } = createRuntimeHarness();
  let observedBeforeCreate = null;
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat", workoutId: "pilot_bodyweight_squat" }),
    getSessionCreateUrl: () => "https://mufasa-fitness-node.onrender.com/api/sessions",
    createSession: async () => {
      observedBeforeCreate = context.__liveWorkoutBreakpoints.milestones.sessionCreateAttempted.status;
      return { sessionId: "sess_phase17_attempted" };
    },
    ensureDetectorReady: async () => ({}),
    isDetectorReady: () => true,
    onWorkoutStarted: async () => {}
  });

  await context.WorkoutRuntime.startWorkout();

  assert.equal(observedBeforeCreate, "pass");
  assert.equal(context.__liveWorkoutBreakpoints.milestones.sessionCreateAttempted.extra.requestUrl, "https://mufasa-fitness-node.onrender.com/api/sessions");
});

test("Phase 17 successful /api/sessions advances state to sessionCreateSucceeded", async () => {
  const { context } = createRuntimeHarness();
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat" }),
    createSession: async () => ({ sessionId: "sess_phase17_success" }),
    ensureDetectorReady: async () => ({}),
    isDetectorReady: () => true,
    onWorkoutStarted: async () => {}
  });

  await context.WorkoutRuntime.startWorkout();

  assert.equal(context.__liveWorkoutBreakpoints.milestones.sessionCreateSucceeded.status, "pass");
  assert.equal(context.__liveWorkoutBreakpoints.milestones["session-created"].status, "pass");
});

test("Phase 17 successful session creation advances to liveModeEntered", async () => {
  const { context } = createRuntimeHarness();
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat" }),
    createSession: async () => ({ sessionId: "sess_phase17_live" }),
    ensureDetectorReady: async () => ({}),
    isDetectorReady: () => true,
    onWorkoutStarted: async () => {}
  });

  await context.WorkoutRuntime.startWorkout();

  assert.equal(context.__liveWorkoutBreakpoints.milestones.liveModeEntered.status, "pass");
  assert.equal(context.__liveWorkoutBreakpoints.milestones["live-mode-entered"].status, "pass");
});

test("pose runtime load failure is reported while workout startup continues", async () => {
  const { context, elements } = createRuntimeHarness();
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat" }),
    createSession: async () => ({ sessionId: "sess_phase17_pose_fail" }),
    ensureDetectorReady: async () => { throw new Error("missing detector dependency: window.tf"); },
    isDetectorReady: () => false,
    isPoseProcessingEnabled: () => true,
    onWorkoutStarted: async () => {}
  });

  const result = await context.WorkoutRuntime.startWorkout();

  const milestone = context.__liveWorkoutBreakpoints.milestones.poseRuntimeFailed;
  assert.equal(milestone.status, "fail");
  assert.equal(milestone.extra.code, "TensorFlow missing");
  assert.equal(result.running, true);
  assert.match(elements.get("poseStatus").textContent, /Camera\/form unavailable:.*window\.tf.*Timer continues/);
});

test("Phase 17 failed /api/sessions shows status/error instead of pending", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  const tracker = { failures: [], markFail(name, err, extra) { this.failures.push({ name, err, extra }); }, markPass() {} };
  global.window = { __liveWorkoutBreakpoints: tracker };
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options, body: JSON.parse(options.body || "{}") });
    return { ok: false, status: 422, async json() { return { ok: false, error: { code: "VALIDATION_ERROR", message: "workoutId required" } }; } };
  };
  t.after(() => { global.fetch = originalFetch; global.window = originalWindow; });

  const client = createSessionWriteClient({
    baseUrl: "https://mufasa-fitness-node.onrender.com",
    commandUrl: "https://mufasa-fitness-node.onrender.com/command",
    getUserId: () => "phase17_user",
    getAuthToken: () => "maat-token",
    logger: { warn() {} }
  });

  await assert.rejects(() => client.startSession({ exerciseId: "bodyweight_squat" }), /fallback_not_allowed|workoutId required/);

  assert.equal(calls[0].url, "https://mufasa-fitness-node.onrender.com/api/sessions");
  assert.equal(calls[0].options.headers.authorization, "Bearer maat-token");
  assert.equal(tracker.failures[0].name, "sessionCreateFailed");
  assert.equal(tracker.failures[0].extra.status, 422);
  assert.equal(tracker.failures[0].extra.code, "VALIDATION_ERROR");
  assert.equal(tracker.failures[0].extra.requestUrl, "https://mufasa-fitness-node.onrender.com/api/sessions");
});

test("Phase 17 visible diagnostics include requested Start Workout breadcrumbs", () => {
  assert.match(statusPanels, /live workout trace:/);
  for (const breadcrumb of [
    "workoutStartClicked",
    "workoutStartHandlerEntered",
    "selectedWorkoutResolved",
    "fallbackWorkoutApplied",
    "sessionPayloadBuilt",
    "sessionCreateAttempted",
    "sessionCreateSucceeded",
    "sessionCreateFailed",
    "liveModeEntered",
    "poseRuntimeLoadAttempted",
    "poseRuntimeLoaded",
    "poseRuntimeFailed",
    "guidancePromptStarted",
    "poseLoopStarted",
    "firstPoseFrameReceived"
  ]) {
    assert.match(liveBreakpointSource + indexHtml + workoutRuntimeSource, new RegExp(breadcrumb));
  }
});
