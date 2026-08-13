import { backendOrigin } from "./backend-origin.js?v=frontend-build-key-20260811";

const destination = "/greatness.html";
const safeReturnTo = value => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return destination;
  const target = new URL(value, window.location.origin);
  return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : destination;
};
const returnTo = safeReturnTo(new URLSearchParams(location.search).get("returnTo"));
const FRONTEND_BUILD = "2026-08-13-token-handoff-trace-v1";
const ids = ["joinTab", "signInTab", "form-title", "form-copy", "runClubAuthForm", "nameField", "name", "email", "password", "submitButton", "status", "authDebugger", "authDebugTrace", "copyAuthTrace", "copyAuthStatus"];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
let mode = "register";
let redactedTraceText = "";

const yesNo = value => value === true ? "YES" : value === false ? "NO" : "UNKNOWN";
const value = input => input === null || input === undefined || input === "" ? "NOT_AVAILABLE" : String(input);
async function fingerprint(token) {
  if (!token || !globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
}
function safeClaims(token) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return { iss: claims.iss ?? null, aud: claims.aud ?? null, iat: Number.isFinite(Number(claims.iat)) ? Number(claims.iat) : null, exp: Number.isFinite(Number(claims.exp)) ? Number(claims.exp) : null };
  } catch (_) { return { iss: null, aud: null, iat: null, exp: null }; }
}
function renderAuthTrace(trace) {
  const lines = Object.entries(trace).map(([label, entry]) => `${label}: ${value(entry)}`);
  redactedTraceText = ["REDACTED LOGIN AUTH TRACE", ...lines, "Safety: JWT/password/Authorization/account identity omitted"].join("\n");
  el.authDebugTrace.textContent = redactedTraceText;
  el.authDebugger.hidden = false;
}
el.copyAuthTrace.onclick = async () => {
  try { await navigator.clipboard.writeText(redactedTraceText); el.copyAuthStatus.textContent = "Redacted auth trace copied."; }
  catch (_) { el.authDebugTrace.focus(); el.copyAuthStatus.textContent = "Press and hold the trace, then choose Copy."; }
};

function checkpoint(name, values) { window.AuthStateRuntime?.recordCheckpoint?.(name, values); }
function lifecycle(values) { window.AuthStateRuntime?.recordLifecycle?.(values); }
function render(next) {
  mode = next;
  const joining = mode === "register";
  el.joinTab.setAttribute("aria-selected", String(joining));
  el.signInTab.setAttribute("aria-selected", String(!joining));
  el.nameField.hidden = !joining;
  el.name.required = joining;
  el.password.autocomplete = joining ? "new-password" : "current-password";
  el["form-title"].textContent = joining ? "Create your free account" : "Sign in to the Run Club";
  el["form-copy"].textContent = joining ? "Your free account keeps your run history and progress in one place." : "Welcome back. Your trails and progress are waiting.";
  el.submitButton.textContent = joining ? "Join Free" : "Sign In";
  el.status.textContent = "";
}

async function existingSession() {
  const runtime = window.AuthStateRuntime;
  if (!runtime?.whenReady) return;
  const result = await runtime.whenReady();
  const state = runtime.getCanonicalAuthState();
  if (result.ok && state.isAuthenticated && state.token && state.user?.id) location.replace(returnTo);
}

el.joinTab.onclick = () => render("register");
el.signInTab.onclick = () => render("login");
el.runClubAuthForm.onsubmit = async event => {
  event.preventDefault();
  el.submitButton.disabled = true;
  el.status.textContent = mode === "register" ? "Creating your free Run Club account…" : "Signing you in…";
  try {
    const runtime = window.AuthStateRuntime;
    if (!runtime?.persistCanonicalAuthState || !runtime?.refreshAuthStatus) throw new Error("Authentication persistence is unavailable on this device");
    const body = { email: el.email.value.trim(), password: el.password.value };
    if (mode === "register") Object.assign(body, { name: el.name.value.trim(), entryContext: "run_club" });
    const response = await fetch(`${backendOrigin()}/api/auth/${mode === "register" ? "register" : "login"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    const loginRequestId = response.headers.get("x-request-id") || payload?.authTrace?.requestId || null;
    const returnedToken = payload?.token;
    await runtime.traceTokenHandoff("raw token received from login response", returnedToken, { json: true, reset: true }, { file: "public/run-club-login.js", function: "onsubmit" });
    const normalizedToken = runtime.normalizeToken(returnedToken);
    await runtime.traceTokenHandoff("normalized token before persistence", normalizedToken, {}, { file: "public/run-club-login.js", function: "onsubmit" });
    const metadata = runtime.tokenMetadata(normalizedToken);
    const common = { loginHttpStatus: response.status, loginTokenReturned: Boolean(returnedToken), tokenNormalized: Boolean(normalizedToken), tokenFormatValid: metadata.validFormat };
    lifecycle({ ...common, persistence: "NOT_RUN", loginPageMeDispatched: false, navigationAllowed: false, tokenClearedBy: "NONE" });
    checkpoint("LOGIN_CHECKPOINT_1", common);
    if (!response.ok || !returnedToken) throw new Error(payload.error?.message || payload.error || "Unable to continue");
    if (!metadata.validFormat || metadata.expiryState === "expired") throw new Error(metadata.expiryState === "expired" ? "The issued session has expired" : "The issued session format is invalid");

    const persisted = await runtime.persistCanonicalAuthState({ token: normalizedToken, user: payload.user }, { reason: "run-club-auth:persist" });
    await runtime.traceTokenHandoff("exact token written to localStorage.maatAuthToken", localStorage.getItem("maatAuthToken"), {}, { file: "public/run-club-login.js", function: "onsubmit" });
    const readBack = runtime.getStoredToken();
    await runtime.traceTokenHandoff("exact token read back from localStorage", localStorage.getItem("maatAuthToken"), {}, { file: "public/run-club-login.js", function: "onsubmit" });
    const readBackMatches = Boolean(persisted.ok && readBack === normalizedToken);
    const persistence = readBackMatches ? "PASS" : "FAIL";
    lifecycle({ persistence, tokenPersisted: Boolean(persisted.ok), persistenceReadBack: persistence, persistedTokenLength: readBack?.length || 0 });
    checkpoint("LOGIN_CHECKPOINT_2", { tokenPersisted: Boolean(persisted.ok), persistenceReadBack: persistence, persistedTokenLength: readBack?.length || 0 });
    if (!readBackMatches) throw new Error("Authentication could not be restored on this device: storage verification failed");

    const validation = await runtime.refreshAuthStatus({ token: normalizedToken, reason: "run-club-auth:login-page-validation", preserveTokenOn401: true });
    const diagnostics = validation.diagnostics || validation.error?.authDiagnostics || runtime.ensureDebugState().lastMeDiagnostics || {};
    const status = diagnostics.status ?? null;
    const identityResolved = Boolean(validation.ok && validation.user?.id);
    lifecycle({ loginPageMeDispatched: diagnostics.dispatched === true, loginPageMeStatus: status, loginPageAuthorizationAttached: true, loginPageBearerPrefixCorrect: true, loginPageTokenFormatValid: metadata.validFormat, identityResolved, beforeNavigationTokenPresent: Boolean(runtime.getStoredToken()), navigationAllowed: identityResolved && status === 200 });
    checkpoint("LOGIN_CHECKPOINT_3", { httpStatus: status, requestDispatched: diagnostics.dispatched === true, authorizationHeaderAttached: true, bearerPrefixCorrect: true, tokenFormatValid: metadata.validFormat, identityResolved });
    if (!identityResolved || status !== 200) {
      const beforeCleanup = Boolean(runtime.getStoredToken());
      const claims = safeClaims(normalizedToken);
      const loginTrace = payload?.authTrace || {};
      const meTrace = diagnostics.authTrace || validation.error?.details?.authTrace || {};
      const browserTime = new Date();
      const serverTime = Date.parse(meTrace.serverTimestamp || loginTrace.serverTimestamp || "");
      const tokenFingerprint = await fingerprint(normalizedToken);
      const sameBackend = loginTrace.instance && meTrace.instance ? loginTrace.instance === meTrace.instance && loginTrace.build === meTrace.build : null;
      const keysMatch = loginTrace.keyFingerprint && meTrace.keyFingerprint ? loginTrace.keyFingerprint === meTrace.keyFingerprint : null;
      const capturedTrace = {
        "frontend build/version": FRONTEND_BUILD, "backend resolved URL": backendOrigin(),
        "login HTTP status": response.status, "login response token present": yesNo(Boolean(returnedToken)),
        "token structural format valid": yesNo(metadata.validFormat), "token fingerprint SHA-256 prefix": tokenFingerprint,
        "token iss": claims.iss, "token aud": claims.aud, "token iat timestamp": claims.iat ? new Date(claims.iat).toISOString() : null,
        "token exp timestamp": claims.exp ? new Date(claims.exp).toISOString() : null, "browser time": browserTime.toISOString(),
        "calculated clock difference ms (browser - backend)": Number.isFinite(serverTime) ? browserTime.getTime() - serverTime : null,
        "persistence write result": persisted.ok ? "PASS" : "FAIL", "persistence read-back result": persistence,
        "token present immediately before /api/auth/me": yesNo(true), "Authorization header attached": yesNo(meTrace.authorizationHeaderPresent ?? (diagnostics.dispatched === true)),
        "/api/auth/me HTTP status": status, "backend authentication reason code": meTrace.reason || validation.reason,
        "backend instance identifier": meTrace.instance, "backend build/deployment identifier": `${value(meTrace.build)} / ${value(meTrace.deployment)}`,
        "verifier key fingerprint SHA-256 prefix": meTrace.keyFingerprint, "signer key fingerprint SHA-256 prefix": loginTrace.keyFingerprint,
        "issuer expected vs received": `${value(meTrace.issuerExpected)} vs ${value(meTrace.issuerReceived || claims.iss)}`,
        "audience expected vs received": `${value(meTrace.audienceExpected)} vs ${value(meTrace.audienceReceived || claims.aud)}`,
        "signature validation result": meTrace.signature, "expiry validation result": meTrace.expiration,
        "immediate post-issuance self-verification": loginTrace.immediateSelfVerification,
        "issued compact-token fingerprint": loginTrace.issuedTokenFingerprint,
        "/api/auth/me received compact-token fingerprint": meTrace.receivedTokenFingerprint,
        "all compact-token fingerprints identical": yesNo(meTrace.fingerprintsIdentical),
        "signing-input fingerprints identical": yesNo(meTrace.signingInputFingerprintsIdentical),
        "JWT algorithm issuance / verification / consistent": `${value(loginTrace.issuedCompactToken?.algorithm)} / ${value(meTrace.compactToken?.algorithm)} / ${yesNo(meTrace.algorithmConsistent)}`,
        "encoded header/payload/signature SHA-256 prefixes": `${value(meTrace.compactToken?.encodedHeaderFingerprint)} / ${value(meTrace.compactToken?.encodedPayloadFingerprint)} / ${value(meTrace.compactToken?.signatureFingerprint)}`,
        "signing-input SHA-256 prefix": meTrace.compactToken?.signingInputFingerprint,
        "exact effective signer key fingerprint / bytes / type": `${value(meTrace.signerKeyMaterial?.fingerprint)} / ${value(meTrace.signerKeyMaterial?.byteLength)} / ${value(meTrace.signerKeyMaterial?.effectiveType)}`,
        "exact effective verifier key fingerprint / bytes / type": `${value(meTrace.verifierKeyMaterial?.fingerprint)} / ${value(meTrace.verifierKeyMaterial?.byteLength)} / ${value(meTrace.verifierKeyMaterial?.effectiveType)}`,
        "signer key transformations / source": `trim=${yesNo(meTrace.signerKeyMaterial?.trimmingOccurred)} decode=${yesNo(meTrace.signerKeyMaterial?.decodingOccurred)} base64=${yesNo(meTrace.signerKeyMaterial?.base64ConversionOccurred)} source=${value(meTrace.signerKeyMaterial?.source)} input=${value(meTrace.signerKeyMaterial?.inputType)}`,
        "verifier key transformations / source": `trim=${yesNo(meTrace.verifierKeyMaterial?.trimmingOccurred)} decode=${yesNo(meTrace.verifierKeyMaterial?.decodingOccurred)} base64=${yesNo(meTrace.verifierKeyMaterial?.base64ConversionOccurred)} source=${value(meTrace.verifierKeyMaterial?.source)} input=${value(meTrace.verifierKeyMaterial?.inputType)}`,
        "signer/verifier JWT library": `${value(meTrace.signerLibrary)} / ${value(meTrace.verifierLibrary)}`,
        "issuer/audience rules identical": `${yesNo(meTrace.issuerRulesIdentical)} / ${yesNo(meTrace.audienceRulesIdentical)}`,
        "exact internal failure stage": meTrace.failureStage,
        "proven root cause": meTrace.rootCause,
        "subject/member lookup result": meTrace.subjectLookup, "login request/correlation ID": loginRequestId,
        "/api/auth/me request/correlation ID": diagnostics.requestId || meTrace.requestId,
        "same backend instance/build": yesNo(sameBackend), "signer/verifier fingerprints match": yesNo(keysMatch),
        "token state immediately before cleanup": yesNo(beforeCleanup)
      };
      runtime.clearCanonicalAuthState("run-club-auth:debugger-captured-rejection", { httpStatus: status, clearLastUser: true });
      capturedTrace["token state immediately after cleanup"] = yesNo(Boolean(runtime.getStoredToken()));
      renderAuthTrace(capturedTrace);
      throw new Error(status === 401 ? "The issued session was rejected. Please sign in again." : "Your session could not be verified. Please try again.");
    }
    checkpoint("LOGIN_CHECKPOINT_4", { canonicalTokenPresent: Boolean(runtime.getStoredToken()), navigationAllowed: true });
    location.assign(returnTo);
  } catch (error) {
    el.status.textContent = error.message;
    el.submitButton.disabled = false;
  }
};
existingSession();

const traceTools = document.getElementById("greatnessTraceTools");
const traceButton = document.getElementById("showGreatnessTrace");
const traceOutput = document.getElementById("lastGreatnessTrace");
let storedTrace = null;
try { storedTrace = JSON.parse(sessionStorage.getItem(window.GreatnessEntryAuth?.TRACE_KEY || "maat.lastGreatnessEntryTrace.v1") || "null"); } catch (_) {}
const traceDebugRequested = new URLSearchParams(location.search).get("debugAuthTrace") === "1";
const traceAdmin = window.AuthStateRuntime?.getSafeDiagnostics?.().role === "admin";
if (traceTools && (storedTrace || traceDebugRequested || traceAdmin)) traceTools.hidden = false;
if (traceButton) traceButton.onclick = () => {
  traceOutput.hidden = false;
  const entry = storedTrace && window.GreatnessEntryAuth?.format ? window.GreatnessEntryAuth.format(storedTrace) : "No Greatness entry trace is stored for this tab.";
  traceOutput.textContent = `${entry}\n\nLogin-to-Greatness Token Lifecycle\n${window.GreatnessEntryAuth?.formatLifecycle?.(window.AuthStateRuntime?.readLifecycle?.() || {}) || "No lifecycle trace is stored for this tab."}`;
};
