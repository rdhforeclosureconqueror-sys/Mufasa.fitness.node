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
  let activeLane;
  let detailOrigin;
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

  function healthy() { return proof.authRuntime === "READY" && proof.authenticated === "YES" && proof.backendReached === "YES" && Number(proof.httpStatus) === 200 && proof.payload === "VALID" && proof.render === "COMPLETE" && proof.failureStage === "NONE"; }
  function renderProof() {
    const surface = document.querySelector("#bootstrap-status"); if (!surface) return;
    const authProof = global.AuthStateRuntime?.getPropagationProof?.() || {}, ok = healthy();
    const rows = [["Auth runtime",proof.authRuntime],["Session restored",proof.sessionRestored],["Authenticated",proof.authenticated],["Role",proof.role],["Token present",proof.tokenPresent],["Readiness request",proof.request],["Readiness request route",proof.requestRoute],["Resolved readiness origin",proof.resolvedOrigin],["Resolved readiness URL",proof.resolvedUrl],["Frontend origin",proof.frontendOrigin],["Cross-origin request",proof.crossOrigin],["Readiness backend reached",proof.backendReached],["Readiness HTTP status",proof.httpStatus],["Readiness payload",proof.payload],["Avatar board received",proof.avatarReceived],["Avatar card count",proof.avatarCount],["Expected avatar card count",proof.expectedCount],["Render",proof.render],["Failure stage",proof.failureStage],["Last error",proof.lastError]];
    const authRows = [["Auth runtime loaded",authProof.authRuntimeLoaded?"YES":"NO"],["Auth bundle",authProof.bundle||"unknown"],["Storage inspection completed",authProof.storageInspectionCompleted?"YES":"NO"],["Session token present",authProof.sessionTokenPresent?"YES":"NO"],["Persistent token present",authProof.persistentTokenPresent?"YES":"NO"],["Selected token source",authProof.selectedTokenSource||"none"],["Restore entered",authProof.restoreEntered?"YES":"NO"],["Restore attempt count",authProof.restoreAttemptCount??0],["Restore validation request attempted",authProof.validationRequestAttempted?"YES":"NO"],["Restore validation route",authProof.validationRoute||"NONE"],["Restore validation HTTP status",authProof.validationHttpStatus??"NONE"],["Canonical APP_AUTH populated",authProof.canonicalAppAuthPopulated?"YES":"NO"],["auth:ready fired",authProof.authReadyFired?"YES":"NO"],["First failing boundary",authProof.firstFailingBoundary||"UNKNOWN"],["Last safe error",authProof.lastSafeError||"None"]];
    const dl = values => `<dl class="bootstrap-grid">${values.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
    surface.className=`bootstrap-status ${ok?"healthy":"attention"}`;
    surface.innerHTML=`<details ${ok?"":"open"}><summary><span>System status: ${ok?"Healthy ✓":"Attention required"}</span><span class="diagnostic-hint">${ok?"Auth OK · Backend OK · Payload valid":`${esc(proof.failureStage)} · ${esc(proof.lastError)}`} <b>Diagnostics</b></span></summary><div class="diagnostic-sections"><section><h3>Readiness proof</h3>${dl(rows)}</section><section><h3>Auth propagation proof</h3>${dl(authRows)}</section></div></details>`;
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
  const label = value => String(value || "").replaceAll("_", " ");
  const sameCard = (pointer, card) => pointer && (pointer.id === card.id || pointer === card.id);
  const splitValues = value => Array.isArray(value) ? value : String(value || "").split(/;\s*/).filter(Boolean);
  function compactCard(card, summary) {
    const status=effective(card), marker=sameCard(summary.currentCard,card)?"CURRENT":sameCard(summary.nextCard,card)?"NEXT":"";
    const note=status==="BLOCKED"?card.blocker:card.humanRequired&&!card.humanVerified?"Human verification required":card.description||card.definitionOfDone||card.evidence||"No update recorded";
    return `<article class="card priority-${esc((card.priority||"NORMAL").toLowerCase())} ${marker?`is-${marker.toLowerCase()}`:""}" tabindex="0" role="button" data-card="${esc(card.id)}" aria-label="Open ${esc(card.title)}, ${label(card.priority||"NORMAL")} priority, ${label(status)}"><div class="card-chips"><span class="priority-chip">${esc(card.priority||"NORMAL")}</span><span class="status-chip status-${status.toLowerCase()}">${status==="HUMAN_TEST_REQUIRED"?"⚠ ":""}${label(status)}</span></div><h3>${esc(card.title)}</h3><div class="card-meta"><span>${esc(card.category)}</span><span class="type-chip">${card.canonical===false?"DEVELOPMENT":"REQUIREMENT"}</span></div>${marker?`<strong class="pointer-marker marker-${marker.toLowerCase()}">${marker}</strong>`:""}<p class="card-note">${esc(String(note).slice(0,120))}</p></article>`;
  }
  function render() {
    const summary=state.summaries[board], cards=state.boards[board];
    if(!activeLane||!statuses.includes(activeLane)) activeLane=effective(summary.currentCard||{})||statuses.find(status=>cards.some(card=>effective(card)===status))||statuses[0];
    document.querySelector("#summary").className="summary";
    document.querySelector("#summary").innerHTML=`<div class="pointers">${[["CURRENT",summary.currentCard],["NEXT",summary.nextCard],["LAST COMPLETED",summary.lastCompletedCard]].map(([name,card])=>`<div><span>${name}</span><strong>${esc(card?.title||"None")}</strong>${card&&name==="CURRENT"?'<button type="button" data-jump-current>Jump to current</button>':""}</div>`).join("")}</div>`;
    document.querySelector("#board").innerHTML=`<nav class="lane-tabs" aria-label="Kanban lanes">${statuses.map(status=>{const count=cards.filter(card=>effective(card)===status).length;return `<button type="button" data-lane="${status}" class="${activeLane===status?"active":""}" aria-pressed="${activeLane===status}">${label(status)} <b>${count}</b></button>`}).join("")}</nav><div class="lanes">${statuses.map(status=>{const laneCards=cards.filter(card=>effective(card)===status);return `<section class="column" data-active="${activeLane===status}" data-column="${status}"><h2>${label(status)} <span>${laneCards.length}</span></h2><div class="cards">${laneCards.map(card=>compactCard(card,summary)).join("")||'<p class="empty">No cards</p>'}</div></section>`}).join("")}</div>`;
  }
  function disclosure(title,value){const values=splitValues(value),preview=values.slice(0,2);return `<details class="technical-list"><summary><span>${title}<small>${values.length} routes / references</small></span><b>View all</b></summary><div class="preview">${preview.map(v=>`<code>${esc(v)}</code>`).join("")}${values.length>2?`<p>+ ${values.length-2} more</p>`:""}</div><div class="all-values">${values.map(v=>`<code>${esc(v)}</code>`).join("")||"Not recorded"}</div></details>`}
  function openDetail(id,origin){const card=state.boards[board].find(item=>item.id===id);if(!card)return;detailOrigin=origin;const summary=state.summaries[board],marker=sameCard(summary.currentCard,card)?"CURRENT":sameCard(summary.nextCard,card)?"NEXT":"";const values=[["Canonical status",card.canonicalStatus||"Not applicable"],["Effective status",label(effective(card))],["Priority",card.priority||"NORMAL"],["Description",card.description||card.definitionOfDone||"Not recorded"],["Dependencies",splitValues(card.dependsOn).join("\n")||"None"],["Automated status",card.automated||"NOT_RUN"],["Browser QA",card.browserQa||"Not recorded"],["Physical-device QA",card.physicalDeviceQa||"Not recorded"],["Accessibility",card.accessibility||"Not recorded"],["Production",card.productionStatus||"Not recorded"],["Human sign-off",card.humanVerified?"Verified by authorized human":"Outstanding"],["Machine evidence",Array.isArray(card.machineEvidence)?card.machineEvidence.map(x=>x.text||JSON.stringify(x)).join("\n"):card.evidence||"None recorded"],["Human evidence",card.humanVerificationNote||"None recorded"],["Blocker / notes",[card.blocker,card.notes].filter(Boolean).join("\n")||"None recorded"],["Changed files",splitValues(card.files).join("\n")||"None recorded"],["PR / commit",[card.prNumber&&`PR #${card.prNumber}`,card.commitSha].filter(Boolean).join(" · ")||"Not linked"],["History",Array.isArray(card.history)?card.history.map(x=>`${x.timestamp||""} ${x.type||"update"}: ${x.detail||x.note||""}`).join("\n"):"None recorded"],["Timestamps",[card.createdAt&&`Created ${card.createdAt}`,card.updatedAt&&`Updated ${card.updatedAt}`,card.completedAt&&`Completed ${card.completedAt}`].filter(Boolean).join("\n")||"Not recorded"]];const dialog=document.querySelector("#card-detail");dialog.querySelector(".detail-content").innerHTML=`<header><p>${esc(card.category)} · ${card.canonical===false?"DEVELOPMENT":"REQUIREMENT"}</p><h2>${esc(card.title)}</h2>${marker?`<strong class="pointer-marker marker-${marker.toLowerCase()}">${marker}</strong>`:""}</header>${disclosure("Implementation",card.implementationState||card.implementationRef)}${disclosure("Reference",card.implementationRef)}<dl class="detail-grid">${values.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl><button type="button" data-edit="${esc(card.id)}">Update evidence</button>`;dialog.showModal()}
  function openEditor(id){const card=state.boards[board].find(item=>item.id===id),form=document.querySelector("#editor form");if(!card||!form)return;document.querySelector("#card-detail")?.close();form.board.value=board;form.id.value=id;form.status.innerHTML=statuses.map(status=>`<option ${status===card.status?"selected":""}>${status}</option>`).join("");form.status.disabled=Boolean(card.canonical);for(const key of ["automated","evidence","blocker","implementationRef"])form[key].value=card[key]||"";for(const key of ["codeComplete","humanRequired","humanVerified"])form[key].checked=Boolean(card[key]);document.querySelector("#editor").showModal()}
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
    if(event.target.closest("[data-retry]")){load({forceRestore:true}).catch(showFailure);return}
    const tab=event.target.closest("[data-board]");if(tab){board=tab.dataset.board;activeLane=null;document.querySelectorAll("[data-board]").forEach(item=>item.classList.toggle("active",item===tab));render();return}
    const lane=event.target.closest("[data-lane]");if(lane){activeLane=lane.dataset.lane;render();return}
    if(event.target.closest("[data-jump-current]")){const current=state.summaries[board].currentCard;if(current){activeLane=effective(current);render();global.requestAnimationFrame?.(()=>document.querySelector(`[data-card="${current.id}"]`)?.focus())}return}
    const edit=event.target.closest("[data-edit]");if(edit){openEditor(edit.dataset.edit);return}
    const card=event.target.closest("[data-card]");if(card)openDetail(card.dataset.card,card);
  });
  document.addEventListener("keydown",event=>{const card=event.target.closest?.("[data-card]");if(card&&(event.key==="Enter"||event.key===" ")){event.preventDefault();openDetail(card.dataset.card,card)}});
  document.querySelector("#card-detail")?.addEventListener("close",()=>detailOrigin?.focus?.());
  document.querySelector("#editor").addEventListener("close", async event => {
    if (event.target.returnValue !== "save") return;
    const form = event.target.querySelector("form"), auth = global.AuthStateRuntime.getCanonicalAuthState();
    const payload = { status: form.status.value, automated: form.automated.value, evidence: form.evidence.value, blocker: form.blocker.value, implementationRef: form.implementationRef.value, humanVerified: form.humanVerified.checked };
    try { await request(`/api/admin/launch-readiness/${form.board.value}/${form.id.value}`, { method: "PATCH", body: payload, validatePayload: false }); await load(); } catch (error) { showFailure(error); }
  });
  load().catch(showFailure);
})(typeof window !== "undefined" ? window : globalThis);
