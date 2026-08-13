(function initAuthStateRuntime(globalScope) {
  "use strict";

  const global = globalScope || window;
  const TOKEN_STORAGE_KEY = "maatAuthToken";
  const ORIGIN_STORAGE_KEY = "maatAuthOrigin";
  const RETIRED_STORAGE_KEYS = ["maat_auth_token", "mufasa_auth_token", "authToken", "pocket_pt_auth_token"];
  const LOG_PREFIX = "[AUTH_STATE_RUNTIME]";
  let restorePromise = null;
  let backendValidatedToken = null;

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
    try { return normalizeToken(global.localStorage?.getItem(TOKEN_STORAGE_KEY)); } catch (_) { return null; }
  }

  function persistToken(token) {
    try {
      if (token) global.localStorage?.setItem(TOKEN_STORAGE_KEY, normalizeToken(token));
      else global.localStorage?.removeItem(TOKEN_STORAGE_KEY);
    } catch (_) {}
  }

  async function persistCanonicalAuthState(input = {}, options = {}) {
    const state = setCanonicalAuthState(input, options);
    if (!state.token) return { ok: true, state };
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        global.localStorage?.setItem(ORIGIN_STORAGE_KEY, global.location?.origin || "unknown");
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
    if (nextState.user) global.__LAST_AUTH_USER = nextState.user;
    else if (options.clearLastUser === true) global.__LAST_AUTH_USER = null;
    global.__AUTH_READY = nextState.isAuthenticated === true;
    persistToken(nextState.token);

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
    backendValidatedToken = null;
    const state = setCanonicalAuthState({ token: null, user: null }, { ...options, reason, clearLastUser: options.clearLastUser === true });
    // Remove retired aliases so logout/invalid-session cleanup is global, not page-specific.
    for (const storage of [global.localStorage, global.sessionStorage]) {
      try { RETIRED_STORAGE_KEYS.forEach((key) => storage?.removeItem(key)); } catch (_) {}
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
      clearCanonicalAuthState(`${reason}:invalid_token`, { forceDispatch: options.forceDispatch === true, clearLastUser: true });
      return { ok: false, reason: metadata.expiryState === "expired" ? "expired_token" : "invalid_token", auth: global.APP_AUTH };
    }
    try {
      const canonicalClient = global.MaatApiClient;
      const canonicalResult = canonicalClient?.request
        ? await canonicalClient.request("/api/auth/me", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" })
        : null;
      if (canonicalResult && canonicalResult.diagnostics.backendReached === null) throw Object.assign(canonicalResult.error || new Error("auth_network_unavailable"), { code: "AUTH_UNAVAILABLE" });
      const res = canonicalResult?.response || await global.fetch(`${baseUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` }, cache: "no-store"
      });
      const payload = canonicalResult ? (canonicalResult.payload || {}) : await res.json().catch(() => ({}));
      const user = payload?.user || payload?.data?.user;
      if (res.status === 401 || res.status === 403) {
        const error = new Error(payload?.error || "invalid_session");
        error.status = res.status;
        throw error;
      }
      if (!res.ok || payload?.ok === false) {
        const error = new Error(payload?.error?.message || payload?.error || `auth_unavailable_${res.status}`);
        error.status = res.status;
        error.code = res.status >= 500 ? "AUTH_UNAVAILABLE" : "INVALID_SESSION";
        throw error;
      }
      if (!user) {
        const error = new Error("invalid_session");
        error.code = "INVALID_SESSION";
        throw error;
      }
      const auth = setCanonicalAuthState({ token, user }, { reason });
      backendValidatedToken = normalizeToken(token);
      return { ok: true, token, user, auth };
    } catch (error) {
      const debug = ensureDebugState();
      debug.lastAuthError = error?.message || String(error || "unknown_auth_refresh_error");
      const status = Number(error?.status || 0);
      const invalidSession = status === 401 || status === 403 || error?.code === "INVALID_SESSION";
      if (invalidSession) {
        clearCanonicalAuthState(`${reason}:invalid_session`, { forceDispatch: options.forceDispatch === true });
        if (options.visibleErrors === true) console.error(LOG_PREFIX, "refresh failed", error);
        return { ok: false, reason: "invalid_session", error, auth: global.APP_AUTH };
      }
      if (options.visibleErrors === true) console.error(LOG_PREFIX, "refresh unavailable", error);
      return { ok: false, reason: "auth_unavailable", error, auth: global.APP_AUTH };
    }
  }

  function getAuthToken() {
    return global.APP_AUTH?.token || getStoredToken() || null;
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
      source: state.token ? "AuthStateRuntime.memory" : (getStoredToken() ? `localStorage.${TOKEN_STORAGE_KEY}` : "none"),
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
      ensureDebugState().lastRestoreResult = "missing_token";
      return Promise.resolve({ ok: false, reason: "missing_token", auth: getCanonicalAuthState() });
    }
    restorePromise = refreshAuthStatus({ ...options, token: storedToken, reason: options.reason || "browser-storage-restore" })
      .then((result) => {
        ensureDebugState().lastRestoreResult = result.ok ? "restored" : result.reason;
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

  async function logout(options = {}) {
    const token = getCanonicalAuthState().token;
    const baseUrl = options.baseUrl || global.RuntimeState?.getEndpoints?.().nodeBaseUrl || global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.MAAT_NODE_BASE_URL || global.location?.origin;
    try {
      if (token) await global.fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    } catch (_) {
      // Local logout must complete even when the network is unavailable.
    } finally {
      clearCanonicalAuthState("logout", { forceDispatch: true, clearLastUser: true });
      for (const key of ["APP_MEMBER", "APP_MEMBERSHIP", "APP_ROLES", "__MEMBER_READ_MODEL", "__AUTHENTICATED_READ_MODELS"]) global[key] = null;
    }
    if (options.redirectTo) global.location?.assign?.(options.redirectTo);
    return { ok: true };
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
    ORIGIN_STORAGE_KEY,
    RETIRED_STORAGE_KEYS,
    clearCanonicalAuthState,
    ensureDebugState,
    getAuthToken,
    getCanonicalAuthState,
    getSafeDiagnostics,
    getStoredToken,
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
    whenReady
  };

  console.log(LOG_PREFIX, "loaded");
  restoreCanonicalAuthState().catch(() => {});
})(typeof window !== "undefined" ? window : globalThis);
