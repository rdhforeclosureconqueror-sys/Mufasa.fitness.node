(function initMobileAuthDiagnostics(window, document) {
  "use strict";
  var output = document.getElementById("mobileAuthDiagnosticsStatus"), button = document.getElementById("runMobileAuthDiagnosticsBtn");
  if (!output || !button) return;
  var aliases = ["maat_auth_token", "mufasa_auth_token", "authToken", "pocket_pt_auth_token"];
  function probe(storage) { var key = "__maat_auth_probe__"; try { storage.setItem(key, "1"); var ok = storage.getItem(key) === "1"; storage.removeItem(key); return { available: true, readWrite: ok }; } catch (_) { return { available: false, readWrite: false }; } }
  function yes(value) { return value ? "YES" : "NO"; } function pass(value) { return value ? "PASS" : "FAIL"; }
  function family() { var ua = navigator.userAgent || "unknown"; if (/CriOS/i.test(ua)) return "Chrome on iOS"; if (/FxiOS/i.test(ua)) return "Firefox on iOS"; if (/Safari/i.test(ua) && /Mobile/i.test(ua)) return "Mobile Safari"; if (/Safari/i.test(ua)) return "Safari"; if (/Chrome/i.test(ua)) return "Chrome"; return "Other"; }
  function clean(payload, status) { var raw = payload?.error?.code || payload?.error?.message || payload?.error || payload?.message || (status < 400 ? "ok" : "request_denied"); return String(raw).replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 100); }
  async function api(path) {
    if (!window.MaatApiClient?.request) return { summary: "request construction", detail: ["resolved API URL: UNKNOWN", "request dispatched: NO", "backend reached: UNKNOWN", "failure class: request construction"] };
    var result = await window.MaatApiClient.request(path), info = result.diagnostics;
    var summary = info.status ? info.status + " " + clean(result.payload, info.status) : info.failureClass;
    return { summary: summary, detail: ["resolved API URL: " + (info.url || "UNKNOWN"), "API origin: " + info.apiOrigin, "request mode: " + (info.crossOrigin ? "cross-origin" : "same-origin"), "request dispatched: " + yes(info.dispatched), "preflight required: " + (info.preflightRequired === null ? "UNKNOWN" : yes(info.preflightRequired)), "backend reached: " + (info.backendReached === null ? "UNKNOWN" : yes(info.backendReached)), "HTTP status: " + (info.status || "NONE"), "failure class: " + (info.failureClass || "none")] };
  }

  async function run() {
    button.disabled = true; output.textContent = "Running safe mobile authentication checks…";
    var runtime = window.AuthStateRuntime, local = probe(localStorage), session = probe(sessionStorage), ready = { ok: false, reason: "runtime_unavailable" };
    if (runtime?.whenReady) ready = await runtime.whenReady().catch(function () { return { ok: false, reason: "restore_error" }; });
    var diagnostic = runtime?.getSafeDiagnostics?.() || {}, token = runtime?.getAuthToken?.() || null, storedOrigin = null, alternate = false;
    try { storedOrigin = localStorage.getItem("maatAuthOrigin"); alternate = aliases.some(function (key) { return Boolean(localStorage.getItem(key) || sessionStorage.getItem(key)); }); } catch (_) {}
    var backend = window.RuntimeState?.getBackendOrigin?.() || location.origin, mismatch = Boolean(storedOrigin && storedOrigin !== location.origin), debug = runtime?.ensureDebugState?.() || {};
    var privateStorage = navigator.storage?.persisted ? await navigator.storage.persisted().catch(function () { return null; }) : null;
    var checks = await Promise.all([api("/api/auth/me"), api("/api/me/history"), api("/api/admin/diagnostics/summary")]);
    output.textContent = ["Browser / Origin", "current origin: " + location.origin, "current pathname: " + location.pathname, "browser family: " + family(), "standalone/PWA mode: " + yes(Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone)), "private-storage availability: " + (privateStorage === null ? "UNKNOWN" : yes(privateStorage)), "", "Storage", "localStorage available: " + pass(local.available), "localStorage write/read test: " + pass(local.readWrite), "maatAuthToken present: " + yes(Boolean(token)), "token format valid: " + yes(diagnostic.tokenFormatValid), "token expired: " + (diagnostic.expiryState === "expired" ? "YES" : diagnostic.expiryState === "valid" ? "NO" : "UNKNOWN"), "retired/alternate auth keys present: " + yes(alternate), "sessionStorage available: " + pass(session.available), "", "Canonical Auth Runtime", "AuthStateRuntime loaded: " + yes(Boolean(runtime)), "whenReady resolved: " + yes(Boolean(ready)), "authenticated: " + yes(diagnostic.authenticated), "resolved role: " + (diagnostic.role || "none"), "auth restoration result: " + (diagnostic.lastRestoreResult || ready.reason || "unknown"), "auth restoration source: " + (diagnostic.source || "none"), "last restoration error: " + (debug.lastAuthError || "none"), "", "API Verification", "/api/auth/me: " + checks[0].summary, checks[0].detail.join("\n"), "", "/api/me/history: " + checks[1].summary, checks[1].detail.join("\n"), "", "Admin diagnostics authorization: " + checks[2].summary, checks[2].detail.join("\n"), "", "Origin Consistency", "login/dashboard/diagnostics frontend origin: " + (mismatch ? "FAIL" : "PASS"), "stored auth origin: " + (storedOrigin || "UNKNOWN (created before origin tracking)"), "canonical production origin: https://mufasafitsite.onrender.com", "backend origin: " + backend + (backend !== location.origin ? " (separate API origin)" : ""), "alternate/redirect origin detected: " + yes(mismatch), !ready.ok ? "\nAuthentication could not be restored on this device: " + (debug.lastAuthError || ready.reason || "unknown sanitized reason") : ""].join("\n");
    button.disabled = false;
  }
  button.addEventListener("click", run);
})(window, document);
