"use strict";

const PILOT_STATUS = Object.freeze({
  READY: "READY",
  READY_WITH_WARNINGS: "READY_WITH_WARNINGS",
  NOT_READY: "NOT_READY",
  BLOCKED_UNKNOWN: "BLOCKED_UNKNOWN"
});

function hasCriticalRouteFailures(routeCheck) {
  if (!routeCheck || !Array.isArray(routeCheck.checks)) return false;
  return routeCheck.checks.some((item) => item.classification === "FAIL");
}

function evaluatePilotReadiness(report = {}) {
  const blockers = [];
  const warnings = [];
  const evidence = [];
  const missingEvidence = [];
  const recommendedFixes = [];

  const payload = report?.payload || {};
  const runtime = payload?.runtime || {};
  const routesAndScripts = payload?.routesAndScripts || {};
  const build = payload?.build || {};
  const routeCheck = report?.routeCheck || null;
  const openAiSummaryStatus = report?.openAiSummaryStatus || "unknown";

  function markMissingEvidence(fieldPath, label) {
    missingEvidence.push({ field: fieldPath, label });
    evidence.push(fieldPath);
  }

  if (!payload || payload.collectorMissing) {
    markMissingEvidence("payload.collectorMissing", "Diagnostics collector payload");
    recommendedFixes.push("Ensure diagnostics-client.js loads and window.__collectDiagnosticReport is defined.");
  }

  if (!build.appBuildVersion) {
    blockers.push("Build version missing or stale.");
    recommendedFixes.push("Publish build metadata and expose APP_BUILD_VERSION.");
    evidence.push("payload.build.appBuildVersion");
  }

  const cameraStatus = runtime.cameraStatus || "unknown";
  if (runtime.cameraStatus == null) {
    markMissingEvidence("payload.runtime.cameraStatus", "Camera connect status");
  }
  if (/failed|error|denied|blocked/i.test(cameraStatus)) {
    blockers.push("Camera cannot connect.");
    recommendedFixes.push("Investigate camera permissions/device availability.");
    evidence.push("payload.runtime.cameraStatus");
  } else if (cameraStatus === "unknown") {
    warnings.push("Camera status unknown.");
    evidence.push("payload.runtime.cameraStatus");
  }

  const formEnginePresent = Boolean(runtime.formEngineStatus) || Boolean(routesAndScripts.formEngineLoaded);
  if (!formEnginePresent) {
    blockers.push("Form engine missing.");
    recommendedFixes.push("Load form-engine.js before workout diagnostics and verify runtime init.");
    evidence.push("payload.runtime.formEngineStatus");
  }

  const sessionSaveFailure = payload?.errors?.sessionSaveFailureReason || null;
  if (sessionSaveFailure) {
    blockers.push("Session save fails.");
    recommendedFixes.push("Fix /api/sessions write path and resolve session save errors.");
    evidence.push("payload.errors.sessionSaveFailureReason");
  }

  const hasWorkoutStartSignal = runtime.workoutStarted === true || runtime.selectedExercise != null;
  if (runtime.workoutStarted == null && runtime.selectedExercise == null) {
    markMissingEvidence("payload.runtime.selectedExercise", "Workout started");
  }
  if (!hasWorkoutStartSignal) {
    warnings.push("Workout start signal missing in report.");
    evidence.push("payload.runtime.selectedExercise");
  }

  const formEngineActiveDuringWorkout = Boolean(runtime.formEngineStatus?.lastEvaluatedAt) || (hasWorkoutStartSignal && formEnginePresent);
  if (!formEngineActiveDuringWorkout) {
    markMissingEvidence("payload.runtime.formEngineStatus.lastEvaluatedAt", "Form engine active during workout");
  }

  if (!runtime.lastFormResultSummary) {
    markMissingEvidence("payload.runtime.lastFormResultSummary", "Form feedback produced");
  }

  const hasWorkoutCompletionSignal = runtime.workoutCompleted === true || Boolean(runtime.lastFormResultSummary) || Boolean(sessionSaveFailure === null && payload?.errors);
  if (!hasWorkoutCompletionSignal) {
    blockers.push("Workout cannot complete.");
    recommendedFixes.push("Capture completion diagnostics (form result or completion event).");
    evidence.push("payload.runtime.lastFormResultSummary");
  }
  if (runtime.workoutCompleted == null) {
    markMissingEvidence("payload.runtime.workoutCompleted", "Workout completed");
  }

  if (runtime.sessionSaveSuccess == null) {
    markMissingEvidence("payload.runtime.sessionSaveSuccess", "Session save success");
  }

  if (hasCriticalRouteFailures(routeCheck)) {
    blockers.push("Critical routes failing.");
    recommendedFixes.push("Fix failing diagnostics routes before pilot.");
    evidence.push("routeCheck.checks[*].classification");
  }

  const avatarRuntime = runtime.avatarRuntimeStatus || null;
  if (avatarRuntime && avatarRuntime.failedReason && !/failed|error|denied|blocked/i.test(cameraStatus)) {
    warnings.push("Avatar runtime failed while camera mode may still work.");
    recommendedFixes.push("Investigate avatar runtime (Three.js/GLB pipeline) without blocking pilot.");
    evidence.push("payload.runtime.avatarRuntimeStatus.failedReason");
  }

  if (openAiSummaryStatus !== "ok") {
    warnings.push("OpenAI summarizer unavailable.");
    evidence.push("openAiSummaryStatus");
  }
  if (!report || report.openAiSummaryStatus == null) {
    markMissingEvidence("openAiSummaryStatus", "OpenAI summary availability");
  }

  const unknownExerciseMapping = runtime.lastFormResultSummary?.movementFamily === "UNKNOWN";
  if (unknownExerciseMapping) {
    warnings.push("Some exercises map to UNKNOWN movement family.");
    evidence.push("payload.runtime.lastFormResultSummary.movementFamily");
  }

  if (runtime.deviceType === "mobile" || build.deviceType === "mobile") {
    warnings.push("Mobile performance should be verified for pilot.");
    evidence.push("payload.build.deviceType");
  }

  let pilotStatus = PILOT_STATUS.READY;
  if (!payload || payload.collectorMissing) {
    pilotStatus = PILOT_STATUS.BLOCKED_UNKNOWN;
  } else if (blockers.length === 0 && warnings.length === 0 && missingEvidence.length > 0) {
    pilotStatus = PILOT_STATUS.BLOCKED_UNKNOWN;
  } else if (blockers.length > 0) {
    pilotStatus = PILOT_STATUS.NOT_READY;
  } else if (warnings.length > 0) {
    pilotStatus = PILOT_STATUS.READY_WITH_WARNINGS;
  }

  const confidence = blockers.length > 0 ? 0.9 : (warnings.length > 0 ? 0.75 : 0.8);
  const codexFixMessage = blockers[0] || warnings[0] || "Pilot checks look healthy.";

  return {
    pilotStatus,
    blockers,
    warnings,
    missingEvidence,
    evidence,
    recommendedFixes,
    codexFixMessage,
    confidence,
    lastCheckedAt: new Date().toISOString()
  };
}

module.exports = {
  PILOT_STATUS,
  evaluatePilotReadiness
};
