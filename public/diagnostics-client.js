(function initDiagnostics(globalScope) {
  "use strict";

  const state = globalScope.__diagnosticsState || (globalScope.__diagnosticsState = {
    errors: [],
    warnings: [],
    lastAutoReports: Object.create(null)
  });

  function pushRing(list, entry, max = 30) {
    list.push(entry);
    if (list.length > max) list.splice(0, list.length - max);
  }

  if (!state.consoleHooked) {
    const origError = console.error;
    const origWarn = console.warn;
    console.error = function patchedError(...args) {
      pushRing(state.errors, { at: new Date().toISOString(), message: args.map(String).join(" ") });
      return origError.apply(console, args);
    };
    console.warn = function patchedWarn(...args) {
      pushRing(state.warnings, { at: new Date().toISOString(), message: args.map(String).join(" ") });
      return origWarn.apply(console, args);
    };
    state.consoleHooked = true;
  }

  function getDeviceType() {
    const ua = globalScope.navigator?.userAgent || "";
    if (/iPhone|Android.+Mobile|Mobile/i.test(ua)) return "mobile";
    if (/iPad|Tablet|Android/i.test(ua)) return "tablet";
    return "desktop";
  }

  function summarizeFormResult(result) {
    if (!result || typeof result !== "object") return null;
    return {
      overallStatus: result.overallStatus || null,
      overallScore: result.overallScore ?? null,
      movementFamily: result.movementFamily || null,
      repValid: Boolean(result.repValid)
    };
  }

  function sanitizePayload(payload = {}) {
    const clone = JSON.parse(JSON.stringify(payload || {}));
    delete clone.rawVideo;
    delete clone.cameraFrame;
    return clone;
  }

  function derivePilotEvidenceFromLocalEvents() {
    try {
      const raw = globalScope.localStorage?.getItem("maatPilotPerfV1");
      const entries = JSON.parse(raw || "[]");
      if (!Array.isArray(entries)) return {};
      const hasEvent = (name) => entries.some((entry) => entry?.event === name);
      return {
        workoutStarted: hasEvent("workout_started"),
        workoutCompleted: hasEvent("workout_completed"),
        sessionSaveSuccess: hasEvent("session_save_success")
      };
    } catch {
      return {};
    }
  }

  function collectDiagnosticReport() {
    const avatarRuntime = globalScope.__avatarRuntimeStatus || null;
    const formEngineStatus = globalScope.__formEngineStatus || null;
    const userAgent = globalScope.navigator?.userAgent || null;
    const derivedEvidence = derivePilotEvidenceFromLocalEvents();
    const retentionRuntime = globalScope.__retentionMotivationStatus || null;
    const perfMetrics = globalScope.__perfMetrics?.values || null;
    const dashboard = retentionRuntime?.dashboard || null;
    const hasReward = Boolean(dashboard?.rewardSummary?.workoutCompleted);
    const hasStreak = Number.isFinite(Number(dashboard?.streak?.currentStreak));
    const hasWeeklyReview = Boolean(dashboard?.weeklyReview?.weekSummary);
    const hasCoachMessages = Array.isArray(dashboard?.coachMessaging?.messages) && dashboard.coachMessaging.messages.length > 0;
    const hasNarrative = Boolean(dashboard?.progressNarrative?.nextMilestone);
    const hasHabitLoop = Boolean(dashboard?.habitLoopPrompts?.beforeWorkout);
    const payload = {
      build: {
        appBuildVersion: globalScope.APP_BUILD_VERSION || null,
        url: globalScope.location?.href || null,
        userAgent,
        deviceType: getDeviceType(),
        timestamp: new Date().toISOString(),
        loginDisabledForPilot: Boolean(globalScope.__pilotMode?.loginDisabledForPilot)
      },
      runtime: {
        avatarRuntimeStatus: avatarRuntime,
        formEngineStatus,
        lastBodyVisibility: globalScope.__lastBodyVisibility || null,
        lastFormResultSummary: summarizeFormResult(globalScope.__lastFormResult),
        cameraStatus: globalScope.__cameraStatus || null,
        cameraConnectSuccess: globalScope.__cameraConnectSuccess ?? null,
        cameraLastConnectedAt: globalScope.__cameraLastConnectedAt || null,
        selectedExercise: globalScope.__selectedExercise || null,
        workoutStarted: derivedEvidence.workoutStarted ?? null,
        workoutCompleted: derivedEvidence.workoutCompleted ?? null,
        sessionSaveSuccess: derivedEvidence.sessionSaveSuccess ?? null,
        movementFamily: globalScope.__movementFamily || null,
        renderMode: avatarRuntime?.renderMode || globalScope.__renderMode || null
      },
      performance: {
        appLoadMs: perfMetrics?.appLoadMs ?? null,
        loginReadyMs: perfMetrics?.loginReadyMs ?? null,
        dashboardReadyMs: perfMetrics?.dashboardReadyMs ?? null,
        cameraBootMs: perfMetrics?.cameraBootMs ?? null,
        poseModelLoadMs: perfMetrics?.poseModelLoadMs ?? null,
        avatarRuntimeLoadMs: perfMetrics?.avatarRuntimeLoadMs ?? null,
        avatarGlbLoadMs: perfMetrics?.avatarGlbLoadMs ?? null,
        workoutHudReadyMs: perfMetrics?.workoutHudReadyMs ?? null,
        progressScanBootMs: perfMetrics?.progressScanBootMs ?? null
      },
      routesAndScripts: {
        formEngineLoaded: Boolean(globalScope.__MUFASA_FORM_ENGINE),
        backendReadLoaded: Boolean(globalScope.MufasaBackendRead),
        sessionWriteLoaded: Boolean(globalScope.MufasaSessionWrite),
        fitnessLoaded: Boolean(globalScope.MufasaFitness),
        threeLoaded: Boolean(globalScope.__AVATAR_THREE?.THREE),
        gltfLoaderLoaded: Boolean(globalScope.__AVATAR_THREE?.GLTFLoader)
      },
      retention: {
        intakeComplete: retentionRuntime?.intakeComplete ?? null,
        goalSet: retentionRuntime?.goalSet ?? null,
        programAssigned: retentionRuntime?.programAssigned ?? null,
        firstWorkoutCompleted: retentionRuntime?.firstWorkoutCompleted ?? null,
        weeklyReviewReady: retentionRuntime?.weeklyReviewReady ?? hasWeeklyReview,
        progressNarrativeReady: retentionRuntime?.progressNarrativeReady ?? hasNarrative,
        postWorkoutRewardScreenReady: retentionRuntime?.postWorkoutRewardScreenReady ?? hasReward,
        streakSystemReady: retentionRuntime?.streakSystemReady ?? hasStreak,
        coachMessagingReady: retentionRuntime?.coachMessagingReady ?? hasCoachMessages,
        habitLoopReady: retentionRuntime?.habitLoopReady ?? hasHabitLoop,
        visualScanEnabled: retentionRuntime?.visualScanEnabled ?? null,
        visualScanUsed: retentionRuntime?.visualScanUsed ?? null
      },
      errors: {
        recentConsoleErrors: state.errors.slice(-10),
        recentConsoleWarnings: state.warnings.slice(-10),
        avatarRuntimeFailureReason: avatarRuntime?.failureReason || avatarRuntime?.failedReason || null,
        cameraFailureReason: globalScope.__cameraFailureReason || null,
        sessionSaveFailureReason: globalScope.__sessionSaveFailureReason || null
      }
    };
    return sanitizePayload(payload);
  }

  async function postDiagnostic(source, reason) {
    const report = collectDiagnosticReport();
    report.source = source;
    report.reason = reason || null;
    try {
      await fetch("/api/admin/diagnostics/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(report)
      });
    } catch {
      // local-only fallback
      globalScope.__lastDiagnosticReport = report;
    }
  }

  function throttledAutoReport(reason) {
    const now = Date.now();
    const prev = state.lastAutoReports[reason] || 0;
    if (now - prev < 60_000) return;
    state.lastAutoReports[reason] = now;
    postDiagnostic("runtime-event", reason);
  }

  globalScope.__collectDiagnosticReport = function stableCollectDiagnosticReport() {
    try {
      return collectDiagnosticReport();
    } catch (error) {
      return sanitizePayload({
        build: {
          appBuildVersion: globalScope.APP_BUILD_VERSION || null,
          url: globalScope.location?.href || null,
          userAgent: globalScope.navigator?.userAgent || null,
          deviceType: "unknown",
          timestamp: new Date().toISOString()
        },
        runtime: {
          avatarRuntimeStatus: null,
          formEngineStatus: null,
          lastBodyVisibility: null,
          lastFormResultSummary: null,
          cameraStatus: null,
          cameraConnectSuccess: null,
          cameraLastConnectedAt: null,
          selectedExercise: null,
          movementFamily: null,
          renderMode: null
        },
        routesAndScripts: {
          formEngineLoaded: false,
          backendReadLoaded: false,
          sessionWriteLoaded: false,
          fitnessLoaded: false,
          threeLoaded: false,
          gltfLoaderLoaded: false
        },
        errors: {
          recentConsoleErrors: state.errors.slice(-10),
          recentConsoleWarnings: state.warnings.slice(-10),
          collectorError: error?.message || String(error)
        }
      });
    }
  };
  globalScope.__runDiagnosticNow = () => postDiagnostic("manual", "manual_run");
  globalScope.__diagnosticAutoReport = throttledAutoReport;

  globalScope.addEventListener("avatar-three-failed", () => throttledAutoReport("avatar_runtime_failed"));
  globalScope.addEventListener("camera-connect-failed", () => throttledAutoReport("camera_connect_failed"));
  globalScope.addEventListener("session-save-failed", () => throttledAutoReport("session_save_failed"));
  globalScope.addEventListener("form-engine-failed", () => throttledAutoReport("form_engine_failed"));
  globalScope.addEventListener("stale-build-detected", () => throttledAutoReport("stale_build_detected"));
})(typeof window !== "undefined" ? window : globalThis);
