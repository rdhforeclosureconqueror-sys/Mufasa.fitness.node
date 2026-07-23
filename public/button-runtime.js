(function initButtonRuntime(globalScope){
  "use strict";

  function logBind(name) { console.log(`[BUTTON_BIND] ${name} bound`); }
  function logClick(name) { console.log(`[BUTTON_CLICK] ${name} clicked`); }
  function markClick(name) { globalScope.__lastAppButtonClicked = name; }

  function setPrimaryButtonsEnabled(enabled, refs){
    refs = refs || {};
    [refs.dashboardBtn, refs.exerciseLibraryBtn, refs.connectBtn, refs.startBtn, refs.runSystemDiagnosticBtn, refs.saveProfileFormBtn, refs.calendarApplyBtn]
      .filter(Boolean)
      .forEach((el) => {
        if (enabled) {
          el.disabled = false;
          el.removeAttribute("disabled");
          el.style.pointerEvents = "auto";
        } else {
          el.disabled = true;
          el.setAttribute("disabled", "disabled");
          el.style.pointerEvents = "none";
        }
      });
  }

  const primaryButtonState = { refs: {}, deps: {} };

  function configurePrimaryButtonsAfterLogin(config){
    const { refs = {}, deps = {} } = config || {};
    primaryButtonState.refs = refs || {};
    primaryButtonState.deps = deps || {};
    return globalScope.bindPrimaryButtonsAfterLogin;
  }

  function bindPrimaryButtonsAfterLoginRuntime(config){
    const {
      reason = "manual",
      refs = primaryButtonState.refs,
      deps = primaryButtonState.deps,
      enableNow = true
    } = config || {};
    const navBoundByAppCore = globalScope.bindPrimaryNavHandlers?.({ connectCamera: deps.connectCamera, addLog: deps.addLog });

    if (!navBoundByAppCore) {
      if (refs.dashboardBtn) refs.dashboardBtn.onclick = () => {
        logClick("dashboard");
        console.log("[FEATURE_CLICK] dashboard");
        markClick("dashboard");
        console.log("[APP_BUTTON] dashboard clicked");
        deps.updateActivationStatusPanel?.("dashboard click");
        globalScope.location.href = "/dashboard.html";
      };
      if (refs.exerciseLibraryBtn) refs.exerciseLibraryBtn.onclick = () => {
        logClick("workout_library");
        console.log("[FEATURE_CLICK] workout_library");
        markClick("library");
        console.log("[APP_BUTTON] library clicked");
        deps.updateActivationStatusPanel?.("library click");
        globalScope.location.href = "/exercise-library.html";
      };
      if (refs.connectBtn) refs.connectBtn.onclick = async () => {
        logClick("camera");
        console.log("[FEATURE_CLICK] camera");
        markClick("camera");
        console.log("[APP_BUTTON] camera clicked");
        deps.updateActivationStatusPanel?.("camera click");
        if (typeof globalScope.connectCamera !== "function") throw new Error("connectCamera unavailable");
        return globalScope.connectCamera();
      };
      if (refs.runSystemDiagnosticBtn) refs.runSystemDiagnosticBtn.onclick = async () => {
        logClick("diagnostics");
        markClick("diagnostics");
        console.log("[APP_BUTTON] diagnostics clicked");
        deps.updateActivationStatusPanel?.("diagnostics click");
        try {
          const report = await (globalScope.__collectDiagnosticReport?.() || Promise.resolve(null));
          deps.addLog?.("system", "Diagnostics complete" + (report ? "" : " (no report payload)") + ".");
        } catch (error) {
          deps.addLog?.("system", `Diagnostics failed: ${error?.message || error}`);
          throw error;
        }
      };
    }

    logBind("dashboard");
    logBind("camera");
    logBind("diagnostics");
    setPrimaryButtonsEnabled(enableNow, refs);
    if (deps.appShellEl) deps.appShellEl.style.pointerEvents = "auto";
    if (deps.authOverlayEl) {
      deps.authOverlayEl.hidden = true;
      deps.authOverlayEl.style.display = "none";
      deps.authOverlayEl.style.pointerEvents = "none";
    }
    deps.updateAuthPropagationStatus?.(`bindPrimaryButtonsAfterLogin:${reason}`);
    deps.updateActivationStatusPanel?.(`bindPrimaryButtonsAfterLogin:${reason}`);
    return Boolean(navBoundByAppCore);
  }

  function bindStartWorkoutButton(config){
    const { startBtn, startWorkout, nodeBaseUrl } = config || {};
    if (!startBtn) return false;
    startBtn.onclick = async () => {
      logClick("start_workout");
      console.log("[FEATURE_CLICK] start_workout");
      if (typeof globalScope.startWorkout !== "function" && typeof startWorkout !== "function") throw new Error("startWorkout unavailable");
      return (globalScope.startWorkout || startWorkout)();
    };
    logBind("start_workout");
    return true;
  }

  function bindPrimaryButtonsAfterLogin(reason = "manual"){
    const deps = primaryButtonState.deps || {};
    const enableNow = deps.isBootContractReady?.() || deps.bootStatus?.lastBootError !== "none";
    return bindPrimaryButtonsAfterLoginRuntime({ reason, enableNow });
  }

  globalScope.bindPrimaryButtonsAfterLogin = bindPrimaryButtonsAfterLogin;
  globalScope.ButtonRuntime = {
    configurePrimaryButtonsAfterLogin,
    bindPrimaryButtonsAfterLoginRuntime,
    bindStartWorkoutButton,
    setPrimaryButtonsEnabled
  };
})(window);
