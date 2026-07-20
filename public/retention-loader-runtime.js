/* =========================================================
   retention-loader-runtime.js — retention flow lazy-loader ownership
========================================================= */
(function initRetentionLoaderRuntime(global) {
  "use strict";

  const LOADER_TAG = "[RETENTION_LOADER]";
  const READY_TAG = "[RETENTION_READY]";
  const ERROR_TAG = "[RETENTION_ERROR]";
  const DEFAULT_SCRIPT_SRC = "/retention-flow.js?v=20260720a";
  const DEFAULT_LOAD_TIMEOUT_MS = 10000;

  const state = {
    configured: false,
    scriptSrc: DEFAULT_SCRIPT_SRC,
    loadTimeoutMs: DEFAULT_LOAD_TIMEOUT_MS,
    status: "idle",
    attempts: 0,
    loaded: false,
    ready: false,
    lastSource: null,
    lastError: null,
    lastRefresh: null,
    authBridgeInstalled: false,
    startedAt: null,
    updatedAt: new Date().toISOString()
  };

  let bootPromise = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function stamp() {
    state.updatedAt = nowIso();
    global.__retentionLoaderState = snapshot();
  }

  function log(tag, message, payload) {
    if (payload !== undefined) console.log(tag, message, payload);
    else console.log(tag, message);
  }

  function asError(error, fallback) {
    if (error instanceof Error) return error;
    return new Error(String(error || fallback || "retention_loader_error"));
  }

  function withTimeout(task, timeoutMs, label) {
    const ms = Number(timeoutMs) || DEFAULT_LOAD_TIMEOUT_MS;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = global.setTimeout?.(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`${label || "retention_flow_load"}_timeout:${ms}ms`));
      }, ms);
      Promise.resolve(task).then(
        (value) => {
          if (settled) return;
          settled = true;
          if (timer) global.clearTimeout?.(timer);
          resolve(value);
        },
        (error) => {
          if (settled) return;
          settled = true;
          if (timer) global.clearTimeout?.(timer);
          reject(error);
        }
      );
    });
  }

  function findStatusEl() {
    return global.document?.getElementById?.("retentionFlowStatus") || null;
  }

  function findContentEl() {
    return global.document?.getElementById?.("retentionFlowContent") || null;
  }

  function setVisibleMessage(message, isError = false) {
    const statusEl = findStatusEl();
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList?.toggle?.("status-bad", Boolean(isError));
      statusEl.classList?.toggle?.("status-ok", !isError);
    }
    if (isError) {
      const contentEl = findContentEl();
      if (contentEl) {
        contentEl.textContent = message;
        contentEl.classList?.add?.("status-bad");
      }
    }
  }

  function isRuntimeAvailable() {
    return Boolean(global.__retentionFlowLoaded || typeof global.__retentionFlowRefresh === "function");
  }

  function clearCachedScript() {
    try {
      global.__lazyScriptCache?.delete?.(state.scriptSrc || DEFAULT_SCRIPT_SRC);
    } catch (_) {}
  }

  function markReady(source) {
    state.status = "ready";
    state.loaded = true;
    state.ready = true;
    state.lastSource = source || state.lastSource;
    state.lastError = null;
    stamp();
    log(READY_TAG, "retention flow ready", { source: state.lastSource, attempts: state.attempts });
    try {
      global.dispatchEvent?.(new CustomEvent("retention:loader-ready", { detail: snapshot() }));
    } catch (_) {}
    return true;
  }

  function recordError(scope, error) {
    const err = asError(error, scope);
    const entry = {
      scope,
      message: err.message || String(err),
      scriptSrc: state.scriptSrc,
      attempt: state.attempts,
      at: nowIso()
    };
    state.status = "error";
    state.ready = false;
    state.lastError = entry;
    stamp();
    const message = `Retention flow failed to load: ${entry.message}`;
    setVisibleMessage(message, true);
    log(ERROR_TAG, scope, entry);
    try {
      global.dispatchEvent?.(new CustomEvent("retention:loader-error", { detail: entry }));
    } catch (_) {}
    return entry;
  }

  async function loadScript(source) {
    const scriptSrc = state.scriptSrc || DEFAULT_SCRIPT_SRC;
    if (!global.document?.querySelector?.('link[data-retention-journey-style]')) {
      const style = global.document?.createElement?.("link");
      if (style) { style.rel = "stylesheet"; style.href = "/retention-journey-wizard.css?v=20260719"; style.dataset.retentionJourneyStyle = "true"; global.document.head?.appendChild?.(style); }
    }
    if (typeof global.__loadExternalScript === "function") {
      if (!global.RetentionJourneyWizard) await withTimeout(global.__loadExternalScript("/retention-journey-wizard.js?v=20260720b"), state.loadTimeoutMs, "retention_wizard_load");
      return withTimeout(global.__loadExternalScript(scriptSrc), state.loadTimeoutMs, "retention_flow_load");
    }
    return withTimeout(new Promise((resolve, reject) => {
      if (!global.document?.createElement) {
        reject(new Error("document_unavailable_for_retention_loader"));
        return;
      }
      const script = global.document.createElement("script");
      script.src = scriptSrc;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`script_load_failed:${scriptSrc}`));
      const appendFlow = () => global.document.head?.appendChild?.(script);
      if (!global.RetentionJourneyWizard) {
        const wizard = global.document.createElement("script"); wizard.src = "/retention-journey-wizard.js?v=20260720b";
        wizard.onload = appendFlow; wizard.onerror = () => reject(new Error("script_load_failed:retention-journey-wizard")); global.document.head?.appendChild?.(wizard);
      } else appendFlow();
      global.__startupResourceAudit?.deferredScripts?.push?.(scriptSrc);
    }), state.loadTimeoutMs, "retention_flow_load");
  }

  async function ensureLoaded(source = "unknown", options = {}) {
    const reason = source || "unknown";
    if (isRuntimeAvailable()) return markReady(reason);
    if (bootPromise && !options.retry) return bootPromise;
    if (options.retry) {
      bootPromise = null;
      clearCachedScript();
    }

    state.status = "loading";
    state.attempts += 1;
    state.lastSource = reason;
    state.startedAt = nowIso();
    stamp();
    setVisibleMessage(`Loading retention flow (${reason})…`, false);
    log(LOADER_TAG, "load:start", { source: reason, attempt: state.attempts, scriptSrc: state.scriptSrc });
    const startedAt = global.performance?.now?.() || Date.now();

    bootPromise = (async () => {
      try {
        await loadScript(reason);
        if (!isRuntimeAvailable()) {
          throw new Error("retention_runtime_unavailable_after_script_load");
        }
        global.__retentionFlowLoaded = true;
        const elapsedMs = Math.round((global.performance?.now?.() || Date.now()) - startedAt);
        global.__markPerfMetric?.("progressScanBootMs", elapsedMs);
        log(LOADER_TAG, "load:complete", { source: reason, elapsedMs });
        return markReady(reason);
      } catch (error) {
        bootPromise = null;
        clearCachedScript();
        recordError("load", error);
        return false;
      }
    })();

    return bootPromise;
  }

  async function refresh(reason = "manual") {
    log(LOADER_TAG, "refresh:start", { reason });
    const loaded = await ensureLoaded(`refresh:${reason}`);
    if (!loaded) return false;
    if (typeof global.__retentionFlowRefresh !== "function") {
      recordError("refresh", new Error("retention_refresh_unavailable"));
      return false;
    }
    try {
      const value = await global.__retentionFlowRefresh(reason);
      state.lastRefresh = { reason, ok: true, at: nowIso() };
      stamp();
      log(READY_TAG, "refresh:complete", { reason });
      return value === false ? false : true;
    } catch (error) {
      state.lastRefresh = { reason, ok: false, error: error?.message || String(error), at: nowIso() };
      recordError("refresh", error);
      return false;
    }
  }

  function installAuthReadyBridge() {
    if (state.authBridgeInstalled) return false;
    state.authBridgeInstalled = true;
    stamp();
    global.addEventListener?.("auth:ready", () => {
      if (global.APP_AUTH?.isAuthenticated !== true && !global.APP_AUTH?.token) return;
      refresh("auth:ready").catch((error) => recordError("auth:ready", error));
    });
    log(LOADER_TAG, "auth-ready bridge installed");
    return true;
  }

  function configure(options = {}) {
    if (options.scriptSrc) state.scriptSrc = String(options.scriptSrc);
    if (options.loadTimeoutMs) state.loadTimeoutMs = Number(options.loadTimeoutMs) || DEFAULT_LOAD_TIMEOUT_MS;
    state.configured = true;
    stamp();
    if (options.installAuthReadyBridge !== false) installAuthReadyBridge();
    log(LOADER_TAG, "configured", { scriptSrc: state.scriptSrc, loadTimeoutMs: state.loadTimeoutMs });
    return snapshot();
  }

  function snapshot() {
    return {
      configured: state.configured,
      scriptSrc: state.scriptSrc,
      loadTimeoutMs: state.loadTimeoutMs,
      status: state.status,
      attempts: state.attempts,
      loaded: state.loaded,
      ready: state.ready,
      lastSource: state.lastSource,
      lastError: state.lastError,
      lastRefresh: state.lastRefresh,
      authBridgeInstalled: state.authBridgeInstalled,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt
    };
  }

  global.RetentionLoaderRuntime = {
    configure,
    ensureLoaded,
    refresh,
    isRuntimeAvailable,
    installAuthReadyBridge,
    getState: snapshot
  };
  global.ensureRetentionFlowLoaded = ensureLoaded;
  stamp();
  configure({ installAuthReadyBridge: true });
})(typeof window !== "undefined" ? window : globalThis);
