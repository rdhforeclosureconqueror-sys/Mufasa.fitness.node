"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createViewModel, valueOrUnavailable } = require("../public/workout-completion.js");

function completion(overrides = {}) {
  return { tracking: { workoutId: "strength-a", sessionDurationMinutes: 42, exercisesCompleted: ["squat", "row"], sets: 6, reps: 48, completedAt: "2026-07-30T10:00:00Z" },
    tracked: { rewardSummary: { nextScheduledWorkout: "Mobility is queued." } },
    dashboard: { streak: { currentStreak: 4, weeklyWorkoutsCompleted: 3 } },
    projectionRefresh: { previous: { level: { current: 2, lifetimeXp: 190 } }, data: { level: { current: 3, lifetimeXp: 340, xpIntoLevel: 40, levelSpanXp: 300, xpToNextLevel: 260 } }, celebrations: [{ type: "achievement", item: { id: "a", name: "Strong Start" } }, { type: "badge", item: { id: "b", name: "Strong Start" } }] }, ...overrides };
}

test("completion view model only presents authoritative session and projection values", () => {
  const model = createViewModel(completion());
  assert.equal(model.workout.name, "strength-a"); assert.equal(model.workout.exercises, 2); assert.equal(model.progression.xpEarned, 150);
  assert.equal(model.progression.levelChanged, true); assert.equal(model.achievements[0].name, "Strong Start"); assert.equal(model.badges.length, 1);
  assert.deepEqual(model.insights, ["You completed 3 workouts this week.", "You're 260 XP from Level 4.", "Your 4-day consistency streak continues."]);
  assert.equal(model.recommendation, "Mobility is queued."); assert.deepEqual(model.records, []);
});

test("missing authoritative values use explicit empty states and never fabricated numbers", () => {
  const model = createViewModel({ tracking: { workoutId: "mobility", exercisesCompleted: [] }, dashboard: {} });
  assert.equal(model.progression.xpEarned, null); assert.equal(model.workout.calories, null); assert.equal(model.recommendation, null);
  assert.equal(valueOrUnavailable(null), "Not recorded"); assert.equal(model.insights.length, 0);
});

test("launch UI includes accessible, responsive, reduced-motion, loading-safe integration", () => {
  const js = fs.readFileSync(path.join(__dirname, "../public/workout-completion.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/workout-completion.css"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  assert.match(js, /role="progressbar"/); assert.match(js, /aria-valuetext/); assert.match(js, /aria-live/); assert.match(js, /event\.key === "Escape"/);
  assert.match(css, /max-width:720px/); assert.match(css, /max-width:390px/); assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /@media print/);
  assert.match(html, /workout-completion\.css/); assert.match(html, /workout-completion\.js/);
});

test("dashboard completion bridge refreshes one shared projection before presenting", () => {
  const runtime = fs.readFileSync(path.join(__dirname, "../public/dashboard-runtime.js"), "utf8");
  assert.match(runtime, /MufasaProgressionInstance\?\.load/); assert.match(runtime, /mufasa:workout-completion/);
  assert.ok(runtime.indexOf("MufasaProgressionInstance?.load") < runtime.indexOf('new CustomEvent("mufasa:workout-completion"'));
});
