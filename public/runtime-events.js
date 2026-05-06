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

  global.RuntimeEvents = {
    installBootErrorListeners,
    installBootFailureStatusBridge,
    installLastAppErrorBridge,
    installLoadPerfMark
  };
})(typeof window !== "undefined" ? window : globalThis);
