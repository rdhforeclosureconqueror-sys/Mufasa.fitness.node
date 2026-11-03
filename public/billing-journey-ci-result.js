"use strict";
(function () {
  const button = document.getElementById("billing-journey-ci-check");
  const status = document.getElementById("billing-journey-ci-status");
  const output = document.getElementById("billing-journey-ci-report");
  if (!button || !status || !output) return;
  const workflowUrl = "https://github.com/rdhforeclosureconqueror-sys/Mufasa.fitness.node/actions/workflows/billing-regression.yml";
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Checking latest GitHub billing regression run…";
    output.hidden = true;
    try {
      const endpoint = "https://api.github.com/repos/rdhforeclosureconqueror-sys/Mufasa.fitness.node/actions/workflows/billing-regression.yml/runs?branch=main&per_page=10";
      const response = await fetch(endpoint, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (!response.ok) throw new Error("GitHub HTTP " + response.status);
      const payload = await response.json();
      const run = (payload.workflow_runs || []).find(item => item.status === "completed");
      if (!run) throw new Error("No completed main-branch billing regression run available");
      const passed = run.conclusion === "success";
      const report = {
        type: "billing_isolated_ci_result",
        passed, firstFailure: passed ? null : "billing-regression-ci",
        conclusion: run.conclusion, runId: run.id, commit: run.head_sha,
        completedAt: run.updated_at, runUrl: run.html_url || workflowUrl,
        scope: "Isolated Node regression with mock Stripe and temporary records",
        limitations: ["Displays recorded CI evidence; does not execute a new test", "Does not certify production Stripe webhook delivery", "No production customer writes or charges"]
      };
      status.textContent = (passed ? "PASS" : "FAIL") + " · GitHub billing journey CI · " + (run.conclusion || "unknown") + " · First failure: " + (report.firstFailure || "none");
      output.textContent = JSON.stringify(report, null, 2);
      output.hidden = false;
    } catch (error) {
      status.textContent = "UNVERIFIED · " + String(error.message || error) + " · Open GitHub workflow for evidence.";
      output.textContent = JSON.stringify({ firstFailure: "ci-result-load-failed", workflowUrl }, null, 2);
      output.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
})();
