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
  function queueExerciseHubGuide(){
    try { sessionStorage.setItem("pocketpt.pendingTour.v1", JSON.stringify({ id:"exercise-library", expiresAt:Date.now()+30000 })); } catch (_) {}
  }
  function render(home, privateQuote) {
    const privateClient = Boolean(privateQuote?.quote && privateQuote.quote.quoteStatus === "requested");
    const trainerProgramAssigned = home.activeProgram?.source === "Assigned program";
    const privatePending = privateClient && !trainerProgramAssigned;
    const primary = privatePending
      ? (home.journey?.complete
          ? { title:"Your trainer is building your program", explanation:"Your coaching request is in, but your trainer has not assigned your fitness program yet. You can explore the Exercise Hub and test individual movements while you wait.", route:"/exercise-library.html?source=private-client" }
          : { title:"Finish your Retention Journey", explanation:"Your trainer needs the rest of your Retention Journey before assigning your fitness program. Complete it so your goals, history, schedule, and preferences are available for programming.", route:"/workout.html#retentionFlowRoot" })
      : home.primaryAction;
    const secondary = privatePending ? home.secondaryActions.filter(item => item.type !== "view_workout_plan") : home.secondaryActions;
    const privateNotice = privatePending ? `<div class="card" style="margin:12px 0;border-color:rgba(255,211,90,.35)"><strong>Private coaching program status</strong><p class="muted">No trainer-assigned fitness program is active yet. Your trainer will assign it after reviewing your Retention Journey and coaching request.</p><div class="member-home-actions">${home.journey?.complete ? '<a class="btn" data-private-exercise-hub href="/exercise-library.html?source=private-client">Build / test a workout in Exercise Hub</a>' : '<a class="btn" href="/workout.html#retentionFlowRoot">Finish Retention Journey</a>'}</div></div>` : "";
    content.innerHTML = `
      <p><strong>${escape(primary.title)}</strong></p><p class="muted">${escape(primary.explanation)}</p>
      <div class="member-home-actions"><a class="btn" ${privatePending && home.journey?.complete ? 'data-private-exercise-hub' : ''} href="${escape(primary.route)}">${escape(primary.title)}</a></div>
      ${privateNotice}
      <h3>Journey summary</h3><div class="member-home-grid">
        ${card("Journey", home.journey.status, home.journey.primaryPathway || "Choose your pathway")}
        ${card("Active program", home.activeProgram.source, home.activeProgram.title)}
        ${card("Next workout", privatePending ? "Waiting for trainer" : (home.inProgressSession?.status || home.nextWorkout?.status || "Not available"), privatePending ? "Your trainer has not assigned your program yet." : (home.inProgressSession?.title || home.nextWorkout?.title || home.emptyStateGuidance[0]))}
        ${card("Weekly progress", home.progressSummary.status, `${home.progressSummary.workoutsCompleted} workouts completed`)}
        ${card("Nutrition focus", home.nutritionMission.status, home.nutritionMission.title)}
        ${card("Assessment", home.assessmentRecommendation ? "Ready" : "Not available", home.assessmentRecommendation?.title || "No assessment is currently recommended")}
        ${card("Adaptation insight", home.trainingAdaptation.status, home.trainingAdaptation.insight)}
        ${card("Health review", home.healthReview.state, home.healthReview.message)}
      </div><nav class="member-home-actions" aria-label="Member areas">
        ${secondary.map(item => `<a class="btn" href="${escape(item.route)}">${escape(item.title)}</a>`).join("")}
        <a class="btn" href="/workout.html#retentionFlowRoot">Journey intake</a>
        <a class="btn" href="/workout.html#ohsSummaryView">Assessment</a>
      </nav>`;
    content.hidden = false;
    status.textContent = "Your member home is ready.";
    content.querySelectorAll("[data-private-exercise-hub]").forEach(link => link.addEventListener("click", queueExerciseHubGuide));
  }
  async function load() {
    try {
      const runtime = window.MufasaDashboardRuntime;
      if (!runtime?.authedRequest) throw new Error("Sign in to load your member home.");
      const [home, quoteResponse] = await Promise.all([
        runtime.authedRequest("/api/me/member-home"),
        runtime.authedRequest("/api/me/private-coaching/quote").catch(() => ({ quote:null }))
      ]);
      render(home, quoteResponse);
    } catch (error) {
      status.textContent = `${error.message || "Member home is temporarily unavailable."} Retry by refreshing this page.`;
      status.setAttribute("data-state", "retry-available");
    }
  }
  load();
})();
