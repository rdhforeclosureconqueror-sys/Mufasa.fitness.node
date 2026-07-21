"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { assertProductionPersistenceConfig } = require("../server");
const { createUserStore } = require("../src/repositories/userStore");
const { createTrainerWorkspaceStore } = require("../src/repositories/trainerWorkspaceStore");
const { createSessionService } = require("../src/services/sessionService");
const { createUserDataService } = require("../src/services/userDataService");
const { createJourneyIntakeService } = require("../src/services/journeyIntakeService");
const { createChallengeService } = require("../src/services/challengeService");
const { createTrainerWorkspaceService } = require("../src/services/trainerWorkspaceService");

test("production refuses container-local transactional storage", () => {
  assert.throws(
    () => assertProductionPersistenceConfig({ env: { NODE_ENV: "production" } }),
    /POCKET_PT_DATA_DIR is required/
  );
  assert.doesNotThrow(() => assertProductionPersistenceConfig({
    env: { NODE_ENV: "production", POCKET_PT_DATA_DIR: "/var/data/pocket-pt" }
  }));
});

test("workouts, assessments, Journey, leaderboard and admin read model survive restart and image replacement", () => {
  const volume = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-pt-volume-"));
  const dataDir = path.join(volume, "data");
  const userDir = path.join(dataDir, "users");
  const workspacePath = path.join(dataDir, "trainer-workspace.json");
  const leaderboardPath = path.join(dataDir, "ops", "pushup-challenge-results.json");
  const userId = "persistence_member";

  // First process/image: exercise the real service write paths.
  const users1 = createUserStore({ userDir });
  const sessions1 = createSessionService({ userStore: users1 });
  const member1 = createUserDataService({ userStore: users1 });
  const journey1 = createJourneyIntakeService({ userStore: users1 });
  const workspace1 = createTrainerWorkspaceStore({ filePath: workspacePath });
  const leaderboard1 = createChallengeService({ filePath: leaderboardPath });
  sessions1.startSession({ userId, sessionId: "restart_workout" });
  sessions1.completeSession({ userId, sessionId: "restart_workout", repsCompleted: 12 });
  member1.submitOhsa({ userId, summary: { score: 88, riskLevel: "low" } });
  journey1.patch(userId, { currentStep: "identity_profile" });
  workspace1.createAssignment({ trainerUserId: "trainer_1", clientUserId: userId, assignedByUserId: "admin_1" });
  leaderboard1.savePushupResult({ displayName: "Persistent Member", consent: true, validRepCount: 12, variant: "standard_pushup" });

  // New repositories represent a restarted process; a different application
  // root with the same volume represents a Render image/container replacement.
  const replacementImageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pocket-pt-image-"));
  assert.notEqual(replacementImageRoot, volume);
  const users2 = createUserStore({ userDir });
  const member2 = createUserDataService({ userStore: users2 });
  const journey2 = createJourneyIntakeService({ userStore: users2 });
  const workspace2 = createTrainerWorkspaceStore({ filePath: workspacePath });
  const leaderboard2 = createChallengeService({ filePath: leaderboardPath });
  const admin2 = createTrainerWorkspaceService({
    store: workspace2,
    userStore: users2,
    authorizationResolver: {}
  });

  assert.equal(member2.getHistory(userId).summary.totalCompletedSessions, 1, "completed workout");
  assert.equal(member2.getOhsaHistory(userId).count, 1, "assessment");
  assert.equal(journey2.get(userId).intake.currentStep, "identity_profile", "Journey progress");
  assert.equal(leaderboard2.getPushupLeaderboard().leaderboard[0].displayName, "Persistent Member", "leaderboard");
  assert.equal(admin2.listClients("trainer_1")[0].mostRecentWorkoutDate !== null, true, "admin workout summary");
  const detail = admin2.detail("trainer_1", userId);
  assert.equal(detail.training.recentWorkouts.length, 1, "admin completed workouts");
  assert.equal(detail.assessments.summaries.length, 1, "admin assessments");
});
