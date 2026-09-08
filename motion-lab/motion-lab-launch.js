(function () {
  "use strict";
  const PRODUCTION_FRONTEND_ORIGIN = "https://mufasafitsite.onrender.com";
  const BUILD = "2026-09-08-desktop-origin-v3";
  const status = document.getElementById("status");
  const configuredOrigins = Array.isArray(window.PocketPTMotionLabLaunchConfig?.allowedOrigins)
    ? window.PocketPTMotionLabLaunchConfig.allowedOrigins.filter((value) => typeof value === "string" && value)
    : [];
  const ALLOWED_OPENER_ORIGINS = new Set([
    PRODUCTION_FRONTEND_ORIGIN,
    window.location.origin,
    ...configuredOrigins
  ]);
  let accepted = false;
  let openerOrigin = null;
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

  function postToOpener(payload) {
    if (!window.opener) return;
    if (openerOrigin) {
      window.opener.postMessage(payload, openerOrigin);
      return;
    }
    for (const origin of ALLOWED_OPENER_ORIGINS) {
      try { window.opener.postMessage(payload, origin); } catch (_) {}
    }
  }

  function report(state) {
    status.textContent = `${state}\nhandoff build: ${BUILD}\nallowed opener origins: ${Array.from(ALLOWED_OPENER_ORIGINS).join(", ")}`;
    console.log(`[motion-lab-handoff] ${state}`);
    postToOpener({ type: "pocketpt:motion-lab-diagnostic", state, build: BUILD });
  }

  function fail(code) {
    const safeCode = safeFailures.has(code) ? code : "failure_unknown";
    console.error(`[motion-lab-handoff] FAILED: ${safeCode}`);
    report(safeCode);
    postToOpener({ type: "pocketpt:motion-lab-error", code: safeCode, build: BUILD });
  }

  report("handoff_document_loaded");

  window.addEventListener("message", async (event) => {
    if (accepted || event.source !== window.opener || event.data?.type !== "pocketpt:motion-lab-auth") return;

    report("handoff_message_received");

    if (!ALLOWED_OPENER_ORIGINS.has(event.origin)) return fail("failure_message_origin_invalid");
    openerOrigin = event.origin;
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
      const readinessStatus = readiness.status;
      const readinessBody = await readiness.json().catch(() => ({}));
      console.error("[motion-lab-handoff] Readiness check failed:", {
        httpStatus: readinessStatus,
        responseCode: readinessBody?.error?.code,
        responseMessage: readinessBody?.error?.message
      });

      if (readinessStatus === 401) {
        const serverCode = readinessBody?.error?.code;
        if (safeFailures.has(serverCode)) return fail(serverCode);
        return fail("failure_readiness_401");
      }
      if (readinessStatus >= 400 && readinessStatus < 500) return fail("failure_readiness_4xx");
      if (readinessStatus >= 500) return fail("failure_readiness_5xx");
      return fail("failure_readiness_other");
    }

    report("readiness_check_pass");
    report("navigation_started");
    postToOpener({ type: "pocketpt:motion-lab-launched", build: BUILD });
    window.location.replace(body.data.navigateTo);
  });

  if (!window.opener) return fail("failure_opener_missing");

  function announceReady() {
    readyAttempts += 1;
    postToOpener({ type: "pocketpt:motion-lab-ready", build: BUILD });
    if (readyAttempts >= 20 && readyTimer) window.clearInterval(readyTimer);
  }
  announceReady();
  readyTimer = window.setInterval(announceReady, 250);
}());
