/* =========================================================
   runtime-orchestrator.js — runtime registration/lifecycle wiring
========================================================= */
(function initRuntimeOrchestrator(global) {
  "use strict";

  const ORCHESTRATOR_TAG = "[RUNTIME_ORCHESTRATOR]";
  const READY_TAG = "[RUNTIME_READY]";
  const CONFIG_TAG = "[RUNTIME_CONFIG]";

  const state = {
    configured: [],
    ready: {},
    errors: [],
    primaryButtonBinder: null
  };

  function log(tag, message, payload) {
    if (payload !== undefined) console.log(tag, message, payload);
    else console.log(tag, message);
  }

  function renderVisibleError(message, error) {
    const err = error instanceof Error ? error : new Error(String(error || message || "runtime_orchestrator_error"));
    const entry = { message: String(message || err.message || "runtime_orchestrator_error"), at: new Date().toISOString() };
    state.errors.push(entry);
    global.__runtimeOrchestratorState = snapshot();
    console.error(ORCHESTRATOR_TAG, entry.message, err);
    const targets = [
      global.document?.getElementById?.("runtimeErrorStatus"),
      global.document?.getElementById?.("appBootStatus"),
      global.document?.getElementById?.("diagnosticStatus")
    ].filter(Boolean);
    targets.forEach((target) => {
      const previous = target.textContent && target.textContent.trim() ? `${target.textContent.trim()}\n` : "";
      target.textContent = `${previous}⚠️ ${entry.message}`.trim();
      target.classList?.add?.("status-bad");
    });
  }

  function requireRuntime(path, label) {
    const parts = String(path || "").split(".").filter(Boolean);
    let cursor = global;
    for (const part of parts) cursor = cursor?.[part];
    if (!cursor) throw new Error(`${label || path} missing`);
    return cursor;
  }

  function markConfigured(name, payload) {
    state.configured.push({ name, at: new Date().toISOString() });
    global.__runtimeOrchestratorState = snapshot();
    log(CONFIG_TAG, name, payload || {});
  }

  function markReady(name, payload) {
    state.ready[name] = { ready: true, at: new Date().toISOString(), ...(payload || {}) };
    global.__runtimeOrchestratorState = snapshot();
    log(READY_TAG, name, payload || {});
  }

  function configureCoachRuntime({ refs = {}, deps = {} } = {}) {
    try {
      requireRuntime("CoachRuntime.configure", "CoachRuntime.configure")({ refs, deps });
      markConfigured("coach-runtime", { hasVoiceUrl: Boolean(deps.voiceUrl) });
      return true;
    } catch (error) {
      renderVisibleError(`coach runtime configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configureWorkoutProgressionRuntime({ hud = {}, progression = {}, repAnalysis = {}, controls = {} } = {}) {
    try {
      requireRuntime("HudRuntime.configure", "HudRuntime.configure")(hud);
      requireRuntime("WorkoutProgressionRuntime.configure", "WorkoutProgressionRuntime.configure")(progression);
      const { skipRestBtn, repeatSetBtn, nextExerciseBtn } = controls || {};
      if (skipRestBtn) skipRestBtn.onclick = () => global.WorkoutProgressionRuntime.skipRest();
      if (repeatSetBtn) repeatSetBtn.onclick = () => global.WorkoutProgressionRuntime.repeatSet();
      if (nextExerciseBtn) nextExerciseBtn.onclick = () => global.WorkoutProgressionRuntime.nextExercise();
      requireRuntime("RepAnalysisRuntime.configure", "RepAnalysisRuntime.configure")(repAnalysis);
      markConfigured("workout-progression-runtime", {
        hasSessionWrite: Boolean(progression.sessionWrite),
        hasFormEngine: Boolean(repAnalysis.formEngine)
      });
      return true;
    } catch (error) {
      renderVisibleError(`workout progression runtime configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configureWorkoutRuntime(config = {}) {
    try {
      requireRuntime("WorkoutRuntime.configureWorkoutRuntime", "WorkoutRuntime.configureWorkoutRuntime")(config);
      markConfigured("workout-runtime", {
        hasDetectorGuard: typeof config.ensureDetectorReady === "function",
        hasSessionCreator: typeof config.createSession === "function"
      });
      return true;
    } catch (error) {
      renderVisibleError(`workout runtime configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configureAvatarRuntime({ refs = {}, deps = {}, messageHandler } = {}) {
    if (global.RuntimeState?.isAvatarFeatureEnabled?.() !== true && global.ENABLE_AVATAR_FEATURE !== true) {
      markConfigured("avatar-runtime-disabled", { reason: "ENABLE_AVATAR_FEATURE_FALSE" });
      return false;
    }
    try {
      global.AvatarRuntime?.bindControls?.({ refs, ...deps });
      if (typeof messageHandler === "function") global.addEventListener("message", messageHandler);
      markConfigured("avatar-runtime", { hasControls: Boolean(Object.keys(refs || {}).length) });
      return true;
    } catch (error) {
      renderVisibleError(`avatar runtime configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configureDashboardRuntime({ refreshOnAuthReady = true } = {}) {
    try {
      if (!global.MufasaDashboardRuntime) throw new Error("MufasaDashboardRuntime missing");
      if (refreshOnAuthReady) {
        global.addEventListener("auth:ready", () => {
          if (global.APP_AUTH?.isAuthenticated !== true) return;
          global.MufasaDashboardRuntime.refreshAll?.("auth:ready").catch((error) => {
            global.MufasaDashboardRuntime.renderVisibleError?.(error);
          });
        });
      }
      markConfigured("dashboard-runtime", { refreshOnAuthReady });
      return true;
    } catch (error) {
      renderVisibleError(`dashboard runtime configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configureAuthLifecycle({
    bindPrimaryButtonsAfterLogin,
    updateAuthPropagationStatus,
    updateActivationStatusPanel,
    runPendingPanelWatchdogs
  } = {}) {
    try {
      if (typeof bindPrimaryButtonsAfterLogin === "function") state.primaryButtonBinder = bindPrimaryButtonsAfterLogin;
      global.RuntimeEvents?.installLastAppErrorBridge?.({
        updateActivationStatusPanel: (reason) => updateActivationStatusPanel?.(reason === "runtime-error" ? "window error" : "window unhandledrejection")
      });
      global.addEventListener("auth:changed", () => {
        bindPrimaryButtonsAfterLogin?.("auth:changed");
        const dbg = global.__authPropagationDebug || (global.__authPropagationDebug = {});
        dbg.authChangedFired = true;
        dbg.lastAuthEventAt = new Date().toISOString();
        updateAuthPropagationStatus?.("auth:changed");
        updateActivationStatusPanel?.("auth:changed");
        markReady("auth:changed");
      });
      global.addEventListener("auth:ready", () => {
        const dbg = global.__authPropagationDebug || (global.__authPropagationDebug = {});
        dbg.authChangedFired = true;
        dbg.lastAuthEventAt = new Date().toISOString();
        updateAuthPropagationStatus?.("auth:ready");
        updateActivationStatusPanel?.("auth:ready");
        if (global.APP_AUTH?.isAuthenticated !== true) {
          alert("CRITICAL: AUTH NOT PROPAGATED");
        }
        markReady("auth:ready", { authenticated: global.APP_AUTH?.isAuthenticated === true });
      });
      global.addEventListener("load", () => {
        updateAuthPropagationStatus?.("window:load");
        updateActivationStatusPanel?.("window:load");
        markReady("window:load");
      });
      global.document?.addEventListener?.("DOMContentLoaded", () => {
        updateAuthPropagationStatus?.("dom:contentloaded");
        updateActivationStatusPanel?.("dom:contentloaded");
        runPendingPanelWatchdogs?.();
        markReady("dom:contentloaded");
      });
      markConfigured("auth-lifecycle", { hasPrimaryBinder: typeof bindPrimaryButtonsAfterLogin === "function" });
      return true;
    } catch (error) {
      renderVisibleError(`auth lifecycle configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configureBootLifecycle({ updateAuthPropagationStatus, renderSystemBootStatus, bootStatus, getActiveBlockingOverlay } = {}) {
    try {
      updateAuthPropagationStatus?.("boot");
      renderSystemBootStatus?.("boot");
      if (bootStatus) bootStatus.shellLoaded = true;
      renderSystemBootStatus?.("shell-loaded");
      markConfigured("boot-lifecycle", { shellLoaded: Boolean(bootStatus?.shellLoaded), activeOverlay: getActiveBlockingOverlay?.() });
      return true;
    } catch (error) {
      renderVisibleError(`boot lifecycle configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function configurePostLoginActivation({ refs = {}, deps = {} } = {}) {
    try {
      global.ButtonRuntime?.configurePrimaryButtonsAfterLogin?.({ refs, deps });
      state.primaryButtonBinder = global.bindPrimaryButtonsAfterLogin;
      markConfigured("post-login-activation", { buttons: Object.keys(refs || {}).filter((key) => Boolean(refs[key])) });
      return global.bindPrimaryButtonsAfterLogin;
    } catch (error) {
      renderVisibleError(`post-login activation configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function bindPrimaryButtonsAfterLogin(reason = "manual") {
    if (typeof state.primaryButtonBinder !== "function") return false;
    return state.primaryButtonBinder(reason);
  }

  function configureButtonRuntime({ refs = {}, deps = {}, handlers = {} } = {}) {
    try {
      if (refs.startBtn) global.ButtonRuntime?.bindStartWorkoutButton?.({ startBtn: refs.startBtn, startWorkout: handlers.startWorkout, nodeBaseUrl: deps.nodeBaseUrl });
      if (refs.fullscreenCameraBtn) refs.fullscreenCameraBtn.onclick = () => {
        const cameraActive = Boolean(global.WorkoutRuntime?.getState?.().cameraActive || global.document?.getElementById?.('video')?.srcObject);
        if (!cameraActive) {
          const message = 'Connect camera first.';
          const poseStatus = global.document?.getElementById?.('poseStatus');
          const featurePanel = global.document?.getElementById?.('featureActivationStatus');
          if (poseStatus) poseStatus.textContent = message;
          if (featurePanel && !String(featurePanel.textContent || '').includes(message)) {
            featurePanel.textContent = `${featurePanel.textContent || ''}\n${message}`.trim();
          }
          deps.addLog?.('system', message);
          return false;
        }
        return handlers.setCameraFullscreen?.(!deps.getCameraFullscreen?.());
      };
      if (refs.exitCameraBtn) refs.exitCameraBtn.onclick = () => handlers.setCameraFullscreen?.(false);
      if (refs.exitCameraMobileBtn) refs.exitCameraMobileBtn.onclick = () => handlers.setCameraFullscreen?.(false);
      if (refs.stopWorkoutFsBtn) refs.stopWorkoutFsBtn.onclick = () => { if (deps.isRunning?.()) handlers.startWorkout?.(); };
      if (refs.workoutToggleMobileBtn) {
        refs.workoutToggleMobileBtn.onclick = () => {
          const cameraActive = Boolean(global.WorkoutRuntime?.getState?.().cameraActive || global.document?.getElementById?.('video')?.srcObject);
          if (!cameraActive && !deps.isRunning?.()) {
            const message = 'Connect camera first.';
            const poseStatus = global.document?.getElementById?.('poseStatus');
            if (poseStatus) poseStatus.textContent = message;
            deps.addLog?.('system', message);
            return false;
          }
          handlers.startWorkout?.();
        };
      }
      if (refs.ohsaBtn) refs.ohsaBtn.onclick = handlers.startOhsa;
      if (refs.defineExerciseBtn) refs.defineExerciseBtn.onclick = handlers.startDefineExercise;
      markConfigured("button-runtime", { hasStart: Boolean(refs.startBtn), hasCameraFullscreen: Boolean(refs.fullscreenCameraBtn) });
      return true;
    } catch (error) {
      renderVisibleError(`button runtime configuration failed: ${error?.message || error}`, error);
      throw error;
    }
  }

  function snapshot() {
    return {
      configured: state.configured.slice(),
      ready: { ...state.ready },
      errors: state.errors.slice()
    };
  }

  global.RuntimeOrchestrator = {
    configureCoachRuntime,
    configureWorkoutProgressionRuntime,
    configureWorkoutRuntime,
    configureAvatarRuntime,
    configureDashboardRuntime,
    configureAuthLifecycle,
    configureBootLifecycle,
    configurePostLoginActivation,
    configureButtonRuntime,
    bindPrimaryButtonsAfterLogin,
    renderVisibleError,
    getState: snapshot
  };

  log(ORCHESTRATOR_TAG, "loaded");
})(typeof window !== "undefined" ? window : globalThis);
