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
        firstWorkoutCompleted: true,
        weeklyReviewReady: true,
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

test("missing required retention checkpoints yields NOT_READY", () => {
  const report = makeBaseReport();
  report.payload.retention.programAssigned = false;
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "NOT_READY");
  assert.ok(result.blockers.some((entry) => /Program has not been assigned/i.test(entry)));
});

test("visual scan optional warning yields READY_WITH_WARNINGS", () => {
  const report = makeBaseReport();
  report.payload.retention.visualScanUsed = false;
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY_WITH_WARNINGS");
  assert.equal(result.blockers.length, 0);
  assert.ok(result.warnings.some((entry) => /Visual progress scan/i.test(entry)));
});

test("all required checkpoints satisfied yields READY", () => {
  const report = makeBaseReport();
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY");
});

test("missing evidence yields READY_WITH_WARNINGS", () => {
  const report = makeBaseReport();
  delete report.payload.retention.weeklyReviewReady;
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY_WITH_WARNINGS");
  assert.ok(result.missingEvidence.some((entry) => entry.field === "payload.retention.weeklyCheckInAvailable"));
});
