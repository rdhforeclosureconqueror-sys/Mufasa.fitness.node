"use strict";

(function () {
  function feedback(result) {
    const status = result.completed ? "Check-in complete." : "Ready for today's check-in.";
    const days = result.streak === 1 ? "day" : "days";
    return status + " Current streak: " + result.streak + " " + days +
      ". Next milestone: " + result.nextMilestone + " days.";
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { feedback };
    return;
  }

  const member = document.querySelector("[data-daily-check-in]");
  const diagnostic = document.querySelector("[data-daily-check-in-diagnostic]");
  const panel = member || diagnostic;
  if (!panel) return;
  const button = panel.querySelector("button");
  const status = panel.querySelector("[role=status]");
  const route = member ? "/api/me/daily-check-in" : "/api/admin/diagnostics/daily-check-in/run";

  async function request(method) {
    const result = await window.MaatApiClient.request(route, { method });
    if (!result.ok) throw new Error(result.payload?.error?.message || "Check-in request failed.");
    return result.payload.data;
  }

  function render(data) {
    status.textContent = member ? feedback(data) : data.passed
      ? "PASS. " + data.message
      : "FAIL at " + data.step + ". " + data.message;
    button.disabled = member ? data.completed : false;
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      render(await request("POST"));
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  });

  window.AuthStateRuntime.whenReady().then(async () => {
    if (member) render(await request("GET"));
    else button.disabled = false;
  }).catch((error) => {
    status.textContent = error.message;
  });
})();
