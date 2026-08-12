(function initRunClubDiagnostics(window, document) {
  "use strict";

  var ENDPOINT_PATH = "/api/admin/diagnostics/run-club/run";
  var PHASES = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];
  var button = document.getElementById("runDiagnostics");
  var status = document.getElementById("status");
  var results = document.getElementById("results");

  function text(tag, value, className) {
    var node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function safeReason(error) {
    var message = error && error.message ? error.message : String(error || "Unknown browser error");
    return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 240);
  }

  function endpointUrl() {
    var origin = window.location && window.location.origin;
    if (!origin || !/^https?:\/\/[^/]+$/i.test(origin)) throw new Error("The page does not have a valid HTTP(S) origin");
    // An explicit base prevents WebKit from resolving a Request against an opaque base.
    var url = new window.URL(ENDPOINT_PATH, origin);
    if (url.origin !== origin || url.pathname !== ENDPOINT_PATH) throw new Error("Diagnostics endpoint did not resolve to the current origin");
    return url.href;
  }

  function authToken() {
    try {
      var token = window.AuthStateRuntime && window.AuthStateRuntime.getAuthToken
        ? window.AuthStateRuntime.getAuthToken()
        : window.localStorage.getItem("maatAuthToken");
      token = typeof token === "string" ? token.trim() : "";
      // Header control characters make WebKit throw its generic pattern DOMException.
      return token && !/[\u0000-\u001f\u007f]/.test(token) ? token : null;
    } catch (_) { return null; }
  }

  function clearResults() {
    while (results.firstChild) results.removeChild(results.firstChild);
  }

  function renderGroup(group) {
    var section = text("section", "");
    section.appendChild(text("h2", group.label));
    section.appendChild(text("strong", group.status, group.status));
    var list = text("ul", "");
    (group.checks || []).forEach(function (check) {
      var item = text("li", "");
      item.appendChild(text("strong", check.status + " — " + check.label, check.status));
      item.appendChild(text("div", check.reason));
      list.appendChild(item);
    });
    section.appendChild(list);
    results.appendChild(section);
  }

  function renderRequestFailure(check, endpoint, error) {
    clearResults();
    PHASES.forEach(function (label) {
      renderGroup({label: label + " — FAIL", status: "FAIL", checks: [{
        status: "FAIL", label: check,
        reason: "Function: runDiagnostics; endpoint: " + endpoint + "; reason: " + safeReason(error)
      }]});
    });
    status.textContent = "Overall: FAIL. Request phase failed at “" + check + "”.";
  }

  async function runDiagnostics() {
    button.disabled = true;
    status.textContent = "Running isolated diagnostics…";
    clearResults();
    var endpoint = ENDPOINT_PATH;
    var check = "same-origin endpoint construction";
    try {
      endpoint = endpointUrl();
      check = "Run Club diagnostics API request";
      var token = authToken();
      var options = {method: "POST", credentials: "same-origin", cache: "no-store"};
      if (token) options.headers = {authorization: "Bearer " + token};
      var response = await window.fetch(endpoint, options);
      check = "Run Club diagnostics API response";
      var payload = await response.json();
      if (!response.ok) throw new Error((payload.error && payload.error.message) || payload.message || "Request failed (" + response.status + ")");
      if (!payload.data || !Array.isArray(payload.data.phases)) throw new Error("Response did not contain diagnostic phases");
      clearResults();
      payload.data.phases.forEach(renderGroup);
      [payload.data.boundary, payload.data.continuity].filter(Boolean).forEach(renderGroup);
      status.textContent = "Overall: " + payload.data.overall + ". Isolated diagnostic data was cleaned up.";
    } catch (error) {
      renderRequestFailure(check, endpoint, error);
    } finally { button.disabled = false; }
  }

  button.addEventListener("click", runDiagnostics);
})(window, document);
