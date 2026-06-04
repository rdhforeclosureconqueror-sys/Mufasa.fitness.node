"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPilotFormEngine() {
  const code = fs.readFileSync(path.join(__dirname, "..", "public", "workout-runtime.js"), "utf8");
  const sandbox = {
    console,
    Date,
    Math,
    setTimeout: () => 0,
    clearTimeout: () => {},
    module: { exports: {} },
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "public/workout-runtime.js" });
  return sandbox.__PILOT_FORM_RULE_ENGINE;
}

test("Phase 28 Request New Exercise is visible and opens pilot-safe unavailable messaging", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "workout.html"), "utf8");
  assert.match(html, /id="defineExerciseBtn"[^>]*>Request New Exercise<\/button>/);
  assert.match(html, /Custom exercise creation is coming soon\. For this pilot, use Squat, Push-Up, Lunge, or Push-Up Challenge\./);
  assert.doesNotMatch(html, /id="defineExerciseBtn"[^>]*disabled/);
});

test("Phase 28 unknown exercise does not silently fall back to squat scoring", () => {
  const engine = loadPilotFormEngine();
  const analysis = engine.analyzeMovement({ exercise: { exerciseId: "library_mystery_move", name: "Mystery Move" }, pose: { keypoints: [] } });
  assert.equal(analysis.movementPattern, "unknown");
  assert.equal(analysis.unsupportedExercise, true);
  assert.equal(analysis.depthStatus, "tracking unavailable");
  assert.match(analysis.feedback, /Live form judging is not available for Mystery Move/);

  const cycle = engine.completeCycle(analysis);
  assert.equal(cycle.repDetected, false);
  assert.equal(cycle.goodRep, false);
});

test("Phase 28 pilot movement mappings remain intact", () => {
  const engine = loadPilotFormEngine();
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Bodyweight Squat" }), "squat");
  assert.equal(engine.mapExerciseToMovementPattern({ exerciseId: "push_up" }), "pushup");
  assert.equal(engine.mapExerciseToMovementPattern({ name: "Lunge" }), "lunge");
});

test("Phase 28 Exercise Library Use for workout still persists canonical workout selection", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "exercise-library.js"), "utf8");
  assert.match(source, /selectBtn\.textContent = "Use for workout"/);
  assert.match(source, /selectBtn\.addEventListener\("click", \(\) => selectExerciseForWorkout\(ex\)\)/);
  assert.match(source, /localStorage\.setItem\(ACTIVE_WORKOUT_SELECTION_KEY, JSON\.stringify\(selection\)\)/);
  assert.match(source, /window\.location\.href = "\/index\.html#today-workout"/);
});

