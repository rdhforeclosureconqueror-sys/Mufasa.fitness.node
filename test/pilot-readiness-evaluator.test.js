"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePilotReadiness } = require("../src/lib/pilotReadinessEvaluator");

function makeBaseReport() {
  return {
    payload: {
      build: { appBuildVersion: "2026.04.26", deviceType: "desktop" },
      runtime: {
        cameraStatus: "connected",
        formEngineStatus: { loaded: true },
        selectedExercise: "air_squat",
        lastFormResultSummary: { movementFamily: "SQUAT", repValid: true },
        avatarRuntimeStatus: { ready: true }
      },
      routesAndScripts: { formEngineLoaded: true },
      errors: { recentConsoleErrors: [], recentConsoleWarnings: [], sessionSaveFailureReason: null }
    },
    routeCheck: {
      checks: [{ route: "/api/me", classification: "PROTECTED" }, { route: "/health", classification: "PASS" }],
      failCount: 0,
      protectedCount: 1
    },
    openAiSummaryStatus: "ok"
  };
}

test("camera failure yields NOT_READY", () => {
  const report = makeBaseReport();
  report.payload.runtime.cameraStatus = "failed_permission_denied";
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "NOT_READY");
  assert.ok(result.blockers.some((entry) => /camera/i.test(entry)));
});

test("avatar failure only yields READY_WITH_WARNINGS", () => {
  const report = makeBaseReport();
  report.payload.runtime.avatarRuntimeStatus = { failedReason: "gltf_load_failed" };
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY_WITH_WARNINGS");
  assert.equal(result.blockers.length, 0);
  assert.ok(result.warnings.some((entry) => /avatar runtime/i.test(entry)));
});

test("healthy report yields READY", () => {
  const report = makeBaseReport();
  const result = evaluatePilotReadiness(report);
  assert.equal(result.pilotStatus, "READY");
});
