(function () {
  "use strict";
  const status = document.getElementById("memberHomeStatus");
  const content = document.getElementById("memberHomeContent");
  if (!status || !content) return;
  const text = value => String(value ?? "Not available");
  const escape = value => text(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  function card(title, value, detail) {
    return `<div class="kpi"><div class="label">${escape(title)}</div><div class="value" style="font-size:16px">${escape(value)}</div><div class="hint">${escape(detail)}</div></div>`;
  }
  function render(home) {
    const primary = home.primaryAction;
    content.innerHTML = `
      <p><strong>${escape(primary.title)}</strong></p><p class="muted">${escape(primary.explanation)}</p>
      <div class="member-home-actions"><a class="btn" href="${escape(primary.route)}">${escape(primary.title)}</a></div>
      <h3>Journey summary</h3><div class="member-home-grid">
        ${card("Journey", home.journey.status, home.journey.primaryPathway || "Choose your pathway")}
        ${card("Active program", home.activeProgram.source, home.activeProgram.title)}
        ${card("Next workout", home.inProgressSession?.status || home.nextWorkout?.status || "Not available", home.inProgressSession?.title || home.nextWorkout?.title || home.emptyStateGuidance[0])}
        ${card("Weekly progress", home.progressSummary.status, `${home.progressSummary.workoutsCompleted} workouts completed`)}
        ${card("Nutrition focus", home.nutritionMission.status, home.nutritionMission.title)}
        ${card("Assessment", home.assessmentRecommendation ? "Ready" : "Not available", home.assessmentRecommendation?.title || "No assessment is currently recommended")}
        ${card("Adaptation insight", home.trainingAdaptation.status, home.trainingAdaptation.insight)}
        ${card("Health review", home.healthReview.state, home.healthReview.message)}
      </div><nav class="member-home-actions" aria-label="Member areas">
        ${home.secondaryActions.map(item => `<a class="btn" href="${escape(item.route)}">${escape(item.title)}</a>`).join("")}
        <a class="btn" href="/workout.html#retentionFlowRoot">Journey intake</a>
        <a class="btn" href="/workout.html#ohsSummaryView">Assessment</a>
      </nav>`;
    content.hidden = false;
    status.textContent = "Your member home is ready.";
  }
  async function load() {
    try {
      const runtime = window.MufasaDashboardRuntime;
      if (!runtime?.authedRequest) throw new Error("Sign in to load your member home.");
      render(await runtime.authedRequest("/api/me/member-home"));
    } catch (error) {
      status.textContent = `${error.message || "Member home is temporarily unavailable."} Retry by refreshing this page.`;
      status.setAttribute("data-state", "retry-available");
    }
  }
  load();
})();
