(function initGreatnessEntryAuth(global) {
  "use strict";

  const TRACE_KEY = "maat.lastGreatnessEntryTrace.v1";
  const BUILD_VERSION = "20260831-run-club-paid-boundary-v1";
  const OWNER = "public/greatness-entry-auth.js/GreatnessEntryAuth.guard";
  const ASSETS = ["auth-state-runtime.js", "api-client.js", "greatness-entry-auth.js", "greatness.js"];
  const FREE_RUN_CLUB_MODE = "run-club";
  const MEMBERSHIP_ROUTE = "/api/me/membership";
  global.__MAAT_ASSET_VERSIONS__ = Object.assign(global.__MAAT_ASSET_VERSIONS__ || {}, { "greatness-entry-auth.js": BUILD_VERSION });

  function yes(value) { return value ? "YES" : "NO"; }
  function save(trace) { try { global.sessionStorage?.setItem(TRACE_KEY, JSON.stringify(trace)); } catch (_) {} }
  function responseClass(diagnostics) {
    if (!diagnostics) return "not run";
    if (!diagnostics.dispatched) return "request-construction";
    if (diagnostics.backendReached === null) return "network";
    if (diagnostics.status === 200) return "200";
    if (diagnostics.status === 401) return "401";
    if (diagnostics.status === 403) return "403";
    return "other HTTP";
  }
  function requestedMode() {
    try { return new URL(global.location.href).searchParams.get("mode") === FREE_RUN_CLUB_MODE ? FREE_RUN_CLUB_MODE : "greatness"; }
    catch (_) { return "greatness"; }
  }
  function initial() {
    const mode = requestedMode();
    const versions = Object.fromEntries(ASSETS.map((name) => [name, global.__MAAT_ASSET_VERSIONS__?.[name] || "NOT LOADED"]));
    return {
      timestamp: new Date().toISOString(), buildVersion: BUILD_VERSION,
      accessMode: mode, membershipRequired: mode !== FREE_RUN_CLUB_MODE,
      membershipChecked: false, membershipHasAccess: false, membershipHttpStatus: null,
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
  function applyAccessMode(mode) {
    const free = mode === FREE_RUN_CLUB_MODE;
    if (global.document?.documentElement) global.document.documentElement.dataset.greatnessAccessMode = free ? "run-club" : "paid";
    if (!free) return;
    const eyebrow = global.document?.querySelector?.("body > header .eyebrow");
    const heading = global.document?.querySelector?.("body > header h1");
    if (eyebrow) eyebrow.textContent = "PocketPT Run Club";
    if (heading) heading.textContent = "Move at your pace.";
    global.document?.querySelectorAll?.('.section-nav [data-tab]:not([data-tab="move"])').forEach((node) => { node.hidden = true; });
    global.document?.querySelectorAll?.('main > section.panel:not(#move)').forEach((node) => { node.hidden = true; });
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
      if (status) {
        if (trace.meResponseClass === "network") status.textContent = "We could not verify your session. Check your connection, then retry.";
        else if (trace.redirectReason === "membership_check") status.textContent = "Checking your PocketPT membership…";
        else status.textContent = "Restoring your session…";
      }
    }
    console.info("[GREATNESS_ENTRY_TRACE]", { ...trace });
  }
  function format(trace) {
    return [
      `trace timestamp: ${trace.timestamp}`, `deployment/build version: ${trace.buildVersion}`,
      `access mode: ${trace.accessMode}`, `membership required: ${yes(trace.membershipRequired)}`,
      `membership checked: ${yes(trace.membershipChecked)}`, `membership access: ${yes(trace.membershipHasAccess)}`,
      `membership HTTP status: ${trace.membershipHttpStatus ?? "none"}`,
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
  async function verifyPaidMembership(trace) {
    Object.assign(trace, { redirectReason: "membership_check" });
    render(trace);
    const result = await global.MaatApiClient?.request?.(MEMBERSHIP_ROUTE, { cache: "no-store" });
    if (!result) return { ok: false, retryable: true, reason: "membership_runtime_unavailable" };
    trace.membershipChecked = true;
    trace.membershipHttpStatus = result.diagnostics?.status ?? result.response?.status ?? null;
    if (result.diagnostics?.backendReached === null) return { ok: false, retryable: true, reason: "membership_network_unavailable" };
    if (!result.ok) {
      if (trace.membershipHttpStatus === 401) return { ok: false, retryable: false, reason: "membership_auth_required", target: `/login.html?returnTo=${encodeURIComponent("/greatness.html")}` };
      return { ok: false, retryable: true, reason: "membership_verification_unavailable" };
    }
    const membership = result.payload?.data || {};
    trace.membershipHasAccess = membership.hasAccess === true;
    if (trace.membershipHasAccess) return { ok: true };
    return { ok: false, retryable: false, reason: "paid_membership_required", target: `/membership.html?returnTo=${encodeURIComponent("/greatness.html")}` };
  }
  async function guard() {
    const trace = initial();
    applyAccessMode(trace.accessMode);
    const runtime = global.AuthStateRuntime;
    const safe = runtime?.getSafeDiagnostics?.() || {};
    const firstCheckpoint = lifecycle().checkpoints?.GREATNESS_CHECKPOINT_1;
    if (firstCheckpoint) runtime?.recordLifecycle?.({ greatnessInitialTokenPresent: firstCheckpoint.maatAuthTokenPresent === true });
    Object.assign(trace, { tokenPresent: safe.credentialPresent === true, tokenValidFormat: safe.tokenFormatValid === true, tokenExpired: safe.expiryState === "expired" ? "YES" : safe.expiryState === "valid" ? "NO" : "UNKNOWN" });
    render(trace);
    const result = await global.AuthNavigation.requireUser({
      returnTo: global.location.pathname + global.location.search + global.location.hash,
      redirect: false
    });
    const auth = runtime?.getCanonicalAuthState?.() || {};
    const diagnostics = runtime?.ensureDebugState?.().lastMeDiagnostics || null;
    Object.assign(trace, {
      whenReadyResolved: true, tokenPresent: Boolean(auth.token), authenticated: auth.isAuthenticated === true,
      meUrl: diagnostics?.url || trace.meUrl, meDispatched: diagnostics?.dispatched === true,
      meResponseClass: responseClass(diagnostics), meHttpStatus: diagnostics?.status ?? null, identityResolved: Boolean(auth.user?.id)
    });
    if (!result.ok) {
      if (result.retryable) {
        Object.assign(trace, { decision: "WAIT", redirectReason: result.reason || "auth_unavailable" });
        render(trace); return trace;
      }
      Object.assign(trace, { decision: "REDIRECT", redirectReason: result.reason, redirectTarget: result.target });
      render(trace); global.location.replace(result.target); return trace;
    }

    if (trace.accessMode === FREE_RUN_CLUB_MODE) {
      Object.assign(trace, { decision: "ALLOW", redirectReason: "free_run_club_authenticated", redirectTarget: "none" });
      render(trace); return trace;
    }

    const membership = await verifyPaidMembership(trace);
    if (membership.ok) {
      Object.assign(trace, { decision: "ALLOW", redirectReason: "paid_membership_confirmed", redirectTarget: "none" });
      render(trace); return trace;
    }
    if (membership.retryable) {
      Object.assign(trace, { decision: "WAIT", redirectReason: membership.reason });
      render(trace); return trace;
    }
    Object.assign(trace, { decision: "REDIRECT", redirectReason: membership.reason, redirectTarget: membership.target });
    render(trace); global.location.replace(membership.target); return trace;
  }
  global.GreatnessEntryAuth = Object.freeze({ BUILD_VERSION, OWNER, TRACE_KEY, FREE_RUN_CLUB_MODE, MEMBERSHIP_ROUTE, format, formatLifecycle, guard, requestedMode, applyAccessMode });
})(typeof window !== "undefined" ? window : globalThis);
