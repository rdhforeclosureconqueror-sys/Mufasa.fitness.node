"use strict";

const PILOT_STATUS = Object.freeze({
  RETENTION_READY: "RETENTION_READY",
  RETENTION_READY_WITH_WARNINGS: "RETENTION_READY_WITH_WARNINGS",
  RETENTION_NOT_READY: "RETENTION_NOT_READY"
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
    weeklyCheckInAvailable: retention.weeklyCheckInAvailable === true,
    progressDashboardActive: retention.progressDashboardActive === true,
    visualScanEnabled: retention.visualScanEnabled === true,
    visualScanUsed: retention.visualScanUsed === true
  };

  const requiredChecks = [
    ["intakeComplete", "Client intake is incomplete.", "Complete /api/client-intake during onboarding."],
    ["goalSet", "Goal and baseline are not set.", "Create goals + baseline at /api/goals-baseline."],
    ["programAssigned", "Program has not been assigned.", "Assign a program using /api/programs."],
    ["firstWorkoutCompleted", "First workout has not been completed.", "Track first workout completion via /api/workouts/track."],
    ["weeklyCheckInAvailable", "Weekly check-in flow is unavailable.", "Enable weekly check-ins with /api/check-ins."],
    ["progressDashboardActive", "Progress dashboard is not active.", "Enable /api/progress/dashboard for this user." ]
  ];

  for (const [field, blockerMessage, fix] of requiredChecks) {
    evidence.push(`payload.retention.${field}`);
    if (retention[field] == null) {
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

  let pilotStatus = PILOT_STATUS.RETENTION_READY;
  if (blockers.length > 0) {
    pilotStatus = PILOT_STATUS.RETENTION_NOT_READY;
  } else if (warnings.length > 0 || missingEvidence.length > 0) {
    pilotStatus = PILOT_STATUS.RETENTION_READY_WITH_WARNINGS;
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
