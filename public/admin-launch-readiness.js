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
    expectedCount: 20, render: "FAILED", failureStage: "AUTH", lastError: "None"
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const effective = card => card.status === "DONE" && card.humanRequired && !card.humanVerified ? "HUMAN_TEST_REQUIRED" : card.status;

  function renderProof() {
    const surface = document.querySelector("#bootstrap-status");
    if (!surface) return;
    surface.innerHTML = `<details open><summary>Avatar Development Board status</summary><dl class="bootstrap-grid">
      <dt>Auth runtime</dt><dd>${esc(proof.authRuntime)}</dd><dt>Session restored</dt><dd>${esc(proof.sessionRestored)}</dd>
      <dt>Authenticated</dt><dd>${esc(proof.authenticated)}</dd><dt>Role</dt><dd>${esc(proof.role)}</dd>
      <dt>Token present</dt><dd>${esc(proof.tokenPresent)}</dd><dt>Readiness request</dt><dd>${esc(proof.request)}</dd>
      <dt>HTTP status</dt><dd>${esc(proof.httpStatus)}</dd><dt>Readiness payload</dt><dd>${esc(proof.payload)}</dd>
      <dt>Avatar board received</dt><dd>${esc(proof.avatarReceived)}</dd><dt>Avatar card count</dt><dd>${esc(proof.avatarCount)}</dd>
      <dt>Expected avatar card count</dt><dd>${proof.expectedCount}</dd><dt>Render</dt><dd>${esc(proof.render)}</dd>
      <dt>Failure stage</dt><dd>${esc(proof.failureStage)}</dd><dt>Last error</dt><dd>${esc(proof.lastError)}</dd>
    </dl></details>`;
  }
  function fail(message, stage, options = {}) {
    const error = new Error(message);
    Object.assign(error, { stage, ...options });
    throw error;
  }
  function validatePayload(data) {
    if (!data || !data.boards || !data.boards.avatar || !Array.isArray(data.boards.avatar) || !data.summaries || !data.summaries.avatar) {
      fail("The readiness service responded, but the avatar board data is incomplete.", "RESPONSE_SHAPE");
    }
    proof.avatarReceived = "YES";
    proof.avatarCount = data.boards.avatar.length;
    const counts = data.boards.avatar.reduce((result, card) => { result[card.category] = (result[card.category] || 0) + 1; return result; }, {});
    const groupsValid = Object.entries(expectedAvatarGroups).every(([group, count]) => counts[group] === count);
    if (data.boards.avatar.length !== proof.expectedCount || !groupsValid) {
      fail(`Avatar Development Board expected 20 canonical workstreams but received ${data.boards.avatar.length}.`, "RESPONSE_SHAPE");
    }
    proof.payload = "VALID";
    renderProof();
    return data;
  }
  async function request(url, token, options = {}) {
    if (!token) fail("Your restored session does not contain an authentication token. Sign in again.", "AUTH", { authState: "missing-token" });
    proof.request = "SENT";
    renderProof();
    let response;
    try {
      response = await global.fetch(url, { ...options, credentials: "same-origin", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers } });
    } catch (_) {
      fail("The Avatar Development Board could not be loaded from the readiness service.", "API");
    }
    proof.httpStatus = response.status;
    if (!response.ok) {
      const messages = {
        401: "Your Pocket PT session is no longer authorized. Sign in again.",
        403: "Your account is signed in but does not have Avatar Development Board permission."
      };
      fail(messages[response.status] || "The Avatar Development Board could not be loaded from the readiness service.", response.status === 401 ? "AUTH" : response.status === 403 ? "AUTHORIZATION" : "API", { status: response.status });
    }
    proof.request = "SUCCESS";
    let payload;
    try { payload = await response.json(); } catch (_) { fail("The readiness service responded, but the avatar board data is incomplete.", "RESPONSE_SHAPE"); }
    return validatePayload(payload.data);
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
  async function load() {
    const surface = document.querySelector("#board");
    surface.innerHTML = '<p role="status">Restoring your Pocket PT session…</p>';
    proof.authRuntime = global.AuthStateRuntime?.whenReady && global.AuthStateRuntime?.getCanonicalAuthState ? "READY" : "FAILED";
    renderProof();
    if (proof.authRuntime !== "READY" || !global.AuthNavigation?.requireUser) fail("Pocket PT authentication is unavailable. Retry this page.", "AUTH");
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
    state = await request("/api/admin/launch-readiness", auth.token);
    try { render(); } catch (_) { fail("The board data loaded, but the Kanban view could not be rendered.", "RENDER"); }
    proof.render = "COMPLETE";
    proof.failureStage = "NONE";
    proof.lastError = "None";
    renderProof();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-retry]")) { load().catch(showFailure); return; }
    const tab = event.target.closest("[data-board]");
    if (tab) { board = tab.dataset.board; document.querySelectorAll("[data-board]").forEach(item => item.classList.toggle("active", item === tab)); try { render(); } catch (error) { showFailure(Object.assign(error, { stage: "RENDER" })); } }
    const id = event.target.closest("[data-edit]")?.dataset.edit;
    if (id) { const card = state.boards[board].find(item => item.id === id), form = document.querySelector("#editor form"); form.board.value = board; form.id.value = id; form.status.innerHTML = statuses.map(status => `<option ${status === card.status ? "selected" : ""}>${status}</option>`).join(""); form.status.disabled = Boolean(card.canonical); for (const key of ["automated", "evidence", "blocker", "implementationRef"]) form[key].value = card[key] || ""; for (const key of ["codeComplete", "humanRequired", "humanVerified"]) form[key].checked = Boolean(card[key]); document.querySelector("#editor").showModal(); }
  });
  document.querySelector("#editor").addEventListener("close", async event => {
    if (event.target.returnValue !== "save") return;
    const form = event.target.querySelector("form"), auth = global.AuthStateRuntime.getCanonicalAuthState();
    const payload = { status: form.status.value, automated: form.automated.value, evidence: form.evidence.value, blocker: form.blocker.value, implementationRef: form.implementationRef.value, humanVerified: form.humanVerified.checked };
    try { await request(`/api/admin/launch-readiness/${form.board.value}/${form.id.value}`, auth?.token, { method: "PATCH", body: JSON.stringify(payload) }); await load(); } catch (error) { showFailure(error); }
  });
  load().catch(showFailure);
})(typeof window !== "undefined" ? window : globalThis);
