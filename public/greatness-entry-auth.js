(function initGreatnessEntryAuth(global) {
  "use strict";

  const TRACE_KEY = "maat.lastGreatnessEntryTrace.v1";
  const BUILD_VERSION = "20260813-authorization-header-canonicalization-v1";
  const OWNER = "public/greatness-entry-auth.js/GreatnessEntryAuth.guard";
  const ASSETS = ["auth-state-runtime.js", "api-client.js", "greatness-entry-auth.js", "greatness.js"];
  const definitiveFailures = new Set(["missing_token", "invalid_token", "expired_token", "invalid_session"]);
  global.__MAAT_ASSET_VERSIONS__ = Object.assign(global.__MAAT_ASSET_VERSIONS__ || {}, { "greatness-entry-auth.js": BUILD_VERSION });

  function yes(value) { return value ? "YES" : "NO"; }
  function save(trace) { try { global.sessionStorage?.setItem(TRACE_KEY, JSON.stringify(trace)); } catch (_) {} }
  function responseClass(diagnostics) {
    if (!diagnostics) return "not run";
    if (!diagnostics.dispatched) return "request-construction";
    if (diagnostics.backendReached === null) return "network";
    if (diagnostics.status === 200) return "200";
    if (diagnostics.status === 401) return "401";
    return "other HTTP";
  }
  function initial() {
    const versions = Object.fromEntries(ASSETS.map((name) => [name, global.__MAAT_ASSET_VERSIONS__?.[name] || "NOT LOADED"]));
    return {
      timestamp: new Date().toISOString(), buildVersion: BUILD_VERSION,
      frontendOrigin: global.location?.origin || "unknown",
      apiOrigin: global.MaatApiClient?.origin?.() || "unknown",
      bootstrapStarted: true, runtimeLoaded: Boolean(global.AuthStateRuntime), whenReadyResolved: false,
      tokenPresent: false, tokenValidFormat: false, tokenExpired: "UNKNOWN", authenticated: false,
      meUrl: global.MaatApiClient?.resolve?.("/api/auth/me") || "not resolved", meDispatched: false,
      meResponseClass: "not run", meHttpStatus: null, identityResolved: false,
      decision: "WAIT", redirectReason: "bootstrap_started", redirectTarget: "none", redirectOwner: OWNER,
      assetVersions: versions, assetVersionMatch: ASSETS.every((name) => versions[name] === BUILD_VERSION)
    };
  }
  function render(trace) {
    global.__greatnessEntryAuth = { ...trace };
    save(trace);
    const output = global.document?.getElementById?.("greatnessEntryAuthDiagnostics");
    if (output) output.textContent = format(trace);
    const panel = global.document?.getElementById?.("greatnessSessionRestore");
    if (panel) {
      panel.hidden = trace.decision === "ALLOW";
      const status = panel.querySelector?.("[data-auth-status]");
      if (status) status.textContent = trace.meResponseClass === "network" ? "We could not verify your session. Check your connection, then retry." : "Restoring your session…";
    }
    console.info("[GREATNESS_ENTRY_TRACE]", { ...trace });
  }
  function format(trace) {
    return [
      `trace timestamp: ${trace.timestamp}`, `deployment/build version: ${trace.buildVersion}`,
      `current frontend origin: ${trace.frontendOrigin}`, `intended backend/API origin: ${trace.apiOrigin}`,
      `Greatness bootstrap started: ${yes(trace.bootstrapStarted)}`, `AuthStateRuntime loaded: ${yes(trace.runtimeLoaded)}`,
      `whenReady() resolved: ${yes(trace.whenReadyResolved)}`, `canonical token present: ${yes(trace.tokenPresent)}`,
      `token valid format: ${yes(trace.tokenValidFormat)}`, `token expired: ${trace.tokenExpired}`,
      `canonical authenticated state: ${yes(trace.authenticated)}`, `/api/auth/me resolved URL: ${trace.meUrl}`,
      `/api/auth/me request dispatched: ${yes(trace.meDispatched)}`, `/api/auth/me response class: ${trace.meResponseClass}`,
      `/api/auth/me HTTP status if available: ${trace.meHttpStatus ?? "none"}`, `identity resolved: ${yes(trace.identityResolved)}`,
      `route guard decision: ${trace.decision}`, `exact redirect reason code: ${trace.redirectReason}`,
      `exact redirect target: ${trace.redirectTarget}`, `redirect owner/source file/function: ${trace.redirectOwner}`,
      ...ASSETS.map((name) => `${name} loaded version/hash: ${trace.assetVersions[name]}`),
      `asset versions match deployment: ${trace.assetVersionMatch ? "PASS" : "FAIL"}`
    ].join("\n");
  }
  function lifecycle() { try { return JSON.parse(global.sessionStorage?.getItem("maat.loginToGreatnessTokenLifecycle.v1") || "{}"); } catch (_) { return {}; } }
  function formatLifecycle(value = lifecycle()) {
    return [
      `Login response token: ${yes(value.loginTokenReturned)}`,
      `Persistence: ${value.persistence || "NOT_RUN"}`,
      `Login-page /api/auth/me: ${value.loginPageMeStatus ?? "not run"}`,
      `Before-navigation token: ${yes(value.beforeNavigationTokenPresent)}`,
      `Greatness initial token: ${yes(value.greatnessInitialTokenPresent)}`,
      `Greatness request Authorization attached: ${yes(value.greatnessRequestAuthorizationAttached)}`,
      `Greatness /api/auth/me: ${value.greatnessMeStatus ?? "not run"}`,
      `Token-cleared-by: ${value.tokenClearedBy || "NONE"}`
    ].join("\n");
  }
  async function guard() {
    const trace = initial();
    const runtime = global.AuthStateRuntime;
    const safe = runtime?.getSafeDiagnostics?.() || {};
    const firstCheckpoint = lifecycle().checkpoints?.GREATNESS_CHECKPOINT_1;
    if (firstCheckpoint) runtime?.recordLifecycle?.({ greatnessInitialTokenPresent: firstCheckpoint.maatAuthTokenPresent === true });
    Object.assign(trace, { tokenPresent: safe.credentialPresent === true, tokenValidFormat: safe.tokenFormatValid === true, tokenExpired: safe.expiryState === "expired" ? "YES" : safe.expiryState === "valid" ? "NO" : "UNKNOWN" });
    render(trace);
    if (!runtime?.whenReady || !global.MaatApiClient?.request) {
      trace.redirectReason = "auth_runtime_unavailable"; render(trace); return trace;
    }
    const result = await runtime.whenReady();
    const auth = runtime.getCanonicalAuthState();
    const diagnostics = result.diagnostics || result.error?.authDiagnostics || runtime.ensureDebugState?.().lastMeDiagnostics || null;
    Object.assign(trace, {
      whenReadyResolved: true, tokenPresent: Boolean(auth.token || runtime.getAuthToken?.()), authenticated: auth.isAuthenticated === true,
      meUrl: diagnostics?.url || trace.meUrl, meDispatched: diagnostics?.dispatched === true,
      meResponseClass: responseClass(diagnostics), meHttpStatus: diagnostics?.status ?? null, identityResolved: Boolean(auth.user?.id)
    });
    const after = runtime.getSafeDiagnostics?.() || {};
    trace.tokenValidFormat = after.tokenFormatValid === true;
    trace.tokenExpired = after.expiryState === "expired" ? "YES" : after.expiryState === "valid" ? "NO" : "UNKNOWN";
    if (result.ok && auth.isAuthenticated && auth.token && auth.user?.id) {
      Object.assign(trace, { decision: "ALLOW", redirectReason: "authenticated_identity_confirmed", redirectTarget: "none" }); render(trace); return trace;
    }
    if (!definitiveFailures.has(result.reason)) {
      Object.assign(trace, { decision: "WAIT", redirectReason: result.reason || "validation_pending" }); render(trace); return trace;
    }
    const target = `/run-club-login.html?returnTo=${encodeURIComponent(global.location.pathname + global.location.search + global.location.hash)}`;
    Object.assign(trace, { decision: "REDIRECT", redirectReason: result.reason, redirectTarget: target });
    render(trace); global.location.replace(target); return trace;
  }
  global.GreatnessEntryAuth = Object.freeze({ BUILD_VERSION, OWNER, TRACE_KEY, format, formatLifecycle, guard });
})(typeof window !== "undefined" ? window : globalThis);
