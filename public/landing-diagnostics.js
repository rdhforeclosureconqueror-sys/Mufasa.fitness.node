(function () {
  "use strict";

  const NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const VERSION_URL = `${NODE_BASE_URL}/__version`;
  const SMOKE_URL = `${NODE_BASE_URL}/__diagnostic-smoke`;
  const REPORT_URL = `${NODE_BASE_URL}/api/admin/diagnostics/report`;

  const runBtn = document.getElementById("runSystemDiagnosticBtn");
  const probeStatusEl = document.getElementById("landingBackendProbeStatus");
  const resultEl = document.getElementById("landingDiagnosticResult");

  function getAuthToken() {
    const clientToken = window.MufasaBackendRead?.createClient?.({
      baseUrl: NODE_BASE_URL,
      storagePrefix: "maat"
    })?.getAuthToken?.();
    if (clientToken) return clientToken;
    try {
      return localStorage.getItem("maatAuthToken") || null;
    } catch {
      return null;
    }
  }

  async function probeBackend() {
    let connected = false;
    let build = "unreachable";
    let diagnosticsReachable = "no";
    try {
      const versionRes = await fetch(VERSION_URL, { cache: "no-store" });
      if (versionRes.ok) {
        connected = true;
        const versionJson = await versionRes.json();
        build = versionJson?.build || "unknown";
      } else {
        build = `http_${versionRes.status}`;
      }
    } catch {
      build = "network_error";
    }

    try {
      const smokeRes = await fetch(SMOKE_URL, { cache: "no-store" });
      if (smokeRes.ok) {
        const smokeJson = await smokeRes.json();
        diagnosticsReachable = smokeJson?.diagnostics === true ? "yes" : "no";
      } else {
        diagnosticsReachable = `http_${smokeRes.status}`;
      }
    } catch {
      diagnosticsReachable = "network_error";
    }

    probeStatusEl.textContent = [
      `Backend: ${connected ? "Connected" : "Not connected"}`,
      `Build: ${build}`,
      `Diagnostics reachable: ${diagnosticsReachable}`
    ].join(" | ");
  }

  function renderReport(report, payload) {
    const pilot = report?.pilotReadiness || {};
    const summary = report?.openAiSummary || {};
    const warnings = Array.isArray(pilot?.warnings) ? pilot.warnings : [];
    const blockers = Array.isArray(pilot?.blockers) ? pilot.blockers : [];
    const missingEvidence = Array.isArray(pilot?.missingEvidence) ? pilot.missingEvidence : [];
    const nextFix = (pilot?.recommendedFixes || [summary?.codexFixMessage || "n/a"])[0] || "n/a";
    const openAiStatus = report?.openAiSummaryStatus || "unavailable";
    const openAiKeyMissing = report?.openAiApiKeyMissing === true;
    const fallbackNextAction = "Run a live workout test, then rerun diagnostic.";
    resultEl.textContent = [
      `Backend build status: ${report?.buildVersion || "unknown"}`,
      `Diagnostics reachable: ${report?.routeCheck ? "yes" : "unknown"}`,
      `Pilot readiness status: ${pilot?.pilotStatus || "BLOCKED_UNKNOWN"}`,
      `Blockers: ${blockers.length ? blockers.join(" | ") : "none"}`,
      `Warnings: ${warnings.length ? warnings.join(" | ") : "none"}`,
      `Missing evidence: ${missingEvidence.length ? missingEvidence.map((item) => item.label || item.field || "unknown").join(" | ") : "none"}`,
      `Recommended next fix: ${nextFix}`,
      `OpenAI summary status: ${openAiStatus}`,
      `OPENAI_API_KEY missing: ${openAiKeyMissing ? "yes" : "no"}`,
      `OpenAI likely root cause: ${summary?.likelyRootCause || "n/a"}`,
      `Next action: ${fallbackNextAction}`,
      `Raw route check: pass=${report?.routeCheck?.passCount ?? "n/a"} fail=${report?.routeCheck?.failCount ?? "n/a"}`,
      `Raw runtime avatar status: ${payload?.runtime?.avatarRuntimeStatus ? "present" : "missing"}`
    ].join("\n");
  }

  async function runDiagnostic() {
    resultEl.textContent = "Running system diagnostic…";
    const collector = window.__collectDiagnosticReport;
    const payload = typeof collector === "function" ? collector() : { collectorMissing: true };
    const token = getAuthToken();
    try {
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...payload, source: "landing_manual" })
      });

      if (res.status === 401 || res.status === 403) {
        resultEl.textContent = "Diagnostic endpoint requires admin/operator permission.";
        return;
      }

      const json = await res.json();
      const report = json?.data || null;
      if (!res.ok || !report) {
        resultEl.textContent = `Diagnostic request failed (${res.status}).`;
        return;
      }
      renderReport(report, payload);
    } catch (error) {
      resultEl.textContent = `Diagnostic request failed: ${String(error?.message || error)}`;
    }
  }

  runBtn?.addEventListener("click", runDiagnostic);
  probeBackend();
})();
