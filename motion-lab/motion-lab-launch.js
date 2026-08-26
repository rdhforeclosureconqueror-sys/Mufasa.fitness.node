(function () {
  "use strict";
  const FRONTEND_ORIGIN = "https://mufasafitsite.onrender.com";
  const BUILD = "2026-08-20-ios-trace-v2";
  const status = document.getElementById("status");
  let accepted = false;
  let readyAttempts = 0;
  let readyTimer = null;
  const safeFailures = new Set([
    "failure_opener_missing",
    "failure_message_origin_invalid",
    "failure_auth_token_missing",
    "failure_session_post_network",
    "failure_session_post_rejected",
    "failure_session_response_invalid",
    "failure_readiness_network",
    "failure_readiness_401",
    "failure_readiness_4xx",
    "failure_readiness_5xx",
    "failure_readiness_other",
    "cookie_missing",
    "cookie_malformed",
    "session_not_found",
    "session_expired"
  ]);

  function report(state) {
    status.textContent = `${state}\nhandoff build: ${BUILD}`;
    console.log(`[motion-lab-handoff] ${state}`);
    window.opener?.postMessage({ type: "pocketpt:motion-lab-diagnostic", state, build: BUILD }, FRONTEND_ORIGIN);
  }

  function fail(code) {
    const safeCode = safeFailures.has(code) ? code : "failure_unknown";
    console.error(`[motion-lab-handoff] FAILED: ${safeCode}`);
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
    if (readyTimer) window.clearInterval(readyTimer);
    report("session_post_started");

    let response;
    try {
      response = await fetch("/api/dev/motion-lab/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${event.data.token}` },
        credentials: "include",
        cache: "no-store"
      });
    } catch (error) {
      console.error("[motion-lab-handoff] Session POST network error:", error);
      return fail("failure_session_post_network");
    }

    if (!response.ok) {
      console.error("[motion-lab-handoff] Session POST rejected:", response.status, response.statusText);
      return fail("failure_session_post_rejected");
    }

    report("session_post_200");

    const body = await response.json().catch(() => null);
    if (!body?.data?.navigateTo || body.data.navigateTo !== "/dev/motion-lab") {
      console.error("[motion-lab-handoff] Session response invalid:", body);
      return fail("failure_session_response_invalid");
    }

    report("session_cookie_expected");

    report("readiness_check_started");

    let readiness;
    try {
      readiness = await fetch("/api/dev/motion-lab/readiness", {
        credentials: "include",
        cache: "no-store"
      });
    } catch (error) {
      console.error("[motion-lab-handoff] Readiness check network error:", error);
      return fail("failure_readiness_network");
    }

    if (!readiness.ok) {
      const status = readiness.status;
      const readinessBody = await readiness.json().catch(() => ({}));
      
      console.error("[motion-lab-handoff] Readiness check failed:", {
        httpStatus: status,
        responseCode: readinessBody?.error?.code,
        responseMessage: readinessBody?.error?.message
      });

      // Map server diagnostic codes to client failures
      if (status === 401) {
        const serverCode = readinessBody?.error?.code;
        if (safeFailures.has(serverCode)) return fail(serverCode);
        return fail("failure_readiness_401");
      } else if (status >= 400 && status < 500) {
        console.error("[motion-lab-handoff] Readiness 4xx:", status);
        return fail("failure_readiness_4xx");
      } else if (status >= 500) {
        console.error("[motion-lab-handoff] Readiness 5xx:", status);
        return fail("failure_readiness_5xx");
      } else {
        console.error("[motion-lab-handoff] Readiness other:", status);
        return fail("failure_readiness_other");
      }
    }

    report("readiness_check_pass");
    report("navigation_started");
    window.opener?.postMessage({ type: "pocketpt:motion-lab-launched" }, FRONTEND_ORIGIN);
    window.location.replace(body.data.navigateTo);
  });

  if (!window.opener) return fail("failure_opener_missing");
  // The new tab can finish loading before dashboard.js has installed its
  // message listener. Repeat this credential-free readiness signal for a
  // bounded interval; the authenticated message still requires the exact
  // opener window and configured frontend origin above.
  function announceReady() {
    readyAttempts += 1;
    window.opener?.postMessage({ type: "pocketpt:motion-lab-ready", build: BUILD }, FRONTEND_ORIGIN);
    if (readyAttempts >= 20 && readyTimer) window.clearInterval(readyTimer);
  }
  announceReady();
  readyTimer = window.setInterval(announceReady, 250);
}());
