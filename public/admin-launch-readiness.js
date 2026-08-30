(function installReadinessBoard(global) {
  "use strict";

  const statuses = ["BACKLOG", "IN_PROGRESS", "BLOCKED", "HUMAN_TEST_REQUIRED", "DONE", "POST_LAUNCH"];
  const expectedAvatarGroups = Object.freeze({
    "RUNTIME FOUNDATION": 3,
    "POSE PIPELINE": 3,
    "LIVE MIRROR": 3,
    "MOTION RECORDING": 3,
    "FIXTURES / REGISTRY": 4,
    "ACCEPTANCE": 4
  });
  let state;
  let board = document.body.dataset.defaultBoard || "launch";
  const proof = {
    authRuntime: "FAILED", sessionRestored: "NO", authenticated: "NO", role: "unknown", tokenPresent: "NO",
    request: "NOT STARTED", httpStatus: "—", payload: "INVALID", avatarReceived: "NO", avatarCount: 0,
    expectedCount: 20, requestRoute: "/api/admin/launch-readiness", resolvedOrigin: "UNKNOWN", resolvedUrl: "UNKNOWN",
    frontendOrigin: global.location?.origin || "UNKNOWN", crossOrigin: "UNKNOWN", backendReached: "UNKNOWN",
    render: "FAILED", failureStage: "AUTH", lastError: "None"
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const effective = card => card.status === "DONE" && card.humanRequired && !card.humanVerified ? "HUMAN_TEST_REQUIRED" : card.status;

  function renderProof() {
    const surface = document.querySelector("#bootstrap-status");
    if (!surface) return;
    const authProof = global.AuthStateRuntime?.getPropagationProof?.() || {};
    surface.innerHTML = `<details open><summary>Avatar Development Board status</summary><dl class="bootstrap-grid">
      <dt>Auth runtime</dt><dd>${esc(proof.authRuntime)}</dd><dt>Session restored</dt><dd>${esc(proof.sessionRestored)}</dd>
      <dt>Authenticated</dt><dd>${esc(proof.authenticated)}</dd><dt>Role</dt><dd>${esc(proof.role)}</dd>
      <dt>Token present</dt><dd>${esc(proof.tokenPresent)}</dd><dt>Readiness request</dt><dd>${esc(proof.request)}</dd>
      <dt>Readiness request route</dt><dd>${esc(proof.requestRoute)}</dd><dt>Resolved readiness origin</dt><dd>${esc(proof.resolvedOrigin)}</dd>
      <dt>Resolved readiness URL</dt><dd>${esc(proof.resolvedUrl)}</dd><dt>Frontend origin</dt><dd>${esc(proof.frontendOrigin)}</dd>
      <dt>Cross-origin request</dt><dd>${esc(proof.crossOrigin)}</dd><dt>Readiness backend reached</dt><dd>${esc(proof.backendReached)}</dd>
      <dt>Readiness HTTP status</dt><dd>${esc(proof.httpStatus)}</dd><dt>Readiness payload</dt><dd>${esc(proof.payload)}</dd>
      <dt>Avatar board received</dt><dd>${esc(proof.avatarReceived)}</dd><dt>Avatar card count</dt><dd>${esc(proof.avatarCount)}</dd>
      <dt>Expected avatar card count</dt><dd>${proof.expectedCount}</dd><dt>Render</dt><dd>${esc(proof.render)}</dd>
      <dt>Failure stage</dt><dd>${esc(proof.failureStage)}</dd><dt>Last error</dt><dd>${esc(proof.lastError)}</dd>
    </dl></details><details open><summary>Auth propagation proof</summary><dl class="bootstrap-grid">
      <dt>Auth runtime loaded</dt><dd>${authProof.authRuntimeLoaded ? "YES" : "NO"}</dd><dt>Auth bundle</dt><dd>${esc(authProof.bundle || "unknown")}</dd>
      <dt>Storage inspection completed</dt><dd>${authProof.storageInspectionCompleted ? "YES" : "NO"}</dd><dt>Session token present</dt><dd>${authProof.sessionTokenPresent ? "YES" : "NO"}</dd>
      <dt>Persistent token present</dt><dd>${authProof.persistentTokenPresent ? "YES" : "NO"}</dd><dt>Persistence consent</dt><dd>${esc(authProof.persistenceConsent || "NONE")}</dd>
      <dt>Selected token source</dt><dd>${esc(authProof.selectedTokenSource || "none")}</dd><dt>Stored token read</dt><dd>${authProof.storedTokenRead ? "YES" : "NO"}</dd>
      <dt>Stored token format valid</dt><dd>${authProof.storedTokenFormatValid ? "YES" : "NO"}</dd><dt>Stored token expiry</dt><dd>${esc(authProof.storedTokenExpiry || "UNKNOWN")}</dd>
      <dt>Restore entered</dt><dd>${authProof.restoreEntered ? "YES" : "NO"}</dd><dt>Restore attempt count</dt><dd>${esc(authProof.restoreAttemptCount ?? 0)}</dd>
      <dt>Restore validation request attempted</dt><dd>${authProof.validationRequestAttempted ? "YES" : "NO"}</dd><dt>Restore validation route</dt><dd>${esc(authProof.validationRoute || "NONE")}</dd>
      <dt>Restore validation HTTP status</dt><dd>${esc(authProof.validationHttpStatus ?? "NONE")}</dd><dt>Restore validation response received</dt><dd>${authProof.validationResponseReceived ? "YES" : "NO"}</dd>
      <dt>Canonical APP_AUTH populated</dt><dd>${authProof.canonicalAppAuthPopulated ? "YES" : "NO"}</dd><dt>Canonical user populated</dt><dd>${authProof.canonicalUserPopulated ? "YES" : "NO"}</dd>
      <dt>Canonical token populated</dt><dd>${authProof.canonicalTokenPopulated ? "YES" : "NO"}</dd><dt>auth:changed fired</dt><dd>${authProof.authChangedFired ? "YES" : "NO"}</dd>
      <dt>auth:ready fired</dt><dd>${authProof.authReadyFired ? "YES" : "NO"}</dd><dt>whenReady resolved</dt><dd>${authProof.whenReadyResolved ? "YES" : "NO"}</dd>
      <dt>whenReady reason</dt><dd>${esc(authProof.whenReadyReason || "unknown")}</dd><dt>First failing boundary</dt><dd>${esc(authProof.firstFailingBoundary || "UNKNOWN")}</dd>
      <dt>Last safe error</dt><dd>${esc(authProof.lastSafeError || "None")}</dd>
    </dl></details>`;
  }
  function fail(message, stage, options = {}) {
    const error = new Error(message);
    Object.assign(error, { stage, ...options });
    throw error;
  }
  function validatePayload(data) {
    if (!data || !data.boards || !Array.isArray(data.boards.launch) || !Array.isArray(data.boards.avatar) || !data.summaries || !data.summaries.launch || !data.summaries.avatar) {
      fail("The readiness service responded, but the avatar board data is incomplete.", "RESPONSE_SHAPE");
    }
    proof.avatarReceived = "YES";
    const canonicalCards = data.boards.avatar.filter(card => card.canonical !== false);
    proof.avatarCount = canonicalCards.length;
    const counts = canonicalCards.reduce((result, card) => { result[card.category] = (result[card.category] || 0) + 1; return result; }, {});
    const groupsValid = Object.entries(expectedAvatarGroups).every(([group, count]) => counts[group] === count);
    if (canonicalCards.length !== proof.expectedCount || !groupsValid) {
      fail(`Avatar Development Board expected 20 canonical workstreams but received ${canonicalCards.length}.`, "RESPONSE_SHAPE");
    }
    proof.payload = "VALID";
    renderProof();
    return data;
  }
  function applyRequestDiagnostics(path, diagnostics = {}) {
    proof.requestRoute = path;
    proof.resolvedOrigin = diagnostics.apiOrigin || global.MaatApiClient?.origin?.() || "UNKNOWN";
    const resolved = diagnostics.url || global.MaatApiClient?.resolve?.(path);
    proof.resolvedUrl = resolved ? (() => { const safe = new URL(resolved); safe.search = ""; safe.hash = ""; return safe.href; })() : "UNKNOWN";
    proof.frontendOrigin = global.location?.origin || "UNKNOWN";
    proof.crossOrigin = typeof diagnostics.crossOrigin === "boolean" ? (diagnostics.crossOrigin ? "YES" : "NO") : "UNKNOWN";
    proof.backendReached = diagnostics.backendReached === true ? "YES" : diagnostics.backendReached === false ? "NO" : "UNKNOWN";
    proof.httpStatus = diagnostics.status ?? "—";
  }
  async function request(path, options = {}) {
    if (!global.MaatApiClient?.request) fail("The canonical readiness API client is unavailable. Retry this page.", "API");
    proof.request = "SENT";
    applyRequestDiagnostics(path);
    renderProof();
    const result = await global.MaatApiClient.request(path, options);
    applyRequestDiagnostics(path, result.diagnostics);
    if (!result.ok) {
      const status = result.diagnostics?.status;
      const messages = {
        401: "Your Pocket PT session is no longer authorized. Sign in again.",
        403: "Your account is signed in but does not have Avatar Development Board permission."
      };
      fail(messages[status] || "The Avatar Development Board could not be loaded from the readiness service.", status === 401 ? "AUTH" : status === 403 ? "AUTHORIZATION" : "API", { status });
    }
    proof.request = "SUCCESS";
    return options.validatePayload === false ? result.payload?.data : validatePayload(result.payload?.data);
  }
  function render() {
    const summary = state.summaries[board];
    document.querySelector("#summary").className = "summary";
    document.querySelector("#summary").innerHTML = [...Object.entries(summary.counts), ["REMAINING", summary.remaining]].map(([key, value]) => `<div class="metric"><strong>${value}</strong>${key.replaceAll("_", " ")}</div>`).join("");
    document.querySelector("#board").innerHTML = statuses.map(status => `<section class="column"><h2>${status.replaceAll("_", " ")}</h2><div class="cards">${state.boards[board].filter(card => effective(card) === status).map(card => `<article class="card"><span class="badge">${esc(card.category)}</span><p><strong>Canonical status:</strong> ${esc(card.canonicalStatus || "Not applicable")}</p><h3>${esc(card.title)}</h3><p>${esc(card.definitionOfDone)}</p>${card.humanRequired && !card.humanVerified ? '<p class="warning">⚠ Physical/human verification outstanding</p>' : ""}<dl><dt>Implementation</dt><dd>${esc(card.implementationState || "Not recorded")}</dd><dt>Automated</dt><dd>${esc(card.automated)}</dd><dt>Browser QA</dt><dd>${esc(card.browserQa || "Not recorded")}</dd><dt>Physical-device QA</dt><dd>${esc(card.physicalDeviceQa || "Not recorded")}</dd><dt>Accessibility</dt><dd>${esc(card.accessibility || "Not recorded")}</dd><dt>Production</dt><dd>${esc(card.productionStatus || "Not recorded")}</dd><dt>Human sign-off</dt><dd>${card.humanVerified ? "Verified" : "Outstanding"}</dd><dt>Evidence</dt><dd>${esc(card.evidence || "None recorded")}</dd><dt>Blocker / notes</dt><dd>${esc(card.blocker || "None recorded")}</dd><dt>Reference</dt><dd>${esc(card.implementationRef || "Not linked")}</dd></dl><button data-edit="${card.id}">Update evidence</button></article>`).join("")}</div></section>`).join("");
  }
  function showFailure(error) {
    proof.request = proof.request === "SENT" ? "FAILED" : proof.request;
    proof.render = "FAILED";
    proof.failureStage = error.stage || "RENDER";
    proof.lastError = error.message || "Unexpected board bootstrap failure.";
    renderProof();
    const surface = document.querySelector("#board");
    surface.dataset.authState = error.status === 403 ? "access-denied" : (error.authState || error.stage || "error").toLowerCase();
    const signIn = error.authState === "unauthenticated" || error.status === 401 || error.authState === "missing-token";
    surface.innerHTML = `<section class="failure" role="alert"><h2>Avatar Development Board unavailable</h2><p>${esc(proof.lastError)}</p>${signIn ? `<a href="${esc(global.AuthNavigation?.loginUrl(location.pathname) || "/login.html")}">Sign in</a>` : '<button type="button" data-retry>Retry</button>'}</section>`;
  }
  async function load(options = {}) {
    const surface = document.querySelector("#board");
    surface.innerHTML = '<p role="status">Restoring your Pocket PT session…</p>';
    proof.authRuntime = global.AuthStateRuntime?.whenReady && global.AuthStateRuntime?.getCanonicalAuthState ? "READY" : "FAILED";
    renderProof();
    if (proof.authRuntime !== "READY" || !global.AuthNavigation?.requireUser) fail("Pocket PT authentication is unavailable. Retry this page.", "AUTH");
    if (options.forceRestore === true) await global.AuthStateRuntime.restoreCanonicalAuthState({ force: true, reason: "readiness-board-retry" });
    const result = await global.AuthNavigation.requireUser({ redirect: false });
    proof.sessionRestored = result.retryable ? "NO" : "YES";
    if (!result.ok) {
      if (result.retryable) fail("Session verification is temporarily unavailable. Retry this page.", "AUTH", { authState: "restoring" });
      fail("Sign in to view the Avatar Development Board.", "AUTH", { authState: "unauthenticated" });
    }
    const auth = global.AuthStateRuntime.getCanonicalAuthState();
    proof.sessionRestored = "YES";
    proof.authenticated = auth?.isAuthenticated === true ? "YES" : "NO";
    proof.role = String(auth?.user?.role || auth?.user?.roles?.[0] || "unknown").slice(0, 64);
    proof.tokenPresent = auth?.token ? "YES" : "NO";
    renderProof();
    if (proof.authenticated !== "YES" || !auth?.user) fail("Sign in to view the Avatar Development Board.", "AUTH", { authState: "unauthenticated" });
    if (!auth.token) fail("Your restored session does not contain an authentication token. Sign in again.", "AUTH", { authState: "missing-token" });
    state = await request("/api/admin/launch-readiness");
    try { render(); } catch (_) { fail("The board data loaded, but the Kanban view could not be rendered.", "RENDER"); }
    proof.render = "COMPLETE";
    proof.failureStage = "NONE";
    proof.lastError = "None";
    renderProof();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-retry]")) { load({ forceRestore: true }).catch(showFailure); return; }
    const tab = event.target.closest("[data-board]");
    if (tab) { board = tab.dataset.board; document.querySelectorAll("[data-board]").forEach(item => item.classList.toggle("active", item === tab)); try { render(); } catch (error) { showFailure(Object.assign(error, { stage: "RENDER" })); } }
    const id = event.target.closest("[data-edit]")?.dataset.edit;
    if (id) { const card = state.boards[board].find(item => item.id === id), form = document.querySelector("#editor form"); form.board.value = board; form.id.value = id; form.status.innerHTML = statuses.map(status => `<option ${status === card.status ? "selected" : ""}>${status}</option>`).join(""); form.status.disabled = Boolean(card.canonical); for (const key of ["automated", "evidence", "blocker", "implementationRef"]) form[key].value = card[key] || ""; for (const key of ["codeComplete", "humanRequired", "humanVerified"]) form[key].checked = Boolean(card[key]); document.querySelector("#editor").showModal(); }
  });
  document.querySelector("#editor").addEventListener("close", async event => {
    if (event.target.returnValue !== "save") return;
    const form = event.target.querySelector("form"), auth = global.AuthStateRuntime.getCanonicalAuthState();
    const payload = { status: form.status.value, automated: form.automated.value, evidence: form.evidence.value, blocker: form.blocker.value, implementationRef: form.implementationRef.value, humanVerified: form.humanVerified.checked };
    try { await request(`/api/admin/launch-readiness/${form.board.value}/${form.id.value}`, { method: "PATCH", body: payload, validatePayload: false }); await load(); } catch (error) { showFailure(error); }
  });
  load().catch(showFailure);
})(typeof window !== "undefined" ? window : globalThis);
