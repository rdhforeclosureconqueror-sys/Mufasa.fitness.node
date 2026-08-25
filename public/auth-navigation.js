(function installAuthNavigation(global) {
  "use strict";
  const DEFAULT_RETURN_TO = "/dashboard.html";
  const DEFINITIVE_FAILURES = new Set(["missing_token", "invalid_token", "expired_token", "invalid_session"]);
  function normalizeReturnTo(candidate, fallback = DEFAULT_RETURN_TO) {
    if (typeof candidate !== "string" || !candidate || /[\u0000-\u001f\u007f\\]/.test(candidate)) return fallback;
    if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
    try {
      const decoded = decodeURIComponent(candidate);
      if (/[\u0000-\u001f\u007f\\]/.test(decoded)) return fallback;
    } catch (_) { return fallback; }
    try {
      const target = new URL(candidate, global.location.origin);
      if (target.origin !== global.location.origin || target.pathname === "/login.html") return fallback;
      return `${target.pathname}${target.search}${target.hash}`;
    } catch (_) { return fallback; }
  }
  function loginUrl(returnTo = DEFAULT_RETURN_TO, options = {}) {
    const target = new URL("/login.html", global.location.origin);
    target.searchParams.set("returnTo", normalizeReturnTo(returnTo));
    if (options.mode === "register") target.searchParams.set("mode", "register");
    return `${target.pathname}${target.search}`;
  }
  async function requireUser(options = {}) {
    const runtime = global.AuthStateRuntime;
    const returnTo = normalizeReturnTo(options.returnTo || `${global.location.pathname}${global.location.search}${global.location.hash}`);
    if (!runtime?.whenReady || !runtime?.getCanonicalAuthState) return { ok: false, reason: "auth_runtime_unavailable", retryable: true };
    let readiness;
    try { readiness = await runtime.whenReady(); }
    catch (error) { return { ok: false, reason: "auth_unavailable", retryable: true, error }; }
    const auth = runtime.getCanonicalAuthState();
    if (readiness?.ok && auth?.isAuthenticated === true && auth.token && auth.user) return { ok: true, user: auth.user, auth };
    if (!DEFINITIVE_FAILURES.has(readiness?.reason)) return { ok: false, reason: readiness?.reason || "auth_unavailable", retryable: true, auth };
    const target = loginUrl(returnTo);
    if (options.redirect !== false) (options.replace === false ? global.location.assign : global.location.replace).call(global.location, target);
    return { ok: false, reason: readiness.reason, redirected: options.redirect !== false, target, auth };
  }
  global.AuthNavigation = Object.freeze({ DEFAULT_RETURN_TO, DEFINITIVE_FAILURES, normalizeReturnTo, loginUrl, requireUser });
})(typeof window !== "undefined" ? window : globalThis);
