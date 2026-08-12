(function initRunClubDiagnostics(window, document) {
  "use strict";
  var ENDPOINT_PATH = "/api/admin/diagnostics/run-club/run";
  var PHASES = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];
  var button = document.getElementById("runDiagnostics");
  var status = document.getElementById("status");
  var results = document.getElementById("results");
  var authRequired = document.getElementById("authRequired");
  var diagnosticsContent = document.getElementById("diagnosticsContent");

  function text(tag, value, className) { var node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; }
  function safeReason(error) { var message = error && error.message ? error.message : String(error || "Unknown browser error"); return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 240); }
  function stagedError(stage, message, cause) { var error = new Error(message); error.stage = stage; error.cause = cause; return error; }

  function endpointUrl() {
    try {
      if (window.MaatApiClient?.resolve) return window.MaatApiClient.resolve(ENDPOINT_PATH);
      var backend = window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || "https://mufasa-fitness-node.onrender.com";
      if (!backend) throw new Error("canonical API client unavailable");
      return new window.URL(ENDPOINT_PATH, backend + "/").href;
    } catch (cause) { throw stagedError("URL construction", "The canonical backend diagnostics URL could not be constructed", cause); }
  }

  function canonicalToken() {
    var authState;
    try {
      if (!window.AuthStateRuntime || typeof window.AuthStateRuntime.getCanonicalAuthState !== "function") throw new Error("The canonical authentication runtime is unavailable");
      authState = window.AuthStateRuntime.getCanonicalAuthState();
    } catch (cause) { throw stagedError("Auth retrieval", "Canonical authentication could not be read", cause); }
    var candidate = authState && authState.token;
    if (typeof candidate !== "string" || !candidate.trim()) throw stagedError("Auth retrieval", "No authenticated admin session token is available. Sign in again before running diagnostics.");
    var token = candidate.trim();
    if (/^Bearer\s/i.test(token)) throw stagedError("Authentication header", "The stored token already contains a Bearer scheme and was rejected");
    if (/[\u0000-\u001f\u007f]/.test(token)) throw stagedError("Authentication header", "The stored token contains prohibited control characters and was rejected");
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw stagedError("Authentication header", "The stored authentication token is malformed and was rejected");
    return token;
  }

  function constructHeaders(token) {
    try { var headers = new window.Headers(); headers.set("Authorization", "Bearer " + token); return headers; }
    catch (cause) { throw stagedError("Header construction", "The authentication header could not be constructed", cause); }
  }
  function constructRequest(url, headers) {
    try { return new window.Request(url, {method: "POST", credentials: "omit", cache: "no-store", headers: headers}); }
    catch (cause) { throw stagedError("Request construction", "The diagnostics Request object could not be constructed", cause); }
  }
  function clearResults() { while (results.firstChild) results.removeChild(results.firstChild); }
  function renderGroup(group) {
    var section = text("section", ""); section.appendChild(text("h2", group.label)); section.appendChild(text("strong", group.status, group.status));
    var list = text("ul", ""); (group.checks || []).forEach(function (check) { var item = text("li", ""); item.appendChild(text("strong", check.status + " — " + check.label, check.status)); item.appendChild(text("div", check.reason)); list.appendChild(item); });
    section.appendChild(list); results.appendChild(section);
  }
  function renderRequestFailure(error, endpoint, backendReached) {
    clearResults(); var stage = error.stage || "Fetch dispatch";
    renderGroup({label: "Request/Auth — FAIL", status: "FAIL", checks: [{status: "FAIL", label: stage, reason: safeReason(error) + "; endpoint: " + endpoint}, {status: backendReached ? "PASS" : "NOT RUN", label: "Diagnostics backend execution", reason: backendReached ? "The server returned an HTTP response, but no executed phase report was available." : "Diagnostics backend was not reached."}]});
    PHASES.forEach(function (label) { renderGroup({label: label + " — NOT RUN", status: "NOT RUN", checks: [{status: "NOT RUN", label: "Backend phase check", reason: "The backend did not return an executed result for this phase."}]}); });
    status.textContent = "Overall: FAIL. " + stage + " — FAIL. " + (backendReached ? "No backend phase results were returned." : "Diagnostics backend was not reached.");
  }

  async function runDiagnostics() {
    button.disabled = true; status.textContent = "Running isolated diagnostics…"; clearResults(); var endpoint = ENDPOINT_PATH; var backendReached = false;
    try {
      endpoint = endpointUrl();
      var token = canonicalToken();
      var headers = constructHeaders(token);
      var request = constructRequest(endpoint, headers);
      var response;
      try { response = await window.fetch(request); } catch (cause) { throw stagedError("Fetch dispatch", "The browser could not dispatch the diagnostics request: " + safeReason(cause), cause); }
      backendReached = true;
      if (!response || typeof response.json !== "function") throw stagedError("HTTP response received", "The fetch completed without a valid HTTP Response");
      var payload;
      try { payload = await response.json(); } catch (cause) { throw stagedError("JSON parsing", "The diagnostics response was not valid JSON", cause); }
      if (!response.ok) throw stagedError("HTTP response received", (payload.error && payload.error.message) || payload.message || "Request failed (" + response.status + ")");
      if (!payload.data || !Array.isArray(payload.data.phases)) throw stagedError("Diagnostics backend execution", "Response did not contain executed diagnostic phases");
      clearResults(); payload.data.phases.forEach(renderGroup); [payload.data.boundary, payload.data.continuity].filter(Boolean).forEach(renderGroup);
      status.textContent = "Overall: " + payload.data.overall + ". Isolated diagnostic data was cleaned up.";
    } catch (error) { renderRequestFailure(error, endpoint, backendReached); } finally { button.disabled = false; }
  }

  async function initializeAdminAccess() {
    var runtime = window.AuthStateRuntime;
    if (runtime && typeof runtime.whenReady === "function") await runtime.whenReady();
    if (runtime && typeof runtime.renderSafeDiagnostics === "function") runtime.renderSafeDiagnostics("authContinuityStatus");
    var token = runtime && typeof runtime.getAuthToken === "function" ? runtime.getAuthToken() : null;
    if (!token || typeof runtime.refreshAuthStatus !== "function") {
      authRequired.hidden = false;
      diagnosticsContent.hidden = true;
      return false;
    }
    var refreshed = await runtime.refreshAuthStatus({reason: "run-club-diagnostics-page", visibleErrors: false});
    var user = refreshed && refreshed.user;
    var roles = user && Array.isArray(user.roles) ? user.roles : (user && user.role ? [user.role] : []);
    var allowed = refreshed && refreshed.ok === true && roles.some(function (role) { return role === "admin" || role === "super_admin"; });
    authRequired.hidden = allowed;
    diagnosticsContent.hidden = !allowed;
    button.disabled = !allowed;
    if (!allowed) status.textContent = "Admin sign-in required";
    return allowed;
  }

  window.__runClubDiagnosticsRequest = {endpointUrl: endpointUrl, canonicalToken: canonicalToken, constructHeaders: constructHeaders, constructRequest: constructRequest};
  button.addEventListener("click", runDiagnostics);
  window.__runClubDiagnosticsAccessReady = initializeAdminAccess().catch(function () {
    authRequired.hidden = false;
    diagnosticsContent.hidden = true;
    button.disabled = true;
    return false;
  });
})(window, document);
