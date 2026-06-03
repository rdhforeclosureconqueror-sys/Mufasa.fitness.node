"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const sources = {
  liveBreakpoints: fs.readFileSync(path.join(repoRoot, "public/live-workout-breakpoints.js"), "utf8"),
  workoutRuntime: fs.readFileSync(path.join(repoRoot, "public/workout-runtime.js"), "utf8"),
  runtimeOrchestrator: fs.readFileSync(path.join(repoRoot, "public/runtime-orchestrator.js"), "utf8"),
  appRuntime: fs.readFileSync(path.join(repoRoot, "public/app-runtime.js"), "utf8"),
  workoutProgression: fs.readFileSync(path.join(repoRoot, "public/workout-progression-runtime.js"), "utf8")
};

function createElement(id) {
  const listeners = {};
  return {
    id,
    textContent: "",
    disabled: false,
    title: "",
    hidden: false,
    style: {},
    attributes: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === "disabled") this.disabled = true; },
    removeAttribute(name) { delete this.attributes[name]; if (name === "disabled") this.disabled = false; },
    getAttribute(name) { return this.attributes[name] || null; },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    dispatch(type) { (listeners[type] || []).forEach((handler) => handler({ type, target: this })); },
    getBoundingClientRect() { return { width: 320, height: 240 }; }
  };
}

function createHarness({ camera = true } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
    return elements.get(id);
  }
  element("video").srcObject = camera ? { active: true } : null;
  element("workoutHud");
  element("hudExerciseName");
  element("hudSet");
  element("hudReps");
  element("hudTempo");
  element("hudRest");
  element("hudNextExercise");
  element("hudCoachCue");
  element("poseStatus");
  element("brainStatus");
  element("featureActivationStatus");
  element("startBtn");
  element("workoutToggleMobileBtn");

  const context = {
    console,
    Date,
    Error,
    Promise,
    JSON,
    setTimeout,
    clearTimeout,
    location: { origin: "https://mufasa-fitness-node.onrender.com" },
    APP_AUTH: { isAuthenticated: true },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { getElementById: element, body: { classList: { add() {}, remove() {}, toggle() {} } } },
    addEventListener() {},
    dispatchEvent() {},
    fetch: async () => ({ ok: true, json: async () => ({ sessionId: "sess_fetch" }) })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(sources.liveBreakpoints, context, { filename: "public/live-workout-breakpoints.js" });
  vm.runInContext(sources.workoutRuntime, context, { filename: "public/workout-runtime.js" });
  vm.runInContext(sources.runtimeOrchestrator, context, { filename: "public/runtime-orchestrator.js" });
  return { context, elements, element };
}

test("Phase 19 Start Workout click calls canonical WorkoutRuntime.startWorkout", async () => {
  const { context, element } = createHarness();
  let calls = 0;
  context.WorkoutRuntime.startWorkout = async () => { calls += 1; return { running: true }; };

  context.RuntimeOrchestrator.configureButtonRuntime({ refs: { startBtn: element("startBtn") }, deps: { addLog() {} }, handlers: { startWorkout: async () => { throw new Error("stale handler should not run"); } } });
  await element("startBtn").onclick();

  assert.equal(calls, 1);
});

test("Phase 19 outer feature click listener delegates instead of swallowing Start Workout", async () => {
  const { context, element } = createHarness();
  let calls = 0;
  context.WorkoutRuntime.startWorkout = async () => { calls += 1; };
  vm.runInContext(sources.appRuntime, context, { filename: "public/app-runtime.js" });

  await context.__appRuntime.forceActivate("phase19-test");
  element("startBtn").dispatch("click");
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(calls, 1);
  assert.match(element("featureActivationStatus").textContent, /last feature click: start_workout/);
});

test("Phase 19 missing intake/goals/program does not block Start Workout", async () => {
  const { context, element } = createHarness();
  element("retentionFlowStatus").textContent = "Retention Motivation Status: NOT_READY";
  vm.runInContext(sources.appRuntime, context, { filename: "public/app-runtime.js" });

  await context.__appRuntime.forceActivate("phase19-missing-intake");

  assert.equal(context.__appRuntime.getStartWorkoutBlockedReason(), "");
  assert.equal(element("startBtn").getAttribute("data-blocked-reason"), null);
  context.__appRuntime.updateFeaturePanel("phase19-missing-intake");
  assert.match(element("featureActivationStatus").textContent, /start workout blocked reason: none/);
});

test("Phase 19 no selected workout defaults to Bodyweight Squat", () => {
  const { context } = createHarness();
  context.HudRuntime = { render() {} };
  vm.runInContext(sources.workoutProgression, context, { filename: "public/workout-progression-runtime.js" });

  context.WorkoutProgressionRuntime.prepareWorkoutStart();
  const plan = context.WorkoutProgressionRuntime.getPlan();

  assert.equal(plan.exercises[0].name, "Bodyweight Squat");
  assert.equal(plan.exercises[0].exerciseId, "bodyweight_squat");
});

test("Phase 19 camera missing shows Connect camera first", async () => {
  const { context, element } = createHarness({ camera: false });
  let calls = 0;
  context.WorkoutRuntime.startWorkout = async () => { calls += 1; };
  context.RuntimeOrchestrator.configureButtonRuntime({ refs: { startBtn: element("startBtn") }, deps: { addLog() {} } });

  const result = await element("startBtn").onclick();

  assert.equal(result, false);
  assert.equal(calls, 0);
  assert.equal(element("poseStatus").textContent, "Connect camera first.");
});

test("Phase 19 camera connected advances workoutStartClicked and workoutStartHandlerEntered", async () => {
  const { context, element } = createHarness();
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat" }),
    createSession: async () => ({ sessionId: "sess_phase19_breadcrumbs" }),
    ensureDetectorReady: async () => ({}),
    isDetectorReady: () => true,
    onWorkoutStarted: async () => {}
  });
  context.RuntimeOrchestrator.configureButtonRuntime({ refs: { startBtn: element("startBtn") }, deps: { addLog() {} } });

  await element("startBtn").onclick();

  assert.equal(context.__liveWorkoutBreakpoints.milestones.workoutStartClicked.status, "pass");
  assert.equal(context.__liveWorkoutBreakpoints.milestones.workoutStartHandlerEntered.status, "pass");
});

test("Phase 19 session create is attempted after Start Workout delegation", async () => {
  const { context, element } = createHarness();
  let attemptedBeforeCreate = null;
  context.WorkoutRuntime.configureWorkoutRuntime({
    prepareWorkoutStart() {},
    buildSessionPayload: () => ({ exerciseId: "bodyweight_squat", workoutId: "pilot_bodyweight_squat" }),
    getSessionCreateUrl: () => "https://mufasa-fitness-node.onrender.com/api/sessions",
    createSession: async () => {
      attemptedBeforeCreate = context.__liveWorkoutBreakpoints.milestones.sessionCreateAttempted.status;
      return { sessionId: "sess_phase19_attempted" };
    },
    ensureDetectorReady: async () => ({}),
    isDetectorReady: () => true,
    onWorkoutStarted: async () => {}
  });
  context.RuntimeOrchestrator.configureButtonRuntime({ refs: { startBtn: element("startBtn") }, deps: { addLog() {} } });

  await element("startBtn").onclick();

  assert.equal(attemptedBeforeCreate, "pass");
  assert.equal(context.__liveWorkoutBreakpoints.milestones.sessionCreateAttempted.extra.requestUrl, "https://mufasa-fitness-node.onrender.com/api/sessions");
});
