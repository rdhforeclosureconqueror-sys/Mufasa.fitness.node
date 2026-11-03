"use strict";
(async function () {
  const button = document.getElementById("billing-acceptance-run");
  const status = document.getElementById("billing-acceptance-status");
  const output = document.getElementById("billing-acceptance-report");
  if (!button || !status || !output) return;
  try {
    const auth = await window.AuthNavigation.requireUser({ returnTo: location.pathname + location.search });
    const state = window.AuthStateRuntime?.getCanonicalAuthState?.();
    const roles = state?.user?.roles || [];
    const role = state?.user?.role;
    if (!auth?.ok || !window.AuthStateRuntime?.getAuthToken?.() ||
      (!roles.includes("admin") && !roles.includes("super_admin") && role !== "admin" && role !== "super_admin")) {
      status.textContent = "Admin sign-in required.";
      return;
    }
    button.disabled = false;
    status.textContent = "Ready for read-only billing preflight.";
  } catch (error) {
    status.textContent = "Authentication unavailable: " + error.message;
    return;
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    output.hidden = true;
    status.textContent = "Checking billing endpoints…";
    const checks = [];
    async function probe(id, path, expected) {
      try {
        const response = await fetch(path, { method: "GET", credentials: "same-origin", cache: "no-store" });
        const passed = expected.includes(response.status);
        checks.push({ id, status: passed ? "PASS" : "FAIL", httpStatus: response.status, expected });
      } catch (error) {
        checks.push({ id, status: "FAIL", error: String(error.message || error) });
      }
    }
    await probe("billing-plan-public", "/api/billing/plan", [200]);
    await probe("membership-requires-auth", "/api/me/membership", [401]);
    await probe("billing-checkout-get-not-allowed", "/api/billing/checkout-session", [404, 405]);
    const firstFailure = checks.find(check => check.status === "FAIL") || null;
    const report = {
      type: "billing_read_only_preflight",
      timestamp: new Date().toISOString(),
      url: location.origin,
      passed: !firstFailure,
      firstFailure: firstFailure?.id || null,
      checks,
      limitations: [
        "No trial was accepted or expired in this check",
        "No Stripe Checkout Session was created",
        "No webhook delivery or paid conversion was verified",
        "Report is displayed locally; no server-side persistence is claimed"
      ]
    };
    output.textContent = JSON.stringify(report, null, 2);
    output.hidden = false;
    status.textContent = (report.passed ? "PASS" : "FAIL") + " · " + checks.filter(c => c.status === "PASS").length + "/" + checks.length + " · " + (report.firstFailure ? "First failure: " + report.firstFailure : "No failures");
    window.dispatchEvent(new CustomEvent("milele-acceptance-result", {
      detail: { type: "billing", passed: report.passed, count: checks.filter(c => c.status === "PASS").length, total: checks.length, firstFailure: report.firstFailure }
    }));
    button.disabled = false;
  });
})();
