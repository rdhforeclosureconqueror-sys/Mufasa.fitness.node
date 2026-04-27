"use strict";

const PILOT_STATUS = Object.freeze({
  READY: "READY",
  READY_WITH_WARNINGS: "READY_WITH_WARNINGS",
  NOT_READY: "NOT_READY"
});

function evaluatePilotReadiness(report = {}) {
  const blockers = [];
  const warnings = [];
  const evidence = [];
  const missingEvidence = [];
  const recommendedFixes = [];

  const payload = report?.payload || {};
  const retention = payload?.retention || {};
  const runtime = payload?.runtime || {};

  const checks = {
    intakeComplete: retention.intakeComplete === true,
    goalSet: retention.goalSet === true,
    programAssigned: retention.programAssigned === true,
    firstWorkoutCompleted: retention.firstWorkoutCompleted === true,
    weeklyCheckInAvailable: retention.weeklyReviewReady === true,
    progressDashboardActive: retention.progressNarrativeReady === true,
    visualScanEnabled: retention.visualScanEnabled === true,
    visualScanUsed: retention.visualScanUsed === true,
    postWorkoutRewardScreenReady: retention.postWorkoutRewardScreenReady === true,
    streakSystemReady: retention.streakSystemReady === true,
    coachMessagingReady: retention.coachMessagingReady === true,
    habitLoopReady: retention.habitLoopReady === true
  };

  const requiredChecks = [
    ["intakeComplete", "Client intake is incomplete.", "Complete /api/client-intake during onboarding."],
    ["goalSet", "Goal and baseline are not set.", "Create goals + baseline at /api/goals-baseline."],
    ["programAssigned", "Program has not been assigned.", "Assign a program using /api/programs."],
    ["firstWorkoutCompleted", "First workout has not been completed.", "Track first workout completion via /api/workouts/track."],
    ["weeklyCheckInAvailable", "Weekly check-in flow is unavailable.", "Enable weekly review data with /api/check-ins and /api/progress/dashboard."],
    ["progressDashboardActive", "Progress dashboard is not active.", "Enable /api/progress/dashboard for this user."],
    ["postWorkoutRewardScreenReady", "Post-workout reward summary is unavailable.", "Save and display reward summary after /api/workouts/track."],
    ["streakSystemReady", "Streak and consistency signals are not available.", "Expose streak metrics in /api/progress/dashboard."],
    ["coachMessagingReady", "Deterministic coach messaging is unavailable.", "Enable coach messaging in progress dashboard payload."],
    ["habitLoopReady", "Habit loop prompts are unavailable.", "Return habit loop prompts for before/during/after/weekly moments."]
  ];

  for (const [field, blockerMessage, fix] of requiredChecks) {
    evidence.push(`payload.retention.${field}`);
    const hasEvidence = retention[field] != null
      || (field === "weeklyCheckInAvailable" && retention.weeklyReviewReady != null)
      || (field === "progressDashboardActive" && retention.progressNarrativeReady != null);
    if (!hasEvidence) {
      missingEvidence.push({ field: `payload.retention.${field}`, label: field });
      warnings.push(`${field} evidence missing from diagnostic payload.`);
      continue;
    }
    if (!checks[field]) {
      blockers.push(blockerMessage);
      recommendedFixes.push(fix);
    }
  }

  evidence.push("payload.retention.visualScanEnabled");
  if (retention.visualScanEnabled == null) {
    missingEvidence.push({ field: "payload.retention.visualScanEnabled", label: "visualScanEnabled" });
    warnings.push("Visual progress scan feature flag evidence missing.");
  } else if (checks.visualScanEnabled && !checks.visualScanUsed) {
    warnings.push("Visual progress scan is enabled but no scan has been captured yet.");
    recommendedFixes.push("Capture front/side/back visual progress scan and compare over time.");
  }

  if (runtime.sessionSaveSuccess === false) {
    blockers.push("Workout session persistence is failing.");
    recommendedFixes.push("Fix session persistence before pilot retention rollout.");
    evidence.push("payload.runtime.sessionSaveSuccess");
  }

  let pilotStatus = PILOT_STATUS.READY;
  if (blockers.length > 0) {
    pilotStatus = PILOT_STATUS.NOT_READY;
  } else if (warnings.length > 0 || missingEvidence.length > 0) {
    pilotStatus = PILOT_STATUS.READY_WITH_WARNINGS;
  }

  const confidence = blockers.length > 0 ? 0.9 : (warnings.length > 0 ? 0.75 : 0.85);

  return {
    pilotStatus,
    blockers,
    warnings,
    missingEvidence,
    evidence,
    recommendedFixes,
    codexFixMessage: blockers[0] || warnings[0] || "Retention checks look healthy.",
    confidence,
    lastCheckedAt: new Date().toISOString()
  };
}

module.exports = {
  PILOT_STATUS,
  evaluatePilotReadiness
};
