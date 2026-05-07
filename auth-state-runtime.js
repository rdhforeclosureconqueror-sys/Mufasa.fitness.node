(function initAuthStateRuntime(globalScope) {
  "use strict";

  const global = globalScope || window;
  const DEFAULT_NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const TOKEN_STORAGE_KEY = "maatAuthToken";
  const LOG_PREFIX = "[AUTH_STATE_RUNTIME]";

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
    try { return global.localStorage?.getItem(TOKEN_STORAGE_KEY) || null; } catch (_) { return null; }
  }

  function persistToken(token) {
    try {
      if (token) global.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
      else global.localStorage?.removeItem(TOKEN_STORAGE_KEY);
    } catch (_) {}
  }

  function normalizeUser(user) {
    if (!user || typeof user !== "object") return null;
    return user;
  }

  function normalizeState(input) {
    const payload = input && typeof input === "object" ? input : {};
    const token = payload.token || null;
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
    if (typeof global.CustomEvent === "function") return new CustomEvent(name, { detail });
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
    return setCanonicalAuthState({ token: null, user: null }, { ...options, reason, clearLastUser: options.clearLastUser === true });
  }

  async function refreshAuthStatus(options = {}) {
    const reason = options.reason || "refreshAuthStatus";
    const token = options.token || global.APP_AUTH?.token || getStoredToken();
    const baseUrl = options.baseUrl || global.RuntimeState?.getEndpoints?.().nodeBaseUrl || DEFAULT_NODE_BASE_URL;
    if (!token) {
      clearCanonicalAuthState(`${reason}:missing_token`, { forceDispatch: options.forceDispatch === true });
      return { ok: false, reason: "missing_token", auth: global.APP_AUTH };
    }
    try {
      const res = await global.fetch(`${baseUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      const payload = await res.json().catch(() => ({}));
      const user = payload?.user || payload?.data?.user;
      if (!res.ok || !payload?.ok || !user) throw new Error(payload?.error || "invalid_session");
      const auth = setCanonicalAuthState({ token, user }, { reason });
      return { ok: true, token, user, auth };
    } catch (error) {
      const debug = ensureDebugState();
      debug.lastAuthError = error?.message || String(error || "unknown_auth_refresh_error");
      clearCanonicalAuthState(`${reason}:invalid_session`, { forceDispatch: options.forceDispatch === true });
      if (options.visibleErrors === true) console.error(LOG_PREFIX, "refresh failed", error);
      return { ok: false, reason: "invalid_session", error, auth: global.APP_AUTH };
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

  function installAuthStatusRefreshBridge() {
    if (global.__authStatusRefreshBridgeInstalled === true) return false;
    global.__authStatusRefreshBridgeInstalled = true;
    global.addEventListener?.("auth:refresh", (event) => {
      refreshAuthStatus({ ...(event?.detail || {}), reason: event?.detail?.reason || "auth:refresh" });
    });
    return true;
  }

  getCanonicalAuthState();
  ensureDebugState();
  installAuthStatusRefreshBridge();

  global.setCanonicalAuthState = setCanonicalAuthState;
  global.AuthStateRuntime = {
    TOKEN_STORAGE_KEY,
    clearCanonicalAuthState,
    ensureDebugState,
    getAuthToken,
    getCanonicalAuthState,
    getStoredToken,
    installAuthStatusRefreshBridge,
    isAuthUnavailable,
    postAuthenticatedJSON,
    refreshAuthStatus,
    sendToNode,
    setCanonicalAuthState
  };

  console.log(LOG_PREFIX, "loaded");
})(typeof window !== "undefined" ? window : globalThis);
