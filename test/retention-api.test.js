"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");

async function withServer(t, fn, { env = {} } = {}) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-retention-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");

  const prior = {};
  for (const [key, value] of Object.entries(env)) {
    prior[key] = process.env[key];
    process.env[key] = value;
  }

  const app = createApp({ rootDir: tmpRoot });
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(() => {
    server.close();
    for (const key of Object.keys(env)) {
      if (prior[key] == null) delete process.env[key];
      else process.env[key] = prior[key];
    }
  });

  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return fn({ baseUrl, tmpRoot });
}

async function request(baseUrl, route, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(baseUrl + route, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { res, json };
}

async function authToken(baseUrl, userId) {
  const { res, json } = await request(baseUrl, "/api/auth/bridge", {
    method: "POST",
    body: { userId, trustMode: "manual_unverified" }
  });
  assert.equal(res.status, 201);
  return json.data.auth.token;
}

test("client intake save/load + goals/program/workout/check-in/dashboard flow", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authToken(baseUrl, "retention_user_1");
    const auth = { authorization: `Bearer ${token}` };

    const intakePayload = {
      name: "Jordan",
      age: 33,
      height: 178,
      goals: ["fat loss"],
      injuries: ["old ankle sprain"],
      limitations: ["no overhead barbell work"],
      trainingExperience: "intermediate",
      equipment: ["dumbbells", "bands"],
      schedule: "weekday mornings",
      preferredWorkoutDays: ["Mon", "Wed", "Fri"],
      medicalDisclaimerConsent: true,
      notes: "focus on adherence"
    };

    const intakeSave = await request(baseUrl, "/api/client-intake", { method: "POST", body: intakePayload, headers: auth });
    assert.equal(intakeSave.res.status, 201);

    const intakeGet = await request(baseUrl, "/api/client-intake", { headers: auth });
    assert.equal(intakeGet.res.status, 200);
    assert.equal(intakeGet.json.data.intake.name, "Jordan");

    const goalsSave = await request(baseUrl, "/api/goals-baseline", {
      method: "POST",
      headers: auth,
      body: {
        goal: "fat_loss",
        baseline: {
          startingStrengthTests: ["Goblet squat 8RM"],
          formScoreBaseline: 62,
          measurements: ["waist self-report optional"],
          visualProgressScan: "baseline scan captured"
        }
      }
    });
    assert.equal(goalsSave.res.status, 201);

    const programAssign = await request(baseUrl, "/api/programs", {
      method: "POST",
      headers: auth,
      body: {
        clientId: "retention_user_1",
        goal: "fat_loss",
        durationWeeks: 8,
        daysPerWeek: 3,
        movementFocus: ["squat", "hinge"],
        exercises: ["goblet_squat", "rdl"],
        progressionRules: ["add 1-2 reps weekly before load increase"]
      }
    });
    assert.equal(programAssign.res.status, 201);

    const workoutTrack = await request(baseUrl, "/api/workouts/track", {
      method: "POST",
      headers: auth,
      body: {
        programId: programAssign.json.data.program.programId,
        workoutId: "wk1_day1",
        exercisesCompleted: ["goblet_squat", "rdl"],
        reps: 24,
        sets: 6,
        formScore: 74,
        sessionDuration: 42,
        notes: "solid first session",
        completionStatus: "completed"
      }
    });
    assert.equal(workoutTrack.res.status, 201);
    assert.equal(workoutTrack.json.data.rewardSummary.workoutCompleted, true);

    const checkInSave = await request(baseUrl, "/api/check-ins", {
      method: "POST",
      headers: auth,
      body: {
        energy: 7,
        soreness: 4,
        sleep: 7,
        motivation: 8,
        progressNotes: "felt stronger",
        strengthProgressionNotes: "Added one rep to each set.",
        formTrendNotes: "Squat depth and knee tracking improved.",
        nextWeekFocus: "Hip control",
        adherence: 90,
        painFlag: false
      }
    });
    assert.equal(checkInSave.res.status, 201);

    const checkInGet = await request(baseUrl, "/api/check-ins", { headers: auth });
    assert.equal(checkInGet.res.status, 200);
    assert.equal(checkInGet.json.data.count, 1);

    const dashboard = await request(baseUrl, "/api/progress/dashboard", { headers: auth });
    assert.equal(dashboard.res.status, 200);
    assert.equal(dashboard.json.data.workoutsCompleted, 1);
    assert.equal(dashboard.json.data.rewardSummary.workoutCompleted, true);
    assert.equal(typeof dashboard.json.data.streak.currentStreak, "number");
    assert.equal(typeof dashboard.json.data.streak.consistencyPercentage, "number");
    assert.match(dashboard.json.data.weeklyReview.weekSummary, /You completed/i);
    assert.ok(Array.isArray(dashboard.json.data.coachMessaging.messages));
    assert.ok(dashboard.json.data.progressNarrative);
    assert.equal(typeof dashboard.json.data.retentionMotivationStatus, "string");

    const rewardLatest = await request(baseUrl, "/api/workouts/reward/latest", { headers: auth });
    assert.equal(rewardLatest.res.status, 200);
    assert.equal(rewardLatest.json.data.rewardSummary.workoutCompleted, true);

    const user = JSON.parse(fs.readFileSync(path.join(tmpRoot, "data", "users", "retention_user_1.json"), "utf8"));
    assert.ok(user.clientIntake);
    assert.ok(user.goalsBaseline);
    assert.ok(user.program);
    assert.ok(Array.isArray(user.workoutTracking));
    assert.ok(Array.isArray(user.checkIns));
  });
});

test("streak consistency handles missed days without breaking summaries", async (t) => {
  await withServer(t, async ({ baseUrl, tmpRoot }) => {
    const token = await authToken(baseUrl, "retention_user_missed_day");
    const auth = { authorization: `Bearer ${token}` };
    await request(baseUrl, "/api/client-intake", {
      method: "POST",
      headers: auth,
      body: {
        name: "Casey",
        age: 29,
        height: 170,
        goals: ["strength"],
        injuries: [],
        limitations: [],
        equipment: ["dumbbells"],
        preferredWorkoutDays: ["Mon", "Wed", "Fri"],
        medicalDisclaimerConsent: true
      }
    });
    await request(baseUrl, "/api/goals-baseline", {
      method: "POST",
      headers: auth,
      body: { goal: "strength", baseline: { formScoreBaseline: 70 } }
    });
    const programAssign = await request(baseUrl, "/api/programs", {
      method: "POST",
      headers: auth,
      body: {
        clientId: "retention_user_missed_day",
        goal: "strength",
        durationWeeks: 8,
        daysPerWeek: 4,
        movementFocus: ["lower_body"],
        exercises: ["squat"],
        progressionRules: ["+1 rep weekly"]
      }
    });
    assert.equal(programAssign.res.status, 201);

    const userPath = path.join(tmpRoot, "data", "users", "retention_user_missed_day.json");
    const dayOffsets = [0, 2];
    for (const offset of dayOffsets) {
      const tracked = await request(baseUrl, "/api/workouts/track", {
        method: "POST",
        headers: auth,
        body: {
          programId: programAssign.json.data.program.programId,
          workoutId: `missed_day_${offset}`,
          exercisesCompleted: ["squat"],
          reps: 12,
          sets: 3,
          formScore: 75 + offset,
          completionStatus: "completed"
        }
      });
      assert.equal(tracked.res.status, 201);
      const user = JSON.parse(fs.readFileSync(userPath, "utf8"));
      user.workoutTracking[user.workoutTracking.length - 1].ts = Date.now() - (offset * 24 * 60 * 60 * 1000);
      fs.writeFileSync(userPath, JSON.stringify(user, null, 2));
    }

    const dashboard = await request(baseUrl, "/api/progress/dashboard", { headers: auth });
    assert.equal(dashboard.res.status, 200);
    assert.ok(dashboard.json.data.streak.missedWorkouts >= 0);
    assert.ok(["comeback_active", "needs_comeback", "on_track"].includes(dashboard.json.data.streak.comebackStatus));
    assert.ok(Array.isArray(dashboard.json.data.coachMessaging.messages));
  });
});

test("visual progress scan respects feature flag and supports comparison", async (t) => {
  await withServer(t, async ({ baseUrl }) => {
    const token = await authToken(baseUrl, "scan_user_disabled");
    const blocked = await request(baseUrl, "/api/visual-progress-scans", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: {
        frontImageUrl: "https://example.com/front.jpg",
        sideImageUrl: "https://example.com/side.jpg",
        backImageUrl: "https://example.com/back.jpg"
      }
    });
    assert.equal(blocked.res.status, 404);
  });

  await withServer(t, async ({ baseUrl }) => {
    const token = await authToken(baseUrl, "scan_user_enabled");
    const auth = { authorization: `Bearer ${token}` };

    const save1 = await request(baseUrl, "/api/visual-progress-scans", {
      method: "POST",
      headers: auth,
      body: {
        captureLabel: "week1",
        frontImageUrl: "https://example.com/front1.jpg",
        sideImageUrl: "https://example.com/side1.jpg",
        backImageUrl: "https://example.com/back1.jpg",
        bodyMapSummary: "Upper body and lower body posture alignment reference",
        estimatedProportions: ["balanced shoulders", "stable stance"],
        postureAlignment: "neutral",
        visualChangeNotes: "baseline"
      }
    });
    assert.equal(save1.res.status, 201);

    const save2 = await request(baseUrl, "/api/visual-progress-scans", {
      method: "POST",
      headers: auth,
      body: {
        captureLabel: "week4",
        frontImageUrl: "https://example.com/front4.jpg",
        sideImageUrl: "https://example.com/side4.jpg",
        backImageUrl: "https://example.com/back4.jpg"
      }
    });
    assert.equal(save2.res.status, 201);

    const comparison = await request(
      baseUrl,
      `/api/visual-progress-scans?firstScanId=${encodeURIComponent(save1.json.data.scan.scanId)}&secondScanId=${encodeURIComponent(save2.json.data.scan.scanId)}`,
      { headers: auth }
    );
    assert.equal(comparison.res.status, 200);
    assert.match(comparison.json.data.comparison.summary, /Visual change comparison/i);

    const payloadText = JSON.stringify(save1.json.data.scan);
    assert.equal(/body fat|diagnosis|exact inches/i.test(payloadText), false);
  }, { env: { ENABLE_VISUAL_PROGRESS_SCAN: "true" } });
});
