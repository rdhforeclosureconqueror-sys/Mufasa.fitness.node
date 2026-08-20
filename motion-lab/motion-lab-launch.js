(function () {
  "use strict";
  const FRONTEND_ORIGIN = "https://mufasafitsite.onrender.com";
  const BUILD = "2026-08-20-ios-trace-v2";
  const status = document.getElementById("status");
  let accepted = false;
  const safeFailures = new Set(["failure_opener_missing", "failure_message_origin_invalid", "failure_auth_token_missing", "failure_session_post_network", "failure_session_post_rejected", "failure_session_response_invalid", "failure_readiness_network", "failure_session_cookie_rejected"]);
  function report(state) {
    status.textContent = `${state}\nhandoff build: ${BUILD}`;
    window.opener?.postMessage({ type: "pocketpt:motion-lab-diagnostic", state, build: BUILD }, FRONTEND_ORIGIN);
  }
  function fail(code) {
    const safeCode = safeFailures.has(code) ? code : "failure_unknown";
    report(safeCode);
    window.opener?.postMessage({ type: "pocketpt:motion-lab-error", code: safeCode }, FRONTEND_ORIGIN);
  }
  report("handoff_document_loaded");
  window.addEventListener("message", async (event) => {
    if (accepted || event.source !== window.opener || event.data?.type !== "pocketpt:motion-lab-auth") return;
    report("handoff_message_received");
    if (event.origin !== FRONTEND_ORIGIN) return fail("failure_message_origin_invalid");
    report("handoff_origin_valid");
    if (typeof event.data.token !== "string" || !event.data.token) return fail("failure_auth_token_missing");
    accepted = true;
    report("session_post_started");
    let response;
    try {
      response = await fetch("/api/dev/motion-lab/session", {
        method: "POST", headers: { Authorization: `Bearer ${event.data.token}` },
        credentials: "include", cache: "no-store"
      });
    } catch (_) { return fail("failure_session_post_network"); }
    if (!response.ok) return fail("failure_session_post_rejected");
    report("session_post_200");
    const body = await response.json().catch(() => null);
    if (body?.data?.navigateTo !== "/dev/motion-lab") return fail("failure_session_response_invalid");
    report("session_cookie_expected");
    report("readiness_check_started");
    let readiness;
    try {
      readiness = await fetch("/api/dev/motion-lab/readiness", { credentials: "include", cache: "no-store" });
    } catch (_) { return fail("failure_readiness_network"); }
    if (!readiness.ok) return fail("failure_session_cookie_rejected");
    report("readiness_check_pass");
    report("navigation_started");
    window.opener?.postMessage({ type: "pocketpt:motion-lab-launched" }, FRONTEND_ORIGIN);
    window.location.replace(body.data.navigateTo);
  });
  if (!window.opener) return fail("failure_opener_missing");
  window.opener.postMessage({ type: "pocketpt:motion-lab-ready", build: BUILD }, FRONTEND_ORIGIN);
}());
