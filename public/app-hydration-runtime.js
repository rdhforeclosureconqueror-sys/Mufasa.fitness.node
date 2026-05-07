/* =========================================================
   app-hydration-runtime.js — post-auth hydration/readiness gates
========================================================= */
(function appHydrationRuntime(global) {
  'use strict';

  const HYDRATION_TAG = '[APP_HYDRATION]';
  const BOOT_GATE_TAG = '[BOOT_GATE]';
  const APP_READY_TAG = '[APP_READY]';
  const DEFAULT_PENDING_TIMEOUT_MS = 4500;

  const state = {
    configured: false,
    status: 'loading',
    ready: false,
    degraded: false,
    reason: 'created',
    gates: {},
    hydration: {},
    errors: [],
    pendingPolicyInstalled: false,
    pendingTimeoutMs: DEFAULT_PENDING_TIMEOUT_MS,
    inFlightHydration: null,
    updatedAt: new Date().toISOString()
  };

  let deps = {};

  function stamp() {
    state.updatedAt = new Date().toISOString();
    global.__appHydrationState = snapshot();
  }

  function log(tag, message, payload) {
    if (payload !== undefined) console.log(tag, message, payload);
    else console.log(tag, message);
  }

  function asError(error, fallback) {
    if (error instanceof Error) return error;
    return new Error(String(error || fallback || 'app_hydration_error'));
  }

  function recordError(scope, error) {
    const err = asError(error, scope);
    const entry = { scope, message: err.message || String(err), at: new Date().toISOString() };
    state.errors.push(entry);
    log(HYDRATION_TAG, `${scope}:error`, entry);
    stamp();
    return entry;
  }

  function setBootStatus(step, detail) {
    if (typeof deps.updateAppBootStatus === 'function') {
      deps.updateAppBootStatus(step, detail || '');
      return;
    }
    const label = detail ? `${step}: ${detail}` : step;
    const el = global.document?.getElementById?.('appBootStatus');
    if (el) {
      el.classList?.remove?.('app-shell-hidden');
      el.textContent = `Boot status: ${label}`;
    }
    global.__appBootStatus = { current: label, steps: [...(global.__appBootStatus?.steps || []), label], at: new Date().toISOString() };
  }

  function setStatus(status, reason, detail) {
    state.status = status;
    state.ready = status === 'ready';
    state.degraded = status === 'degraded';
    state.reason = reason || status;
    stamp();
    setBootStatus(`app ${status}`, detail || reason || status);
    log(APP_READY_TAG, status, { reason: state.reason, detail, ready: state.ready, degraded: state.degraded });
    try {
      global.dispatchEvent?.(new CustomEvent('app:hydration-state', { detail: snapshot() }));
    } catch (_) {}
  }

  function markGate(name, status, detail) {
    state.gates[name] = { status, detail: detail || '', at: new Date().toISOString() };
    stamp();
    log(BOOT_GATE_TAG, `${name}:${status}`, detail || '');
    return state.gates[name];
  }

  function isMissingGate(entry) {
    return !entry || entry.status === 'missing' || entry.status === 'error';
  }

  function requireRuntimeGate(name, available, detail) {
    return markGate(name, available ? 'ready' : 'missing', detail || (available ? 'available' : 'missing'));
  }

  function resolveHandlerChecks() {
    const checks = typeof deps.getHandlerChecks === 'function'
      ? deps.getHandlerChecks()
      : {
          dashboard: typeof global.dashboardBtn?.onclick === 'function' || typeof global.document?.getElementById?.('dashboardBtn')?.onclick === 'function',
          camera: typeof global.connectBtn?.onclick === 'function' || typeof global.document?.getElementById?.('connectBtn')?.onclick === 'function',
          workoutLibrary: typeof global.exerciseLibraryBtn?.onclick === 'function' || typeof global.document?.getElementById?.('exerciseLibraryBtn')?.onclick === 'function'
        };
    markGate('handlers', Object.values(checks || {}).every(Boolean) ? 'ready' : 'degraded', checks);
    return checks;
  }

  function runBootGates(reason = 'manual') {
    log(BOOT_GATE_TAG, 'run', { reason });
    requireRuntimeGate('auth-state-runtime', Boolean(global.AuthStateRuntime), 'auth state runtime');
    requireRuntimeGate('profile-runtime', Boolean(global.PROFILE_RUNTIME?.hydrateProfileFromBackend), 'profile runtime hydration API');
    requireRuntimeGate('dashboard-runtime', Boolean(global.MufasaDashboardRuntime?.refreshAll), 'dashboard refresh API');
    requireRuntimeGate('retention-loader', typeof deps.ensureRetentionFlowLoaded === 'function' || typeof global.ensureRetentionFlowLoaded === 'function', 'retention loader');
    requireRuntimeGate('status-panels', Boolean(global.StatusPanels?.runPendingPanelWatchdogs), 'status panel watchdogs');
    resolveHandlerChecks();
    const overlay = typeof deps.getActiveBlockingOverlay === 'function' ? deps.getActiveBlockingOverlay() : 'unknown';
    markGate('blocking-overlay', overlay === 'none' || overlay === 'unknown' ? 'ready' : 'degraded', overlay);
    const missing = Object.entries(state.gates).filter(([, entry]) => isMissingGate(entry));
    if (missing.length) setStatus('degraded', `${reason}:missing_gates`, missing.map(([name]) => name).join(','));
    else setStatus('ready', `${reason}:gates_ready`, 'boot gates resolved');
    return snapshot();
  }

  async function runStep(name, fn, { required = false } = {}) {
    const startedAt = Date.now();
    state.hydration[name] = { status: 'loading', at: new Date().toISOString() };
    stamp();
    log(HYDRATION_TAG, `${name}:start`);
    try {
      const value = await fn();
      const ok = value !== false;
      state.hydration[name] = { status: ok ? 'ready' : (required ? 'error' : 'degraded'), ok, durationMs: Date.now() - startedAt, at: new Date().toISOString() };
      log(HYDRATION_TAG, `${name}:${state.hydration[name].status}`, { ok, durationMs: state.hydration[name].durationMs });
      stamp();
      return { ok, value };
    } catch (error) {
      const entry = recordError(name, error);
      state.hydration[name] = { status: required ? 'error' : 'degraded', ok: false, error: entry.message, durationMs: Date.now() - startedAt, at: new Date().toISOString() };
      stamp();
      if (required) throw error;
      return { ok: false, error };
    }
  }

  async function runPostAuthHydration({ reason = 'auth:ready', profileWrite = true } = {}) {
    if (state.inFlightHydration) {
      const current = state.inFlightHydration;
      return current.then(async () => {
        if (profileWrite && !state.hydration['profile-write'] && typeof deps.sendProfileToNode === 'function') {
          await runStep('profile-write', () => deps.sendProfileToNode(), { required: false });
          if (typeof deps.buildCalendarFromMeta === 'function') deps.buildCalendarFromMeta();
          if (typeof deps.updateSyncStatus === 'function') deps.updateSyncStatus();
        }
        return snapshot();
      });
    }
    state.inFlightHydration = (async () => {
      setStatus('loading', `${reason}:hydration_start`, 'hydration starting');
      log(HYDRATION_TAG, 'post-auth:start', { reason });
      const authenticated = global.APP_AUTH?.isAuthenticated === true || Boolean(global.APP_AUTH?.token);
      markGate('authenticated', authenticated ? 'ready' : 'missing', authenticated ? 'authenticated' : 'not authenticated');
      if (!authenticated) {
        setStatus('degraded', `${reason}:not_authenticated`, 'auth required for hydration');
        return snapshot();
      }

      const retentionLoader = deps.ensureRetentionFlowLoaded || global.ensureRetentionFlowLoaded;
      await runStep('profile', () => global.PROFILE_RUNTIME?.hydrateProfileFromBackend?.(), { required: false });
      await runStep('retention', () => typeof retentionLoader === 'function' ? retentionLoader(`app-hydration:${reason}`) : false, { required: false });
      await runStep('dashboard', () => global.MufasaDashboardRuntime?.refreshAll?.(`app-hydration:${reason}`), { required: false });

      if (profileWrite && typeof deps.sendProfileToNode === 'function') {
        await runStep('profile-write', () => deps.sendProfileToNode(), { required: false });
      }
      if (typeof deps.buildCalendarFromMeta === 'function') deps.buildCalendarFromMeta();
      if (typeof deps.updateSyncStatus === 'function') deps.updateSyncStatus();
      if (typeof global.StatusPanels?.runPendingPanelWatchdogs === 'function') global.StatusPanels.runPendingPanelWatchdogs();

      const failed = Object.values(state.hydration).filter((entry) => entry.status === 'error');
      const degraded = Object.values(state.hydration).filter((entry) => entry.status === 'degraded');
      if (failed.length) setStatus('error', `${reason}:hydration_error`, `${failed.length} hydration step(s) failed`);
      else if (degraded.length) setStatus('degraded', `${reason}:hydration_degraded`, `${degraded.length} hydration step(s) degraded`);
      else setStatus('ready', `${reason}:hydration_ready`, 'hydration complete');
      runBootGates(`${reason}:post_hydration`);
      return snapshot();
    })().finally(() => {
      state.inFlightHydration = null;
    });
    return state.inFlightHydration;
  }

  function applyNoPendingForeverPolicy(reason = 'policy') {
    const candidates = [
      'appBootStatus',
      'systemBootStatus',
      'authPropagationStatus',
      'appActivationStatus',
      'featureActivationStatus',
      'activationStatus',
      'dashboardRuntimeStatus',
      'retentionFlowStatus',
      'profileSummary',
      'diagnosticStatus'
    ];
    const resolved = [];
    for (const id of candidates) {
      const el = global.document?.getElementById?.(id);
      if (!el) continue;
      const text = (el.textContent || '').trim();
      if (!/\b(pending|loading|waiting)\b/i.test(text)) continue;
      el.textContent = `${text} — degraded: ${reason}`;
      el.classList?.add?.('status-bad');
      resolved.push(id);
    }
    if (resolved.length) {
      markGate('pending-policy', 'degraded', resolved.join(','));
      setStatus('degraded', `${reason}:pending_resolved`, resolved.join(','));
    } else {
      markGate('pending-policy', 'ready', 'no pending/loading panels');
    }
    return resolved;
  }

  function installNoPendingForeverPolicy(timeoutMs = state.pendingTimeoutMs) {
    if (state.pendingPolicyInstalled) return false;
    state.pendingPolicyInstalled = true;
    state.pendingTimeoutMs = Number(timeoutMs) || DEFAULT_PENDING_TIMEOUT_MS;
    global.setTimeout(() => applyNoPendingForeverPolicy('timeout'), state.pendingTimeoutMs);
    global.addEventListener?.('load', () => global.setTimeout(() => applyNoPendingForeverPolicy('load'), state.pendingTimeoutMs));
    return true;
  }

  function configure(options = {}) {
    deps = { ...deps, ...options };
    state.configured = true;
    stamp();
    installNoPendingForeverPolicy(options.pendingTimeoutMs);
    if (options.installAuthListeners !== false) {
      global.addEventListener?.('auth:ready', () => {
        if (global.APP_AUTH?.isAuthenticated !== true) return;
        runPostAuthHydration({ reason: 'auth:ready', profileWrite: false }).catch((error) => recordError('auth:ready', error));
      });
      global.addEventListener?.('auth:changed', () => {
        if (global.APP_AUTH?.isAuthenticated !== true) return;
        runPostAuthHydration({ reason: 'auth:changed', profileWrite: false }).catch((error) => recordError('auth:changed', error));
      });
    }
    log(HYDRATION_TAG, 'configured', { pendingTimeoutMs: state.pendingTimeoutMs, installAuthListeners: options.installAuthListeners !== false });
    return snapshot();
  }

  function snapshot() {
    return {
      configured: state.configured,
      status: state.status,
      ready: state.ready,
      degraded: state.degraded,
      reason: state.reason,
      gates: { ...state.gates },
      hydration: { ...state.hydration },
      errors: [...state.errors],
      pendingPolicyInstalled: state.pendingPolicyInstalled,
      pendingTimeoutMs: state.pendingTimeoutMs,
      updatedAt: state.updatedAt
    };
  }

  global.AppHydrationRuntime = {
    configure,
    runBootGates,
    runPostAuthHydration,
    applyNoPendingForeverPolicy,
    installNoPendingForeverPolicy,
    getState: snapshot
  };
  stamp();
  log(HYDRATION_TAG, 'loaded');
})(window);
