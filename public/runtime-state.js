(function initRuntimeState(globalScope){
  "use strict";
  const global = globalScope || window;
  const DEFAULT_NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const DEFAULT_BRAIN_BASE_URL = "https://mufasabrain.onrender.com";
  const DEFAULT_POSE_SCRIPTS = [
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.14.0/dist/tf.min.js",
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@0.0.6/dist/pose-detection.min.js",
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@1.0.5/dist/face-landmarks-detection.min.js",
    "https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.1/dist/hand-pose-detection.min.js"
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

  function installPoseRuntimeEnsurer(poseScripts){
    const scripts = Array.isArray(poseScripts) && poseScripts.length ? poseScripts : DEFAULT_POSE_SCRIPTS;
    global.__ensurePoseRuntime = async function ensurePoseRuntime() {
      if (poseRuntimePromise) return poseRuntimePromise;
      const startedAt = performance.now();
      poseRuntimePromise = (async () => {
        for (const src of scripts) await global.__loadExternalScript(src);
        global.__markPerfMetric?.("poseModelLoadMs", Math.round(performance.now() - startedAt));
        return true;
      })();
      return poseRuntimePromise;
    };
    return global.__ensurePoseRuntime;
  }

  function initHeadRuntime(config){
    const initialScripts = config?.initialScripts || [
      "/form-engine.js",
      "/runtime-events.js",
      "/runtime-state.js",
      "/runtime-bridges.js",
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
      "/avatar-runtime.js",
      "/landing-diagnostics.js",
      "/fitness.js"
    ];
    initStartupResourceAudit(initialScripts);
    initPerfMetrics();
    installScriptLoader();
    installPoseRuntimeEnsurer(config?.poseScripts);
    global.__avatarRuntimeStatus = global.__avatarRuntimeStatus || {};
    log("head-runtime-initialized", { initialScripts: global.__startupResourceAudit.initialScripts.length });
    return { perfStart: headPerfStart, audit: global.__startupResourceAudit };
  }

  function getEndpoints(){
    const nodeBaseUrl = DEFAULT_NODE_BASE_URL;
    const brainBaseUrl = DEFAULT_BRAIN_BASE_URL;
    try { global.localStorage?.setItem("maatNodeBaseUrl", nodeBaseUrl); } catch (_) {}
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
    return global.MufasaBackendRead?.createClient({ baseUrl: DEFAULT_NODE_BASE_URL, storagePrefix: "maat" });
  }

  function getHeadPerfStart(){ return headPerfStart; }

  global.RuntimeState = {
    initHeadRuntime,
    getEndpoints,
    createBackendReadClient,
    getHeadPerfStart
  };
})(typeof window !== "undefined" ? window : globalThis);
