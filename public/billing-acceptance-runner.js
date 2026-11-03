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
    async function probe(id, path, expected, method = "GET") {
      try {
        const url = window.MaatApiClient.resolve(path);
        const response = await fetch(url, { method, credentials: "omit", cache: "no-store" });
        const passed = expected.includes(response.status);
        checks.push({ id, status: passed ? "PASS" : "FAIL", httpStatus: response.status, expected, endpoint: url });
      } catch (error) {
        checks.push({ id, status: "FAIL", error: String(error.message || error), endpoint: window.MaatApiClient.resolve(path) });
      }
    }
    await probe("billing-plan-public", "/api/billing/plan", [200]);
    await probe("membership-requires-auth", "/api/me/membership", [401]);
    await probe("checkout-post-requires-auth", "/api/billing/checkout-session", [401], "POST");
    await probe("legacy-checkout-post-requires-auth", "/api/billing/create-checkout-session", [401], "POST");
    const firstFailure = checks.find(check => check.status === "FAIL") || null;
    const report = {
      type: "billing_read_only_preflight",
      timestamp: new Date().toISOString(),
      url: location.origin,
      backendOrigin: window.MaatApiClient.origin(),
      passed: !firstFailure,
      firstFailure: firstFailure?.id || null,
      checks,
      limitations: [
        "Unauthenticated POST checks send no body or payment details and must not create checkout sessions",
        "No trial was accepted or expired in this check",
        "No Stripe Checkout Session was created",
        "No webhook delivery or paid conversion was verified",
        "Server storage is attempted; see savedEvidence for the result"
      ]
    };
    // Persist only sanitized status evidence. The backend independently enforces admin permissions.
    try {
      const token = window.AuthStateRuntime?.getAuthToken?.();
      const endpoint = window.MaatApiClient.resolve("/api/admin/diagnostics/billing-preflight");
      const saved = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ type: report.type, checks: report.checks.map(({ id, status, httpStatus }) => ({ id, status, httpStatus })) })
      });
      if (!saved.ok) throw new Error("HTTP " + saved.status);
      const payload = await saved.json();
      report.savedEvidence = { id: payload?.data?.id || null, timestamp: payload?.data?.timestamp || null };
    } catch (error) {
      report.savedEvidence = { status: "NOT_SAVED", reason: String(error.message || error) };
    }
    output.textContent = JSON.stringify(report, null, 2);
    output.hidden = false;
    status.textContent = (report.passed ? "PASS" : "FAIL") + " · " + checks.filter(c => c.status === "PASS").length + "/" + checks.length + " · " + (report.firstFailure ? "First failure: " + report.firstFailure : "No failures") + (report.savedEvidence?.id ? " · Saved" : " · Not saved");
    window.dispatchEvent(new CustomEvent("milele-acceptance-result", {
      detail: { type: "billing", passed: report.passed, count: checks.filter(c => c.status === "PASS").length, total: checks.length, firstFailure: report.firstFailure }
    }));
    button.disabled = false;
  });
})();
