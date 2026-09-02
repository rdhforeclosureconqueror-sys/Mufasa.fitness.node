(function initRuntimeEvents(globalScope){
  "use strict";
  const global = globalScope || window;
  const installed = global.__runtimeEventsInstalled || (global.__runtimeEventsInstalled = {});

  function log(tag, message, payload){
    const prefix = `[RUNTIME_EVENTS] ${tag}`;
    if (payload !== undefined) console.log(prefix, message, payload);
    else console.log(prefix, message);
  }

  function installBootErrorListeners(){
    if (installed.bootErrorListeners) return false;
    installed.bootErrorListeners = true;
    global.addEventListener("error", (event) => {
      console.error("[BOOT_ERROR]", event.message, event.filename, event.lineno);
    });
    global.addEventListener("unhandledrejection", (event) => {
      console.error("[BOOT_PROMISE_ERROR]", event.reason);
    });
    log("boot-error-listeners", "installed");
    return true;
  }

  function installBootFailureStatusBridge(updateAppBootStatus){
    if (installed.bootFailureStatusBridge) return false;
    installed.bootFailureStatusBridge = true;
    global.addEventListener("error", (event) => {
      const reason = event?.error?.message || event?.message || "unknown_error";
      if (typeof updateAppBootStatus === "function") updateAppBootStatus("boot failed", reason);
    });
    log("boot-failure-status", "installed");
    return true;
  }

  function installLastAppErrorBridge(config){
    if (installed.lastAppErrorBridge) return false;
    installed.lastAppErrorBridge = true;
    const updateActivationStatusPanel = config?.updateActivationStatusPanel;
    global.addEventListener("error", (event) => {
      const message = event?.error?.message || event?.message || "unknown_error";
      global.__lastAppError = message;
      console.error("[APP_ERROR]", event?.error || event?.message || event);
      if (typeof updateActivationStatusPanel === "function") updateActivationStatusPanel("runtime-error");
    });
    global.addEventListener("unhandledrejection", (event) => {
      const reason = event?.reason?.message || String(event?.reason || "unknown_promise_error");
      global.__lastAppError = reason;
      console.error("[APP_PROMISE_ERROR]", event?.reason || event);
      if (typeof updateActivationStatusPanel === "function") updateActivationStatusPanel("runtime-promise-error");
    });
    log("last-app-error", "installed");
    return true;
  }

  function installLoadPerfMark(config){
    if (installed.loadPerfMark) return false;
    installed.loadPerfMark = true;
    const startedAt = Number(config?.startedAt || global.__appPerfStart || 0);
    global.addEventListener("load", () => {
      if (typeof global.__markPerfMetric === "function") {
        global.__markPerfMetric("appLoadMs", Math.round(performance.now() - startedAt));
      }
    }, { once: true });
    log("load-perf-mark", "installed");
    return true;
  }

  function installWorkoutAvatarMobileFraming(){
    if (installed.workoutAvatarMobileFraming) return false;
    const path = String(global.location?.pathname || "");
    if (!/(^|\/)workout(?:\.html)?$/.test(path)) return false;
    installed.workoutAvatarMobileFraming = true;

    let resizeObserver = null;
    let retryTimer = 0;
    let retryCount = 0;
    let frameQueued = false;

    function status(){
      return global.__avatarRuntimeStatus || (global.__avatarRuntimeStatus = {});
    }

    function presentationRect(){
      const canvas = global.document?.getElementById?.("avatar3d") || null;
      const root = global.document?.getElementById?.("workoutPresentation") || canvas?.parentElement || null;
      const rect = root?.getBoundingClientRect?.() || canvas?.getBoundingClientRect?.() || null;
      if (!rect) return null;
      const width = Math.max(0, Number(rect.width || 0));
      const height = Math.max(0, Number(rect.height || 0));
      return width > 0 && height > 0 ? { width, height } : null;
    }

    function centerAvatarRoot(runtime){
      const root = runtime?.avatarRoot || null;
      if (!root) return { centered:false, correctionX:0, reason:"avatar_root_missing" };
      const runtimeStatus = status();
      if (runtimeStatus.personDetected === true) return { centered:false, correctionX:0, reason:"live_pose_owns_root" };
      const THREE = runtime?.THREE || global.__AVATAR_THREE?.THREE || null;
      if (!THREE?.Box3 || !THREE?.Vector3) return { centered:false, correctionX:0, reason:"three_bounds_unavailable" };
      try {
        root.updateMatrixWorld?.(true);
        const box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty?.()) return { centered:false, correctionX:0, reason:"avatar_bounds_empty" };
        const center = box.getCenter(new THREE.Vector3());
        const correctionX = Number.isFinite(center.x) ? -center.x : 0;
        if (Math.abs(correctionX) > 0.0005 && root.position) {
          root.position.x = Number(root.position.x || 0) + correctionX;
          root.updateMatrixWorld?.(true);
        }
        return { centered:true, correctionX, reason:"baseline_centered" };
      } catch (error) {
        return { centered:false, correctionX:0, reason:`bounds_failed:${String(error?.message || error || "unknown")}` };
      }
    }

    function apply(reason="unknown"){
      frameQueued = false;
      const runtime = global.__avatarThreeOwner || null;
      const canvas = global.document?.getElementById?.("avatar3d") || runtime?.renderer?.domElement || null;
      const rect = presentationRect();
      if (!runtime?.renderer || !runtime?.camera || !canvas || !rect) {
        const s = status();
        s.mobileAvatarFramingState = "WAITING_FOR_RUNTIME";
        s.mobileAvatarFramingReason = reason;
        return false;
      }

      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      runtime.renderer.setSize?.(width, height, false);
      runtime.camera.aspect = width / height;
      runtime.camera.updateProjectionMatrix?.();

      const centered = centerAvatarRoot(runtime);
      const s = status();
      s.mobileAvatarFramingState = centered.centered ? "CENTERED" : "VIEWPORT_ALIGNED";
      s.mobileAvatarFramingReason = centered.reason;
      s.mobileAvatarFramingTrigger = reason;
      s.mobilePresentationViewport = `${width}x${height}`;
      s.mobileAvatarCenterCorrectionX = centered.correctionX;
      s.mobileAvatarCentered = Boolean(centered.centered);
      s.mobileAvatarFramingUpdatedAt = new Date().toISOString();
      s.rendererDimensions = `${width}x${height}`;
      log("workout-avatar-mobile-framing", "applied", {
        reason,
        viewport: s.mobilePresentationViewport,
        centered: s.mobileAvatarCentered,
        correctionX: s.mobileAvatarCenterCorrectionX,
        ownership: centered.reason
      });
      return true;
    }

    function queue(reason){
      if (frameQueued) return;
      frameQueued = true;
      (global.requestAnimationFrame || global.setTimeout)(() => apply(reason), 0);
    }

    function retry(reason){
      if (retryTimer) global.clearTimeout(retryTimer);
      retryCount = 0;
      const tick = () => {
        retryCount += 1;
        if (apply(`${reason}:attempt_${retryCount}`) || retryCount >= 20) {
          retryTimer = 0;
          return;
        }
        retryTimer = global.setTimeout(tick, 100);
      };
      tick();
    }

    global.addEventListener("load", () => {
      retry("window_load");
      const target = global.document?.getElementById?.("workoutPresentation") || null;
      if (target && global.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => queue("presentation_resize"));
        resizeObserver.observe(target);
      }
    }, { once:true });
    global.addEventListener("avatar-three-ready", () => retry("avatar_three_ready"));
    global.addEventListener("pocketpt:avatar-presentation-changed", () => retry("presentation_mode_changed"));
    global.addEventListener("resize", () => queue("window_resize"));
    global.addEventListener("orientationchange", () => global.setTimeout(() => queue("orientation_change"), 120));
    global.addEventListener("pagehide", () => {
      if (retryTimer) global.clearTimeout(retryTimer);
      resizeObserver?.disconnect?.();
      retryTimer = 0;
      resizeObserver = null;
    }, { once:true });

    log("workout-avatar-mobile-framing", "installed");
    return true;
  }

  global.RuntimeEvents = {
    installBootErrorListeners,
    installBootFailureStatusBridge,
    installLastAppErrorBridge,
    installLoadPerfMark,
    installWorkoutAvatarMobileFraming
  };

  installWorkoutAvatarMobileFraming();
})(typeof window !== "undefined" ? window : globalThis);
