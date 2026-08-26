(function initAuthStateRuntime(globalScope) {
  "use strict";

  const global = globalScope || window;
  const FRONTEND_BUILD = "20260824-auth-unified-drawer-v2";
  global.__MAAT_ASSET_VERSIONS__ = Object.assign(global.__MAAT_ASSET_VERSIONS__ || {}, { "auth-state-runtime.js": FRONTEND_BUILD });
  const TOKEN_STORAGE_KEY = "maatAuthToken";
  const PERSISTENCE_STORAGE_KEY = "maatAuthPersistence";
  const ORIGIN_STORAGE_KEY = "maatAuthOrigin";
  const RETIRED_STORAGE_KEYS = ["maat_auth_token", "mufasa_auth_token", "authToken", "pocket_pt_auth_token"];
  const LIFECYCLE_KEY = "maat.loginToGreatnessTokenLifecycle.v1";
  const LOG_PREFIX = "[AUTH_STATE_RUNTIME]";
  let restorePromise = null;
  let backendValidatedToken = null;
  let authPhase = "restoring";
  const RESTORE_TIMEOUT_MS = 12000;
  const TOKEN_HANDOFF_KEY = "maat.tokenHandoffTrace.v1";
  let tokenHandoffSequence = 0;
  let tokenHandoffQueue = Promise.resolve();

  function storageInspection() {
    let sessionToken = null;
    let localToken = null;
    let consent = null;
    try {
      sessionToken = normalizeToken(global.sessionStorage?.getItem(TOKEN_STORAGE_KEY));
      localToken = normalizeToken(global.localStorage?.getItem(TOKEN_STORAGE_KEY));
      consent = global.localStorage?.getItem(PERSISTENCE_STORAGE_KEY);
    } catch (_) {}
    const persistentConsent = consent === "persistent";
    const source = sessionToken ? "sessionStorage" : (localToken && persistentConsent ? "localStorage" : "none");
    return { token: sessionToken || (persistentConsent ? localToken : null), source, persistentConsent, rejectedUnconsentedLocalToken: Boolean(localToken && !persistentConsent) };
  }

  function publishRestoreDiagnostics(values = {}) {
    const inspection = storageInspection();
    const report = {
      bundle: FRONTEND_BUILD,
      tokenSource: values.tokenSource || inspection.source,
      rememberMeConsent: inspection.persistentConsent,
      operation: "session_restore",
      route: global.location?.pathname || "unknown",
      authState: authPhase,
      userId: global.APP_AUTH?.user?.id || null,
      hasAccessToken: Boolean(global.APP_AUTH?.token || inspection.token),
      apiOrigin: global.MaatApiClient?.origin?.() || global.MAAT_BACKEND_ORIGIN || null,
      legacyAliasRestored: false,
      ...values,
      rejectedUnconsentedLocalToken: values.rejectedUnconsentedLocalToken === true || inspection.rejectedUnconsentedLocalToken || global.__MAAT_AUTH_RESTORE_DIAGNOSTICS__?.rejectedUnconsentedLocalToken === true,
      updatedAt: new Date().toISOString()
    };
    global.__MAAT_AUTH_RESTORE_DIAGNOSTICS__ = report;
    ensureDebugState().restoreDiagnostics = report;
    console.info("[AUTH_RESTORE_DIAGNOSTICS]", report);
    return report;
  }

  async function shaPrefix(value) {
    if (typeof value !== "string" || !global.crypto?.subtle || typeof global.TextEncoder !== "function") return null;
    const digest = await global.crypto.subtle.digest("SHA-256", new global.TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
  }

  function readTokenHandoffTrace() {
    try { return JSON.parse(global.sessionStorage?.getItem(TOKEN_HANDOFF_KEY) || "{}"); } catch (_) { return {}; }
  }

  function traceTokenHandoff(checkpoint, value, transformations = {}, source = {}) {
    const sequence = ++tokenHandoffSequence;
    const operation = tokenHandoffQueue.then(async () => {
    const text = typeof value === "string" ? value : "";
    const [header = "", payload = "", signature = ""] = text.split(".");
    const entry = {
      checkpoint,
      compactTokenSha256Prefix: await shaPrefix(text),
      headerSegmentSha256Prefix: await shaPrefix(header),
      payloadSegmentSha256Prefix: await shaPrefix(payload),
      signatureSegmentSha256Prefix: await shaPrefix(signature),
      compactLength: text.length,
      headerLength: header.length,
      payloadLength: payload.length,
      signatureLength: signature.length,
      leadingTrailingWhitespacePresent: /^\s|\s$/.test(text) ? "YES" : "NO",
      quoteCharactersPresent: /["']/.test(text) ? "YES" : "NO",
      percentEncodingIndicatorsPresent: /%[0-9a-f]{2}/i.test(text) ? "YES" : "NO",
      signatureCharacterFlags: Object.fromEntries(["+", "/", "=", "-", "_"].map((character) => [character, signature.includes(character) ? "YES" : "NO"])),
      transformationSincePreviousCheckpoint: transformations.description || (transformations.json === true ? "login response JSON property access only" : "NONE"),
      source: `${source.file || "public/auth-state-runtime.js"}/${source.function || "traceTokenHandoff"}`,
      sequence
    };
    const trace = transformations.reset === true ? {} : readTokenHandoffTrace();
    const ordered = Object.values(trace.checkpoints || {}).sort((a, b) => a.sequence - b.sequence);
    const previous = ordered.at(-1) || null;
    const baselineEntry = trace.loginResponseBaseline || entry;
    const mutatedSegments = ["header", "payload", "signature"].filter((segment) => entry[`${segment}SegmentSha256Prefix`] !== baselineEntry[`${segment}SegmentSha256Prefix`]);
    const firstMutation = trace.firstMutationCheckpoint === "NONE" ? null : trace.firstMutationCheckpoint;
    const observed = firstMutation || (mutatedSegments.length ? checkpoint : null);
    trace.loginResponseBaseline = baselineEntry;
    trace.firstMutationCheckpoint = observed || "NONE";
    trace.firstMutatedSegment = trace.firstMutatedSegment === "NONE" || !trace.firstMutatedSegment ? (mutatedSegments[0] || "NONE") : trace.firstMutatedSegment;
    trace.signatureMutationFirstObservedAt = trace.signatureMutationFirstObservedAt !== "NONE" && trace.signatureMutationFirstObservedAt
      ? trace.signatureMutationFirstObservedAt
      : (mutatedSegments.includes("signature") ? checkpoint : "NONE");
    if (observed === checkpoint) {
      trace.previousCheckpointSignatureFingerprint = previous?.signatureSegmentSha256Prefix || "NONE";
      trace.currentCheckpointSignatureFingerprint = entry.signatureSegmentSha256Prefix || "NONE";
      trace.mutationTransitionSource = entry.source;
    }
    trace.checkpoints = { ...(trace.checkpoints || {}), [checkpoint]: entry };
    trace.updatedAt = new Date().toISOString();
    try { global.sessionStorage?.setItem(TOKEN_HANDOFF_KEY, JSON.stringify(trace)); } catch (_) {}
    console.info("[TOKEN_HANDOFF_TRACE]", { ...entry, firstMutationCheckpoint: trace.firstMutationCheckpoint, signatureMutationFirstObservedAt: trace.signatureMutationFirstObservedAt });
    return entry;
    });
    tokenHandoffQueue = operation.catch(() => undefined);
    return operation;
  }

  function normalizeToken(value) {
    if (typeof value !== "string") return null;
    const token = value.trim().replace(/^Bearer\s+/i, "");
    return token || null;
  }

  function tokenMetadata(value) {
    const token = normalizeToken(value);
    const validFormat = Boolean(token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token));
    let expiresAt = null;
    if (validFormat) {
      try {
        const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(global.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
        if (Number.isFinite(Number(payload.exp))) expiresAt = new Date(Number(payload.exp) * 1000).toISOString();
      } catch (_) {}
    }
    return { validFormat, expiresAt, expiryState: !expiresAt ? "unavailable" : (Date.parse(expiresAt) <= Date.now() ? "expired" : "valid") };
  }

  function readLifecycle() {
    try { return JSON.parse(global.sessionStorage?.getItem(LIFECYCLE_KEY) || "{}"); } catch (_) { return {}; }
  }

  function recordLifecycle(values = {}) {
    const lifecycle = { ...readLifecycle(), ...values, updatedAt: new Date().toISOString() };
    try { global.sessionStorage?.setItem(LIFECYCLE_KEY, JSON.stringify(lifecycle)); } catch (_) {}
    return lifecycle;
  }

  function recordCheckpoint(name, values = {}) {
    const lifecycle = readLifecycle();
    lifecycle.checkpoints = { ...(lifecycle.checkpoints || {}), [name]: { timestamp: new Date().toISOString(), pathname: global.location?.pathname || "unknown", frontendOrigin: global.location?.origin || "unknown", ...values } };
    lifecycle.updatedAt = new Date().toISOString();
    try { global.sessionStorage?.setItem(LIFECYCLE_KEY, JSON.stringify(lifecycle)); } catch (_) {}
    return lifecycle.checkpoints[name];
  }

  function ensureDebugState() {
    return global.__authPropagationDebug || (global.__authPropagationDebug = {
      authChangedFired: false,
      authReadyFired: false,
      lastAuthEventAt: null,
      lastAuthReadyAt: null,
      lastAuthError: null,
      lastAuthReason: null
    });
  }

  function getStoredToken() {
    try {
      const inspection = storageInspection();
      if (inspection.rejectedUnconsentedLocalToken) global.localStorage?.removeItem(TOKEN_STORAGE_KEY);
      publishRestoreDiagnostics({ tokenSource: inspection.source, rejectedUnconsentedLocalToken: inspection.rejectedUnconsentedLocalToken });
      void traceTokenHandoff(`${inspection.source} read-back value`, inspection.token, {}, { function: "getStoredToken" });
      return inspection.token;
    } catch (_) { return null; }
  }

  function persistToken(token, rememberMe = null) {
    try {
      if (!token) {
        global.localStorage?.removeItem(TOKEN_STORAGE_KEY);
        global.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
        global.localStorage?.removeItem(PERSISTENCE_STORAGE_KEY);
        return;
      }
      // Persistence requires an explicit user choice. Omitted choices are session-only.
      const persistent = rememberMe === true;
      const destination = persistent ? global.localStorage : global.sessionStorage;
      const alternate = persistent ? global.sessionStorage : global.localStorage;
      destination?.setItem(TOKEN_STORAGE_KEY, normalizeToken(token));
      alternate?.removeItem(TOKEN_STORAGE_KEY);
      if (persistent) global.localStorage?.setItem(PERSISTENCE_STORAGE_KEY, "persistent");
      else global.localStorage?.removeItem(PERSISTENCE_STORAGE_KEY);
    } catch (_) {}
  }

  async function persistCanonicalAuthState(input = {}, options = {}) {
    if (input?.token) void traceTokenHandoff("token passed into canonical persistence", input.token, {}, { function: "persistCanonicalAuthState" });
    const state = setCanonicalAuthState(input, options);
    if (!state.token) return { ok: true, state };
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        (options.rememberMe === false ? global.sessionStorage : global.localStorage)?.setItem(ORIGIN_STORAGE_KEY, global.location?.origin || "unknown");
        if (getStoredToken() === state.token) return { ok: true, state };
      } catch (error) { lastError = error; }
      await new Promise((resolve) => global.setTimeout ? global.setTimeout(resolve, 25 * (attempt + 1)) : resolve());
    }
    const error = lastError || new Error("canonical_storage_verification_failed");
    error.code = "AUTH_STORAGE_UNAVAILABLE";
    ensureDebugState().lastAuthError = "Authentication could not be persisted on this device";
    return { ok: false, state, error, reason: "storage_verification_failed" };
  }

  function normalizeUser(user) {
    if (!user || typeof user !== "object") return null;
    return user;
  }

  function normalizeState(input) {
    const payload = input && typeof input === "object" ? input : {};
    const token = normalizeToken(payload.token);
    const user = normalizeUser(payload.user);
    return {
      isAuthenticated: Boolean(token && user),
      token,
      user
    };
  }

  function sameAuthState(a, b) {
    return Boolean(a && b) &&
      a.isAuthenticated === b.isAuthenticated &&
      (a.token || null) === (b.token || null) &&
      JSON.stringify(a.user || null) === JSON.stringify(b.user || null);
  }

  function createAuthEvent(name, detail) {
    if (typeof global.CustomEvent === "function") return new global.CustomEvent(name, { detail });
    const event = global.document?.createEvent?.("CustomEvent");
    if (event?.initCustomEvent) {
      event.initCustomEvent(name, false, false, detail);
      return event;
    }
    return { type: name, detail };
  }

  function dispatchAuthEvent(name, detail, reason) {
    const debug = ensureDebugState();
    const at = new Date().toISOString();
    if (name === "auth:changed") {
      debug.authChangedFired = true;
      debug.lastAuthEventAt = at;
      console.log("[AUTH_CHANGED]", { reason, authenticated: detail?.isAuthenticated === true, hasToken: Boolean(detail?.token) });
    }
    if (name === "auth:ready") {
      debug.authReadyFired = true;
      debug.lastAuthReadyAt = at;
      console.log("[AUTH_READY]", { reason, authenticated: detail?.isAuthenticated === true, hasToken: Boolean(detail?.token) });
    }
    debug.lastAuthReason = reason || name;
    global.dispatchEvent?.(createAuthEvent(name, detail));
  }

  function setCanonicalAuthState(input = {}, options = {}) {
    const reason = options.reason || "setCanonicalAuthState";
    const nextState = normalizeState(input);
    const previousState = global.APP_AUTH && typeof global.APP_AUTH === "object" ? global.APP_AUTH : null;
    const changed = !sameAuthState(previousState, nextState);

    global.APP_AUTH = nextState;
    if (nextState.token) void traceTokenHandoff("token assigned to APP_AUTH", nextState.token, {}, { function: "setCanonicalAuthState" });
    if (nextState.user) global.__LAST_AUTH_USER = nextState.user;
    else if (options.clearLastUser === true) global.__LAST_AUTH_USER = null;
    global.__AUTH_READY = nextState.isAuthenticated === true;
    persistToken(nextState.token, options.rememberMe ?? null);

    console.log(LOG_PREFIX, {
      reason,
      authenticated: nextState.isAuthenticated === true,
      hasToken: Boolean(nextState.token),
      hasUser: Boolean(nextState.user),
      changed
    });

    if (options.dispatch !== false && (changed || options.forceDispatch === true)) {
      dispatchAuthEvent("auth:changed", nextState, reason);
      if (options.ready !== false) dispatchAuthEvent("auth:ready", nextState, reason);
    }
    return global.APP_AUTH;
  }

  function clearCanonicalAuthState(reason = "clearCanonicalAuthState", options = {}) {
    const tokenWasPresent = Boolean(global.APP_AUTH?.token || getStoredToken());
    const lastStatus = options.httpStatus ?? ensureDebugState().lastMeDiagnostics?.status ?? null;
    const deletion = { timestamp: new Date().toISOString(), file: options.file || "public/auth-state-runtime.js", function: options.function || "clearCanonicalAuthState", reasonCode: reason, pathname: global.location?.pathname || "unknown", relativeToAuthMe: lastStatus === null ? "before_or_without_auth_me" : "after_auth_me", triggeringHttpStatus: lastStatus, tokenWasPresent };
    if (tokenWasPresent) recordLifecycle({ tokenClearedBy: `${deletion.file}/${deletion.function}/${deletion.reasonCode}`, lastTokenDeletion: deletion });
    backendValidatedToken = null;
    const state = setCanonicalAuthState({ token: null, user: null }, { ...options, reason, clearLastUser: options.clearLastUser === true });
    // Remove retired aliases so logout/invalid-session cleanup is global, not page-specific.
    for (const storage of [global.localStorage, global.sessionStorage]) {
      try { [TOKEN_STORAGE_KEY, ORIGIN_STORAGE_KEY, PERSISTENCE_STORAGE_KEY, ...RETIRED_STORAGE_KEYS].forEach((key) => storage?.removeItem(key)); } catch (_) {}
    }
    return state;
  }

  async function refreshAuthStatus(options = {}) {
    const reason = options.reason || "refreshAuthStatus";
    const token = options.token || global.APP_AUTH?.token || getStoredToken();
    const baseUrl = options.baseUrl || global.RuntimeState?.getEndpoints?.().nodeBaseUrl || global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.MAAT_NODE_BASE_URL || global.location?.origin;
    if (!token) {
      clearCanonicalAuthState(`${reason}:missing_token`, { forceDispatch: options.forceDispatch === true });
      return { ok: false, reason: "missing_token", auth: global.APP_AUTH };
    }
    const metadata = tokenMetadata(token);
    if (!metadata.validFormat || metadata.expiryState === "expired") {
      ensureDebugState().lastRejectedTokenMetadata = metadata;
      clearCanonicalAuthState(`${reason}:invalid_token`, { forceDispatch: options.forceDispatch === true, clearLastUser: true, file: "public/auth-state-runtime.js", function: "refreshAuthStatus" });
      return { ok: false, reason: metadata.expiryState === "expired" ? "expired_token" : "invalid_token", auth: global.APP_AUTH };
    }
    try {
      const onGreatness = global.location?.pathname === "/greatness.html";
      if (onGreatness) {
        recordCheckpoint("GREATNESS_CHECKPOINT_2", { canonicalTokenPresent: Boolean(token), authenticatedState: getCanonicalAuthState().isAuthenticated === true, authorizationHeaderAttached: Boolean(token), bearerPrefixCorrect: Boolean(token), tokenFormatValid: metadata.validFormat, requestUrl: global.MaatApiClient?.resolve?.("/api/auth/me") || `${baseUrl}/api/auth/me` });
        recordLifecycle({ greatnessRequestAuthorizationAttached: Boolean(token) });
      }
      const canonicalClient = global.MaatApiClient;
      const canonicalResult = canonicalClient?.request
        ? await canonicalClient.request("/api/auth/me", { auth: false, headers: { authorization: `Bearer ${token}` }, cache: "no-store", timeoutMs: options.timeoutMs || RESTORE_TIMEOUT_MS })
        : null;
      if (canonicalResult?.diagnostics) ensureDebugState().lastMeDiagnostics = canonicalResult.diagnostics;
      if (canonicalResult && canonicalResult.diagnostics.backendReached === null) throw Object.assign(canonicalResult.error || new Error("auth_network_unavailable"), { code: "AUTH_UNAVAILABLE" });
      const res = canonicalResult?.response || await fetchWithTimeout(`${baseUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` }, cache: "no-store"
      }, options.timeoutMs || RESTORE_TIMEOUT_MS);
      const authDiagnostics = canonicalResult?.diagnostics || { url: `${baseUrl}/api/auth/me`, dispatched: true, status: res.status, backendReached: true };
      ensureDebugState().lastMeDiagnostics = authDiagnostics;
      const payload = canonicalResult ? (canonicalResult.payload || {}) : await res.json().catch(() => ({}));
      authDiagnostics.authTrace = payload?.authTrace || payload?.error?.details?.authTrace || null;
      authDiagnostics.requestId = res.headers?.get?.("x-request-id") || payload?.requestId || authDiagnostics.authTrace?.requestId || null;
      const user = payload?.user || payload?.data?.user;
      if (res.status === 401) {
        const error = new Error(payload?.error || "invalid_session");
        error.status = res.status;
        error.authDiagnostics = authDiagnostics;
        throw error;
      }
      if (!res.ok || payload?.ok === false) {
        const error = new Error(payload?.error?.message || payload?.error || `auth_unavailable_${res.status}`);
        error.status = res.status;
        error.code = "AUTH_UNAVAILABLE";
        error.authDiagnostics = authDiagnostics;
        throw error;
      }
      if (!user) {
        const error = new Error("invalid_session");
        error.code = "INVALID_SESSION";
        error.authDiagnostics = authDiagnostics;
        throw error;
      }
      const inspection = storageInspection();
      const rememberMe = typeof options.rememberMe === "boolean" ? options.rememberMe : inspection.source === "localStorage" && inspection.persistentConsent;
      const auth = setCanonicalAuthState({ token, user }, { reason, rememberMe });
      backendValidatedToken = normalizeToken(token);
      if (onGreatness) {
        recordCheckpoint("GREATNESS_CHECKPOINT_3", { httpStatus: res.status, tokenPresentBeforeCleanup: true, tokenPresentAfterCleanup: Boolean(getStoredToken()), cleanupReason: "NONE" });
        recordLifecycle({ greatnessMeStatus: res.status });
      }
      return { ok: true, token, user, auth, diagnostics: authDiagnostics };
    } catch (error) {
      const debug = ensureDebugState();
      debug.lastAuthError = error?.message || String(error || "unknown_auth_refresh_error");
      const status = Number(error?.status || 0);
      const invalidSession = status === 401;
      if (invalidSession) {
        const beforeCleanup = Boolean(getStoredToken());
        if (options.preserveTokenOn401 !== true) clearCanonicalAuthState(`${reason}:invalid_session`, { forceDispatch: options.forceDispatch === true, httpStatus: 401, file: "public/auth-state-runtime.js", function: "refreshAuthStatus" });
        if (global.location?.pathname === "/greatness.html") {
          recordCheckpoint("GREATNESS_CHECKPOINT_3", { httpStatus: 401, tokenPresentBeforeCleanup: beforeCleanup, tokenPresentAfterCleanup: Boolean(getStoredToken()), cleanupReason: `${reason}:invalid_session` });
          recordLifecycle({ greatnessMeStatus: 401 });
        }
        if (options.visibleErrors === true) console.error(LOG_PREFIX, "refresh failed", error);
        return { ok: false, reason: "invalid_session", error, auth: global.APP_AUTH, diagnostics: error?.authDiagnostics || null, tokenPreserved: options.preserveTokenOn401 === true };
      }
      if (options.visibleErrors === true) console.error(LOG_PREFIX, "refresh unavailable", error);
      if (global.location?.pathname === "/greatness.html") {
        recordCheckpoint("GREATNESS_CHECKPOINT_3", { httpStatus: status || null, tokenPresentBeforeCleanup: Boolean(getStoredToken()), tokenPresentAfterCleanup: Boolean(getStoredToken()), cleanupReason: "NONE" });
        recordLifecycle({ greatnessMeStatus: status || null });
      }
      return { ok: false, reason: "auth_unavailable", error, auth: global.APP_AUTH, diagnostics: error?.authDiagnostics || null };
    }
  }

  function getAuthToken() {
    const token = global.APP_AUTH?.token || getStoredToken() || null;
    if (token) void traceTokenHandoff("token returned by AuthStateRuntime", token, {}, { function: "getAuthToken" });
    return token;
  }

  async function postAuthenticatedJSON(url, { method = "POST", body } = {}) {
    const token = getAuthToken();
    if (!token) {
      const err = new Error("missing_auth_token");
      err.code = "MISSING_AUTH_TOKEN";
      throw err;
    }

    const res = await global.fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body || {})
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch (_) {}

    if (res.status === 401 || res.status === 403) {
      const err = new Error("unauthorized");
      err.code = "UNAUTHORIZED";
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    if (!res.ok || !payload?.ok) {
      const err = new Error(payload?.error?.message || payload?.error || `request_failed_${res.status}`);
      err.code = "REQUEST_FAILED";
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    return payload?.data || null;
  }

  function isAuthUnavailable(err) {
    return err?.code === "MISSING_AUTH_TOKEN" || err?.code === "UNAUTHORIZED";
  }

  function sendToNode(payload, options = {}) {
    const commandUrl = options.commandUrl || global.RuntimeState?.getEndpoints?.().nodeCommandUrl;
    if (!commandUrl) return Promise.reject(new Error("node_command_url_unavailable"));
    const token = getAuthToken();
    return global.fetch(commandUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    }).catch((error) => {
      console.warn("Node send failed", error);
      throw error;
    });
  }

  function getCanonicalAuthState() {
    if (!global.APP_AUTH || typeof global.APP_AUTH !== "object") {
      global.APP_AUTH = normalizeState({ token: null, user: null });
      global.__AUTH_READY = false;
    }
    return global.APP_AUTH;
  }

  function getSafeDiagnostics() {
    const state = getCanonicalAuthState();
    const currentToken = state.token || getStoredToken();
    const metadata = currentToken ? tokenMetadata(currentToken) : (ensureDebugState().lastRejectedTokenMetadata || tokenMetadata(null));
    const roles = state.user?.roles || (state.user?.role ? [state.user.role] : []);
    return {
      authenticated: state.isAuthenticated === true,
      credentialPresent: Boolean(state.token || getStoredToken()),
      source: state.token ? "AuthStateRuntime.memory" : storageInspection().source,
      storageSource: storageInspection().source,
      rememberMeConsent: storageInspection().persistentConsent,
      frontendBundle: FRONTEND_BUILD,
      role: roles.includes("admin") || roles.includes("super_admin") ? "admin" : (state.user ? "member" : "none"),
      tokenFormatValid: metadata.validFormat,
      expiryState: metadata.expiryState,
      lastRestoreResult: ensureDebugState().lastRestoreResult || "not_run"
    };
  }

  function renderSafeDiagnostics(target) {
    const element = typeof target === "string" ? global.document?.getElementById?.(target) : target;
    if (!element) return false;
    const report = getSafeDiagnostics();
    element.textContent = [
      `Authenticated: ${report.authenticated ? "YES" : "NO"}`,
      `Token/session present: ${report.credentialPresent ? "YES" : "NO"}`,
      `Canonical auth source: ${report.source}`,
      `Storage restore source: ${report.storageSource}`,
      `Remember Me consent: ${report.rememberMeConsent ? "YES" : "NO"}`,
      `Frontend bundle: ${report.frontendBundle}`,
      `Role resolved: ${report.role}`,
      `Token format valid: ${report.tokenFormatValid ? "YES" : "NO"}`,
      `Expiry state: ${report.expiryState}`,
      `Last auth restore result: ${report.lastRestoreResult}`
    ].join("\n");
    return true;
  }

  function restoreCanonicalAuthState(options = {}) {
    if (restorePromise && options.force !== true) return restorePromise;
    const storedToken = getStoredToken();
    if (!storedToken) {
      authPhase = "unauthenticated";
      ensureDebugState().lastRestoreResult = "missing_token";
      publishRestoreDiagnostics({ tokenSource: "none", result: "missing_token" });
      return Promise.resolve({ ok: false, reason: "missing_token", auth: getCanonicalAuthState() });
    }
    authPhase = "restoring";
    const restoreStartedAt = new Date().toISOString();
    publishRestoreDiagnostics({ result: "restoring", restoreStartedAt });
    restorePromise = refreshAuthStatus({ ...options, timeoutMs: options.timeoutMs || RESTORE_TIMEOUT_MS, token: storedToken, reason: options.reason || "browser-storage-restore" })
      .then((result) => {
        authPhase = result.ok ? "authenticated" : (result.reason === "auth_unavailable" ? "error" : "unauthenticated");
        ensureDebugState().lastRestoreResult = result.ok ? "restored" : result.reason;
        publishRestoreDiagnostics({ result: ensureDebugState().lastRestoreResult, restoreStartedAt, restoreCompletedAt: new Date().toISOString(), failureClass: result.diagnostics?.failureClass || (result.ok ? null : result.reason), httpStatus: result.diagnostics?.status || null });
        return result;
      })
      .finally(() => { restorePromise = null; });
    return restorePromise;
  }

  function whenReady() {
    const state = getCanonicalAuthState();
    if (state.isAuthenticated && state.token === backendValidatedToken) return Promise.resolve({ ok: true, auth: state, user: state.user });
    return restoreCanonicalAuthState();
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = RESTORE_TIMEOUT_MS) {
    const controller = typeof global.AbortController === "function" ? new global.AbortController() : null;
    const timer = global.setTimeout?.(() => controller?.abort(), timeoutMs);
    try {
      return await global.fetch(url, { ...options, signal: options.signal || controller?.signal });
    } finally {
      if (timer != null) global.clearTimeout?.(timer);
    }
  }

  async function logout(options = {}) {
    const token = getCanonicalAuthState().token;
    const baseUrl = options.baseUrl || global.RuntimeState?.getEndpoints?.().nodeBaseUrl || global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.MAAT_NODE_BASE_URL || global.location?.origin;
    try {
      if (token) await global.fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { authorization: `Bearer ${token}` }, credentials: "include", cache: "no-store" });
    } catch (_) {
      // Local logout must complete even when the network is unavailable.
    } finally {
      clearCanonicalAuthState("logout", { forceDispatch: true, clearLastUser: true });
      clearAccountScopedBrowserState();
      for (const key of ["APP_MEMBER", "APP_MEMBERSHIP", "APP_ROLES", "__MEMBER_READ_MODEL", "__AUTHENTICATED_READ_MODELS"]) global[key] = null;
    }
    if (options.redirectTo) global.location?.assign?.(options.redirectTo);
    return { ok: true };
  }

  function clearAccountScopedBrowserState() {
    const exactKeys = new Set(["maat.activeWorkoutSelection.v1", "maat.activeWorkoutCompletion.v1", "maat.workoutProgression.v1", "maat.lastGreatnessEntryTrace.v1"]);
    const prefixes = ["maat.profile", "maat.challenge", "maat.membership", "maat.billing", "maat.messages", "maat.assessment", "maat.program", "maat.admin", "mufasa.push-up.sessions"];
    for (const storage of [global.localStorage, global.sessionStorage]) {
      try {
        const keys = Array.from({ length: storage?.length || 0 }, (_, index) => storage.key(index));
        keys.filter((key) => exactKeys.has(key) || prefixes.some((prefix) => key?.startsWith(prefix))).forEach((key) => storage.removeItem(key));
      } catch (_) {}
    }
  }

  function installAuthStatusRefreshBridge() {
    if (global.__authStatusRefreshBridgeInstalled === true) return false;
    global.__authStatusRefreshBridgeInstalled = true;
    global.addEventListener?.("auth:refresh", (event) => {
      refreshAuthStatus({ ...(event?.detail || {}), reason: event?.detail?.reason || "auth:refresh" });
    });
    global.addEventListener?.("pageshow", (event) => {
      if (event?.persisted || !getCanonicalAuthState().isAuthenticated) restoreCanonicalAuthState({ force: true, reason: "pageshow-restore" });
    });
    global.addEventListener?.("storage", (event) => {
      if (event?.key === TOKEN_STORAGE_KEY) restoreCanonicalAuthState({ force: true, reason: "storage-event-restore" });
    });
    return true;
  }

  getCanonicalAuthState();
  ensureDebugState();
  installAuthStatusRefreshBridge();

  global.setCanonicalAuthState = setCanonicalAuthState;
  global.AuthStateRuntime = {
    TOKEN_STORAGE_KEY,
    PERSISTENCE_STORAGE_KEY,
    ORIGIN_STORAGE_KEY,
    LIFECYCLE_KEY,
    RETIRED_STORAGE_KEYS,
    FRONTEND_BUILD,
    RESTORE_TIMEOUT_MS,
    clearCanonicalAuthState,
    clearAccountScopedBrowserState,
    ensureDebugState,
    getAuthToken,
    getCanonicalAuthState,
    getSafeDiagnostics,
    getStoredToken,
    storageInspection,
    normalizeToken,
    tokenMetadata,
    readLifecycle,
    readTokenHandoffTrace,
    recordLifecycle,
    recordCheckpoint,
    installAuthStatusRefreshBridge,
    isAuthUnavailable,
    logout,
    postAuthenticatedJSON,
    persistCanonicalAuthState,
    refreshAuthStatus,
    renderSafeDiagnostics,
    restoreCanonicalAuthState,
    sendToNode,
    setCanonicalAuthState,
    traceTokenHandoff,
    whenReady
  };

  console.log(LOG_PREFIX, "loaded");
  restoreCanonicalAuthState().catch(() => {});
})(typeof window !== "undefined" ? window : globalThis);
