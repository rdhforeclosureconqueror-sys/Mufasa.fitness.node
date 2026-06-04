"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createSessionWriteClient } = require("../public/session-write.js");

const indexHtml = fs.readFileSync(path.join(__dirname, "../public/workout.html"), "utf8");
const retentionFlow = fs.readFileSync(path.join(__dirname, "../public/retention-flow.js"), "utf8");
const workoutRuntime = fs.readFileSync(path.join(__dirname, "../public/workout-runtime.js"), "utf8");

function extractOptionValues(source) {
  return Array.from(source.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)).map(([, value, label]) => ({ value, label }));
}

test("Phase 16 default workouts appear as selectable pilot starters when no program is assigned", () => {
  const options = extractOptionValues(indexHtml);
  assert.ok(options.some((option) => option.value === "pilot_bodyweight_squat" && option.label.includes("Bodyweight Squat")));
  assert.ok(options.some((option) => option.value === "pilot_push_up" && option.label.includes("Push-Up")));
  assert.ok(options.some((option) => option.value === "pilot_lunge" && option.label.includes("Lunge")));
  assert.match(indexHtml, /pilot_default_workout/);
});

test("Phase 16 start workout defaults to Bodyweight Squat if no workout is selected", () => {
  assert.match(indexHtml, /function ensurePilotDefaultWorkoutSelection/);
  assert.match(indexHtml, /workoutSelectEl && !workoutSelectEl\.value\) workoutSelectEl\.value = workoutId/);
  assert.match(indexHtml, /"pilot_bodyweight_squat"/);
  assert.match(indexHtml, /ensurePilotDefaultWorkoutSelection\("start-workout"\)/);
});

test("Phase 16 session creation uses live backend origin and bearer auth", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options, body: JSON.parse(options.body || "{}") });
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, data: { sessionId: "phase16_sess" } }; }
    };
  };
  t.after(() => { global.fetch = originalFetch; });

  const client = createSessionWriteClient({
    baseUrl: "https://mufasa-fitness-node.onrender.com",
    commandUrl: "https://mufasa-fitness-node.onrender.com/command",
    getUserId: () => "phase16_user",
    getAuthToken: () => "maat-token",
    logger: { warn() {} }
  });

  const result = await client.startSession({ exerciseId: "bodyweight_squat" });
  assert.equal(result.sessionId, "phase16_sess");
  assert.equal(calls[0].url, "https://mufasa-fitness-node.onrender.com/api/sessions");
  assert.equal(calls[0].options.headers.authorization, "Bearer maat-token");
  assert.equal(calls[0].options.headers.Authorization, "Bearer maat-token");
});

test("Phase 16 missing intake and goals become N/A or pilot-safe session fallbacks", () => {
  const client = createSessionWriteClient({
    baseUrl: "https://mufasa-fitness-node.onrender.com",
    commandUrl: "https://mufasa-fitness-node.onrender.com/command",
    getUserId: () => "phase16_user",
    getAuthToken: () => "maat-token",
    logger: { warn() {} }
  });

  const payload = client._normalizePilotSessionPayloadForTests({ exerciseId: "push_up" });
  assert.deepEqual({
    goal: payload.goal,
    programId: payload.programId,
    source: payload.source,
    equipment: payload.equipment,
    injuries: payload.injuries,
    limitations: payload.limitations,
    experienceLevel: payload.experienceLevel,
    notes: payload.notes,
    selectedWorkout: payload.selectedWorkout,
    workoutId: payload.workoutId
  }, {
    goal: "N/A",
    programId: "pilot-fallback",
    source: "pilot_default_workout",
    equipment: "bodyweight",
    injuries: "N/A",
    limitations: "N/A",
    experienceLevel: "N/A",
    notes: "Started with pilot default workout; intake can be completed later.",
    selectedWorkout: "Push-Up",
    workoutId: "pilot_push_up"
  });
});

test("Phase 16 successful session creation starts live guidance without OHSA or voice blocking", () => {
  assert.match(indexHtml, /session-created/);
  assert.match(workoutRuntime, /onWorkoutStarted/);
  assert.match(workoutRuntime, /runPoseLoop\?\.\(\)/);
  assert.match(indexHtml, /Step back so I can see your full body\./);
  assert.match(indexHtml, /Waiting for full body in frame\./);
  assert.match(indexHtml, /Full body in frame\. Tracking started\./);
  assert.doesNotMatch(indexHtml.slice(indexHtml.indexOf("async function startWorkout"), indexHtml.indexOf("function handleWorkoutSelectChange")), /lastOhsaSummary|ohsaMode|voice/i);
  assert.match(indexHtml, /Voice recognition is not supported in this browser\. Use text coach\./);
});

test("Phase 16 progressive intake and onboarding progress are visible and editable", () => {
  assert.match(retentionFlow, /Complete your intake so Ma’at can build a safer, more personalized program\./);
  assert.match(retentionFlow, /You can return and edit these intake basics later\./);
  assert.match(retentionFlow, /Goals/);
  assert.match(retentionFlow, /Medical\/history basics/);
  assert.match(retentionFlow, /Overhead Squat Assessment/);
  assert.match(retentionFlow, /First Workout/);
  assert.match(retentionFlow, /Now we know what motivates you\./);
  assert.match(retentionFlow, /Now we have the basics needed to guide safer training\./);
  assert.match(retentionFlow, /Now we have a movement baseline\./);
  assert.match(retentionFlow, /Now we have your first performance baseline\./);
  assert.match(retentionFlow, /renderGoalsBaselineForm\(\)/);
});

test("Phase 16 OHSA and custom workout pilot behavior are explicit", () => {
  assert.match(indexHtml, /Pose runtime is unavailable\. Overhead Squat Assessment cannot start\./);
  assert.match(indexHtml, /Custom exercise creation is coming soon\. For this pilot, use Squat, Push-Up, Lunge, or Push-Up Challenge\./);
  assert.match(retentionFlow, /pilot starter workouts are not blocked by OHSA/);
});
