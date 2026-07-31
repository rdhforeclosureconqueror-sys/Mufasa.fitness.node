"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePilotReadiness } = require("../src/lib/pilotReadinessEvaluator");

function makeBaseReport() {
  return {
    payload: {
      runtime: {
        sessionSaveSuccess: true
      },
      retention: {
        intakeComplete: true,
        goalSet: true,
        programAssigned: true,
        activeWorkoutAvailable: true,
        firstWorkoutCompleted: true,
        workoutHistoryUpdated: true,
        gamificationEventRecorded: true,
        xpUpdated: true,
        firstAchievementEvaluated: true,
        firstBadgeEvaluated: true,
        rewardVisible: true,
        progressRewardsUiUpdated: true,
        exerciseHubReachable: true,
        yogaReachable: true,
        aiCoachAuthoritativeContext: true,
        progressNarrativeReady: true,
        postWorkoutRewardScreenReady: true,
        streakSystemReady: true,
        coachMessagingReady: true,
        habitLoopReady: true,
        visualScanEnabled: true,
        visualScanUsed: true
      }
    },
    openAiSummaryStatus: "ok"
  };
}

test("incomplete member checkpoint yields READY_WITH_LIMITATION rather than a platform failure", () => {
  const report = makeBaseReport();
  report.payload.retention.programAssigned = false;
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY_WITH_LIMITATION");
  assert.equal(result.blockers.length, 0);
  assert.ok(result.warnings.some((entry) => /programAssigned/i.test(entry)));
});

test("visual scan evidence does not gate Version 1", () => {
  const report = makeBaseReport();
  report.payload.retention.visualScanUsed = false;
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.visualScanStatus, "READY_WITH_LIMITATION");
});

test("all required checkpoints satisfied yields READY", () => {
  const report = makeBaseReport();
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY");
});

test("weekly check-in is excluded from Version 1", () => {
  const report = makeBaseReport();
  delete report.payload.retention.weeklyReviewReady;
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY");
  assert.equal(result.weeklyCheckInStatus, "EXCLUDED_FROM_V1");
});
