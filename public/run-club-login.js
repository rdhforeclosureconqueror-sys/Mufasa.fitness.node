import { backendOrigin } from "./backend-origin.js?v=frontend-build-key-20260811";

const destination = "/greatness.html";
const safeReturnTo = value => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return destination;
  const target = new URL(value, window.location.origin);
  return target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : destination;
};
const returnTo = safeReturnTo(new URLSearchParams(location.search).get("returnTo"));
const ids = ["joinTab", "signInTab", "form-title", "form-copy", "runClubAuthForm", "nameField", "name", "email", "password", "submitButton", "status"];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
let mode = "register";

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
    const returnedToken = payload?.token;
    const normalizedToken = runtime.normalizeToken(returnedToken);
    const metadata = runtime.tokenMetadata(normalizedToken);
    const common = { loginHttpStatus: response.status, loginTokenReturned: Boolean(returnedToken), tokenNormalized: Boolean(normalizedToken), tokenFormatValid: metadata.validFormat };
    lifecycle({ ...common, persistence: "NOT_RUN", loginPageMeDispatched: false, navigationAllowed: false, tokenClearedBy: "NONE" });
    checkpoint("LOGIN_CHECKPOINT_1", common);
    if (!response.ok || !returnedToken) throw new Error(payload.error?.message || payload.error || "Unable to continue");
    if (!metadata.validFormat || metadata.expiryState === "expired") throw new Error(metadata.expiryState === "expired" ? "The issued session has expired" : "The issued session format is invalid");

    const persisted = await runtime.persistCanonicalAuthState({ token: normalizedToken, user: payload.user }, { reason: "run-club-auth:persist" });
    const readBack = runtime.getStoredToken();
    const readBackMatches = Boolean(persisted.ok && readBack === normalizedToken);
    const persistence = readBackMatches ? "PASS" : "FAIL";
    lifecycle({ persistence, tokenPersisted: Boolean(persisted.ok), persistenceReadBack: persistence, persistedTokenLength: readBack?.length || 0 });
    checkpoint("LOGIN_CHECKPOINT_2", { tokenPersisted: Boolean(persisted.ok), persistenceReadBack: persistence, persistedTokenLength: readBack?.length || 0 });
    if (!readBackMatches) throw new Error("Authentication could not be restored on this device: storage verification failed");

    const validation = await runtime.refreshAuthStatus({ token: normalizedToken, reason: "run-club-auth:login-page-validation" });
    const diagnostics = validation.diagnostics || validation.error?.authDiagnostics || runtime.ensureDebugState().lastMeDiagnostics || {};
    const status = diagnostics.status ?? null;
    const identityResolved = Boolean(validation.ok && validation.user?.id);
    lifecycle({ loginPageMeDispatched: diagnostics.dispatched === true, loginPageMeStatus: status, loginPageAuthorizationAttached: true, loginPageBearerPrefixCorrect: true, loginPageTokenFormatValid: metadata.validFormat, identityResolved, beforeNavigationTokenPresent: Boolean(runtime.getStoredToken()), navigationAllowed: identityResolved && status === 200 });
    checkpoint("LOGIN_CHECKPOINT_3", { httpStatus: status, requestDispatched: diagnostics.dispatched === true, authorizationHeaderAttached: true, bearerPrefixCorrect: true, tokenFormatValid: metadata.validFormat, identityResolved });
    if (!identityResolved || status !== 200) throw new Error(status === 401 ? "The issued session was rejected. Please sign in again." : "Your session could not be verified. Please try again.");
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
