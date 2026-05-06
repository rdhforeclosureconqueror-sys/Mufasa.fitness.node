(function initRuntimeBridges(globalScope){
  "use strict";
  const global = globalScope || window;

  function log(tag, payload){ console.log(`[RUNTIME_BRIDGE] ${tag}`, payload || ""); }

  function installAuthDebugBridge(){
    const state = {
      authScriptLoaded: false,
      formFound: false,
      loginButtonFound: false,
      createButtonFound: false,
      loginClicked: false,
      createClicked: false
    };
    function writeStatus() {
      const el = document.getElementById("authDebugStatus");
      if (!el) return;
      el.textContent = [
        `AUTH SCRIPT LOADED: ${state.authScriptLoaded ? "yes" : "no"}`,
        `FORM FOUND: ${state.formFound ? "yes" : "no"}`,
        `LOGIN BUTTON FOUND: ${state.loginButtonFound ? "yes" : "no"}`,
        `CREATE BUTTON FOUND: ${state.createButtonFound ? "yes" : "no"}`,
        `LOGIN CLICKED: ${state.loginClicked ? "yes" : "no"}`,
        `CREATE CLICKED: ${state.createClicked ? "yes" : "no"}`
      ].join("\n");
    }
    global.__setAuthDebugState = function __setAuthDebugState(patch) {
      Object.assign(state, patch || {});
      writeStatus();
    };
    global.__authLoginButtonClicked = function __authLoginButtonClicked(event) {
      global.__setAuthDebugState({ loginClicked: true });
      if (typeof global.handleLoginButtonClick === "function") return global.handleLoginButtonClick(event);
      return undefined;
    };
    global.__authCreateAccountClicked = function __authCreateAccountClicked(event) {
      global.__setAuthDebugState({ createClicked: true });
      if (typeof global.handleCreateAccountToggle === "function") return global.handleCreateAccountToggle(event);
      return undefined;
    };
    writeStatus();
    log("auth-debug", "installed");
    return true;
  }

  function installAvatarRetryBridge(){
    global.__retryAvatarRuntime = async function retryAvatarRuntimeBootstrapStub() {
      await global.__ensureAvatarThreeModules();
      return { ok: Boolean(global.__AVATAR_THREE?.ready) };
    };
    log("avatar-retry", "installed");
    return true;
  }

  function createCanvasContextRouter(routes){
    const canvasContextTypes = new WeakMap();
    const canvasRouteLabels = new WeakMap();
    Object.entries(routes || {}).forEach(([label, canvas]) => {
      if (canvas) canvasRouteLabels.set(canvas, label);
    });
    function getCanvasContextType(canvas) { return canvasContextTypes.get(canvas) || null; }
    function requestCanvasContext(canvas, requestedType) {
      if (!canvas || !requestedType) return null;
      const route = canvasRouteLabels.get(canvas) || canvas.id || "unknown";
      const existingType = getCanvasContextType(canvas);
      const conflictDetected = Boolean(existingType && existingType !== requestedType);
      if (route === "avatar3d" || route === "skeleton") console.log(`[canvas-route] ${route} context requested: ${requestedType}`);
      if (route === "avatar3d") console.log(`[canvas-route] conflict detected ${conflictDetected ? "yes" : "no"}`);
      if (conflictDetected) {
        console.warn("[canvas-route] context conflict", { canvasId: canvas.id || "unknown", route, requestedType, existingType });
        return null;
      }
      const context = canvas.getContext(requestedType);
      if (context && !existingType) canvasContextTypes.set(canvas, requestedType);
      return context;
    }
    log("canvas-context-router", Object.keys(routes || {}));
    return { getCanvasContextType, requestCanvasContext };
  }

  function describeElement(el) {
    if (!el || typeof el !== "object") return "none";
    const id = el.id ? `#${el.id}` : "";
    const classes = (el.className && typeof el.className === "string")
      ? "." + el.className.trim().split(/\s+/).filter(Boolean).join(".")
      : "";
    return `${el.tagName?.toLowerCase?.() || "node"}${id}${classes}`;
  }

  global.RuntimeBridges = {
    installAuthDebugBridge,
    installAvatarRetryBridge,
    createCanvasContextRouter,
    describeElement
  };
})(typeof window !== "undefined" ? window : globalThis);
