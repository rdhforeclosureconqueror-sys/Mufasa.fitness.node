"use strict";

const PILOT_STATUS = Object.freeze({
  READY: "READY", READY_WITH_LIMITATION: "READY_WITH_LIMITATION", DEGRADED: "DEGRADED", BLOCKED: "BLOCKED",
  DISABLED_INTENTIONALLY: "DISABLED_INTENTIONALLY", EXCLUDED_FROM_V1: "EXCLUDED_FROM_V1", UNKNOWN: "UNKNOWN"
});

function evaluatePilotReadiness(report = {}) {
  const payload = report.payload || {};
  const retention = payload.retention || {};
  const runtime = payload.runtime || {};
  const blockers = [], warnings = [], missingEvidence = [], evidence = [], recommendedFixes = [];
  const journey = [
    ["intakeComplete", retention.intakeComplete, "Complete onboarding intake."],
    ["goalSet", retention.goalSet, "Record the member goal and constraints."],
    ["programAssigned", retention.programAssigned, "Assign a program."],
    ["activeWorkoutAvailable", retention.activeWorkoutAvailable ?? payload.memberEvidence?.activeWorkout, "Make today's workout available."],
    ["firstWorkoutCompleted", retention.firstWorkoutCompleted ?? payload.memberEvidence?.firstWorkoutCompleted, "Complete the first workout to trigger history and rewards."],
    ["workoutHistoryUpdated", retention.workoutHistoryUpdated, "Confirm workout history after completion."],
    ["gamificationEventRecorded", retention.gamificationEventRecorded, "Confirm workout.completed capture."],
    ["xpUpdated", retention.xpUpdated, "Confirm XP projection."],
    ["firstAchievementEvaluated", retention.firstAchievementEvaluated, "Evaluate the first-workout achievement."],
    ["firstBadgeEvaluated", retention.firstBadgeEvaluated, "Evaluate the first-workout badge."],
    ["rewardVisible", retention.rewardVisible ?? retention.postWorkoutRewardScreenReady, "Display the reward in Progress & Rewards."],
    ["progressRewardsUiUpdated", retention.progressRewardsUiUpdated ?? retention.progressNarrativeReady, "Refresh Progress & Rewards."],
    ["exerciseHubReachable", retention.exerciseHubReachable, "Verify Exercise Hub navigation."],
    ["yogaReachable", retention.yogaReachable, "Verify Yoga navigation."],
    ["aiCoachAuthoritativeContext", retention.aiCoachAuthoritativeContext, "Verify authoritative program/member context in AI Coach."]
  ];
  for (const [field, value, remediation] of journey) {
    evidence.push(`payload.retention.${field}`);
    if (value == null) missingEvidence.push({ field: `payload.retention.${field}`, label: field });
    else if (value !== true) { warnings.push(`${field} is incomplete for this member.`); recommendedFixes.push(remediation); }
  }
  if (runtime.sessionSaveSuccess === false) { blockers.push("Workout session persistence is failing."); recommendedFixes.push("Restore session persistence."); }
  const visualScanStatus = retention.visualScanEnabled === true ? PILOT_STATUS.READY_WITH_LIMITATION : PILOT_STATUS.EXCLUDED_FROM_V1;
  const avatarStatus = payload.features?.avatarEnabled === true ? PILOT_STATUS.UNKNOWN : PILOT_STATUS.DISABLED_INTENTIONALLY;
  // Member incompleteness is not a platform blocker; only deterministic runtime failures block launch.
  const pilotStatus = blockers.length ? PILOT_STATUS.BLOCKED : warnings.length || missingEvidence.length ? PILOT_STATUS.READY_WITH_LIMITATION : PILOT_STATUS.READY;
  return { pilotStatus, platformStatus: pilotStatus, memberStateStatus: warnings.length ? PILOT_STATUS.READY_WITH_LIMITATION : PILOT_STATUS.READY, blockers, warnings, missingEvidence, evidence, recommendedFixes, weeklyCheckInStatus: PILOT_STATUS.EXCLUDED_FROM_V1, visualScanStatus, avatarStatus, codexFixMessage: blockers[0] || warnings[0] || "Version 1 journey checks are healthy.", confidence: blockers.length ? 0.95 : missingEvidence.length ? 0.7 : 0.9, lastCheckedAt: new Date().toISOString() };
}

module.exports = { PILOT_STATUS, evaluatePilotReadiness };
