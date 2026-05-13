(function initRuntimeState(globalScope){
  "use strict";
  const global = globalScope || window;
  const DEFAULT_BRAIN_BASE_URL = "https://mufasabrain.onrender.com";
  const DEFAULT_REQUIRED_POSE_DEPS = [
    {
      label: "TensorFlow.js",
      globalName: "tf",
      src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.14.0/dist/tf.min.js"
    },
    {
      label: "MoveNet pose-detection",
      globalName: "poseDetection",
      src: "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js"
    }
  ];
  const DEFAULT_OPTIONAL_POSE_DEPS = [
    {
      label: "Face landmarks detection",
      globalName: "faceLandmarksDetection",
      src: "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.5/dist/face-landmarks-detection.min.js"
    },
    {
      label: "Hand pose detection",
      globalName: "handPoseDetection",
      src: "https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.1/dist/hand-pose-detection.min.js"
    }
  ];
  const DEFAULT_POSE_SCRIPTS = [
    ...DEFAULT_REQUIRED_POSE_DEPS.map((dep) => dep.src),
    ...DEFAULT_OPTIONAL_POSE_DEPS.map((dep) => dep.src)
  ];
  let poseRuntimePromise = null;
  let headPerfStart = null;

  function log(tag, payload){ console.log(`[RUNTIME_STATE] ${tag}`, payload || ""); }

  function initStartupResourceAudit(initialScripts){
    global.__startupResourceAudit = global.__startupResourceAudit || {
      initialScripts: initialScripts || [],
      deferredScripts: [],
      deferredModules: []
    };
    return global.__startupResourceAudit;
  }

  function initPerfMetrics(){
    global.__perfMetrics = global.__perfMetrics || { marks: {}, values: {} };
    global.__markPerfMetric = function markPerfMetric(name, value) {
      const perf = global.__perfMetrics || (global.__perfMetrics = { marks: {}, values: {} });
      perf.values[name] = Number(value);
      perf.marks[name] = new Date().toISOString();
      return perf.values[name];
    };
    if (headPerfStart === null && global.performance?.now) headPerfStart = performance.now();
    global.__appPerfStart = headPerfStart;
    return global.__perfMetrics;
  }

  function installScriptLoader(){
    const lazyScriptCache = global.__lazyScriptCache || (global.__lazyScriptCache = new Map());
    global.__loadExternalScript = function loadExternalScript(src, { async = true, defer = true } = {}) {
      if (lazyScriptCache.has(src)) return lazyScriptCache.get(src);
      const task = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = async;
        script.defer = defer;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`script_load_failed:${src}`));
        document.head.appendChild(script);
      });
      lazyScriptCache.set(src, task);
      global.__startupResourceAudit?.deferredScripts?.push(src);
      return task;
    };
    return global.__loadExternalScript;
  }

  function createMissingDependencyError(dep, phase) {
    const src = dep?.src || "unknown_script";
    const globalName = dep?.globalName || "unknown_global";
    const error = new Error(`missing_dependency:${globalName}:${phase}:${src}`);
    error.code = "POSE_RUNTIME_DEPENDENCY_MISSING";
    error.dependency = globalName;
    error.scriptSrc = src;
    error.phase = phase;
    return error;
  }

  async function loadRuntimeDependency(dep, { required = true } = {}) {
    if (global[dep.globalName]) return true;
    await global.__loadExternalScript(dep.src, { async: false, defer: false });
    if (global[dep.globalName]) return true;
    const error = createMissingDependencyError(dep, "after_script_load");
    if (required) throw error;
    console.warn("[RUNTIME_STATE] optional pose dependency unavailable", error.message);
    return false;
  }

  function normalizeConfiguredPoseScripts(poseScripts) {
    if (!Array.isArray(poseScripts) || !poseScripts.length) {
      return {
        requiredDeps: DEFAULT_REQUIRED_POSE_DEPS,
        optionalDeps: DEFAULT_OPTIONAL_POSE_DEPS
      };
    }
    return {
      requiredDeps: [
        { label: "TensorFlow.js", globalName: "tf", src: poseScripts.find((src) => /@tensorflow\/tfjs/.test(src)) || "configured_pose_scripts" },
        { label: "MoveNet pose-detection", globalName: "poseDetection", src: poseScripts.find((src) => /@tensorflow-models\/pose-detection/.test(src)) || "configured_pose_scripts" }
      ],
      optionalDeps: [
        { label: "Face landmarks detection", globalName: "faceLandmarksDetection", src: poseScripts.find((src) => /face-landmarks-detection/.test(src)) },
        { label: "Hand pose detection", globalName: "handPoseDetection", src: poseScripts.find((src) => /hand-pose-detection/.test(src)) }
      ].filter((dep) => dep.src)
    };
  }

  function installPoseRuntimeEnsurer(poseScripts){
    const configuredScripts = Array.isArray(poseScripts) && poseScripts.length ? poseScripts : DEFAULT_POSE_SCRIPTS;
    const { requiredDeps, optionalDeps } = normalizeConfiguredPoseScripts(poseScripts);
    global.__ensurePoseRuntime = async function ensurePoseRuntime() {
      if (poseRuntimePromise) return poseRuntimePromise;
      const startedAt = performance.now();
      poseRuntimePromise = (async () => {
        for (const src of configuredScripts) {
          const knownDependency = [...requiredDeps, ...optionalDeps].find((dep) => dep.src === src);
          if (!knownDependency) await global.__loadExternalScript(src, { async: false, defer: false });
        }
        for (const dep of requiredDeps) await loadRuntimeDependency(dep, { required: true });
        for (const dep of optionalDeps) {
          try {
            await loadRuntimeDependency(dep, { required: false });
          } catch (err) {
            console.warn("[RUNTIME_STATE] optional pose dependency load failed", err);
          }
        }
        global.__markPerfMetric?.("poseModelLoadMs", Math.round(performance.now() - startedAt));
        return true;
      })();
      return poseRuntimePromise;
    };
    return global.__ensurePoseRuntime;
  }

  function isAvatarFeatureEnabled(){
    return global.ENABLE_AVATAR_FEATURE === true;
  }

  function initHeadRuntime(config){
    const avatarFeatureEnabled = isAvatarFeatureEnabled();
    const initialScripts = config?.initialScripts || [
      "/form-engine.js",
      "/runtime-events.js",
      "/runtime-state.js",
      "/runtime-bridges.js",
      "/auth-state-runtime.js",
      "/diagnostics-client.js",
      "/backend-read.js",
      "/session-write.js",
      "/pose-runtime.js",
      "/rep-runtime.js",
      "/rep-analysis-runtime.js",
      "/hud-runtime.js",
      "/workout-progression-runtime.js",
      "/dashboard-runtime.js",
      "/coach-runtime.js",
      ...(avatarFeatureEnabled ? ["/avatar-runtime.js"] : []),
      "/landing-diagnostics.js",
      "/fitness.js"
    ];
    initStartupResourceAudit(initialScripts);
    initPerfMetrics();
    installScriptLoader();
    installPoseRuntimeEnsurer(config?.poseScripts);
    global.__avatarRuntimeStatus = global.__avatarRuntimeStatus || {};
    global.__avatarRuntimeStatus.featureEnabled = avatarFeatureEnabled;
    global.__avatarRuntimeStatus.featureDisabled = !avatarFeatureEnabled;
    if (!avatarFeatureEnabled) global.__avatarRuntimeStatus.disabledReason = "ENABLE_AVATAR_FEATURE_FALSE";
    log("head-runtime-initialized", { initialScripts: global.__startupResourceAudit.initialScripts.length, avatarFeatureEnabled });
    return { perfStart: headPerfStart, audit: global.__startupResourceAudit };
  }

  function trimTrailingSlash(value){
    return String(value || "").trim().replace(/\/+$/g, "");
  }

  function normalizeBackendOrigin(value){
    const raw = trimTrailingSlash(value);
    if (!raw) return "";
    if (!/^[a-z][a-z\d+.-]*:/i.test(raw)) return "";
    try {
      return new URL(raw).origin;
    } catch (_) {
      return "";
    }
  }

  function getBackendOrigin(){
    const configuredOrigin = [
      global.MAAT_BACKEND_ORIGIN,
      global.MAAT_NODE_BASE_URL,
      global.__MAAT_BACKEND_ORIGIN,
      global.__MAAT_RUNTIME_CONFIG?.backendOrigin,
      global.__MAAT_RUNTIME_CONFIG?.nodeBaseUrl
    ].map(normalizeBackendOrigin).find(Boolean);
    const locationOrigin = normalizeBackendOrigin(global.location?.origin);
    const nodeBaseUrl = configuredOrigin || locationOrigin;
    try { global.localStorage?.setItem("maatNodeBaseUrl", nodeBaseUrl); } catch (_) {}
    return nodeBaseUrl;
  }

  function getEndpoints(){
    const nodeBaseUrl = getBackendOrigin();
    const brainBaseUrl = DEFAULT_BRAIN_BASE_URL;
    return Object.freeze({
      brainBaseUrl,
      askUrl: `${brainBaseUrl}/ask`,
      programUrl: `${brainBaseUrl}/coach/program/generate`,
      nodeBaseUrl,
      nodeCommandUrl: `${nodeBaseUrl}/command`,
      nodeProfileUrl: `${nodeBaseUrl}/api/me/profile`,
      nodeSessionStartUrl: `${nodeBaseUrl}/api/sessions`,
      nodeOhsaUrl: `${nodeBaseUrl}/api/ohsa`,
      nodePilotEventsUrl: `${nodeBaseUrl}/api/pilot/events`,
      aiVoiceUrl: `${nodeBaseUrl}/api/speak`,
      legacyFallbackRequireExplicitActions: true,
      legacyFallbackAllowedActions: []
    });
  }

  function createBackendReadClient(){
    return global.MufasaBackendRead?.createClient({ baseUrl: getBackendOrigin(), storagePrefix: "maat" });
  }

  function getHeadPerfStart(){ return headPerfStart; }

  global.RuntimeState = {
    initHeadRuntime,
    isAvatarFeatureEnabled,
    getBackendOrigin,
    getEndpoints,
    createBackendReadClient,
    getHeadPerfStart
  };
})(typeof window !== "undefined" ? window : globalThis);
