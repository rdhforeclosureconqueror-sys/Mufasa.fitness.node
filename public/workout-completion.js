(function (factory) {
  "use strict";
  const api = factory(typeof window === "undefined" ? null : window);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.MufasaWorkoutCompletion = api;
})(function (browser) {
  "use strict";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const valueOrUnavailable = (value, suffix = "") => value == null ? "Not recorded" : `${number(value).toLocaleString()}${suffix}`;

  function createViewModel(detail) {
    const tracking = detail?.tracking || {};
    const projection = detail?.projectionRefresh?.data || null;
    const previous = detail?.projectionRefresh?.previous || null;
    const dashboard = detail?.dashboard || {};
    const level = projection?.level || null;
    const celebrations = detail?.projectionRefresh?.celebrations || [];
    const achievements = celebrations.filter((item) => item.type === "achievement").map((item) => item.item);
    const badges = celebrations.filter((item) => item.type === "badge").map((item) => item.item);
    const xpEarned = previous && level ? Math.max(0, number(level.lifetimeXp) - number(previous.level?.lifetimeXp)) : null;
    const streak = dashboard.streak?.currentStreak ?? null;
    const weekly = dashboard.streak?.weeklyWorkoutsCompleted ?? null;
    const insights = [];
    if (weekly != null) insights.push(`You completed ${number(weekly).toLocaleString()} workout${number(weekly) === 1 ? "" : "s"} this week.`);
    if (level?.xpToNextLevel != null) insights.push(level.xpToNextLevel ? `You're ${number(level.xpToNextLevel).toLocaleString()} XP from Level ${number(level.current) + 1}.` : "You reached the highest configured level.");
    if (streak != null) insights.push(streak ? `Your ${number(streak)}-day consistency streak continues.` : "Your next completed workout can begin a consistency streak.");
    return {
      workout: { name: tracking.workoutName || tracking.workoutId || "Completed workout", duration: tracking.sessionDurationMinutes, calories: tracking.calories ?? null,
        exercises: Array.isArray(tracking.exercisesCompleted) ? tracking.exercisesCompleted.length : 0, sets: tracking.sets, reps: tracking.reps,
        volume: tracking.volume ?? null, effort: tracking.estimatedEffort ?? tracking.formScore ?? null, completedAt: tracking.completedAt || null },
      progression: { xpEarned, lifetimeXp: level?.lifetimeXp ?? null, currentLevel: level?.current ?? null, xpIntoLevel: level?.xpIntoLevel ?? null,
        levelSpanXp: level?.levelSpanXp ?? null, remainingXp: level?.xpToNextLevel ?? null, levelChanged: previous && level ? number(level.current) > number(previous.level?.current) : false, streak },
      achievements, badges, insights,
      recommendation: detail?.tracked?.rewardSummary?.nextScheduledWorkout || dashboard.generatedWorkoutProgression?.nextRecommendedAction || null,
      records: [], projectionAvailable: Boolean(projection)
    };
  }

  function rewardCard(item, type) {
    return `<article class="completion-reward"><span class="completion-reward__icon" aria-hidden="true">${escapeHtml(String(item?.name || type).charAt(0).toUpperCase() || "✦")}</span><div><p>${escapeHtml(type)}</p><h3>${escapeHtml(item?.name || `New ${type}`)}</h3>${item?.description ? `<span>${escapeHtml(item.description)}</span>` : ""}</div></article>`;
  }
  function stat(label, value) { return `<div class="completion-stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`; }

  function render(root, model) {
    const p = model.progression;
    const percent = p.levelSpanXp ? Math.min(100, Math.round(number(p.xpIntoLevel) / number(p.levelSpanXp) * 100)) : 100;
    const rewards = [...model.achievements.map((item) => rewardCard(item, "Achievement")), ...model.badges.map((item) => rewardCard(item, "Badge"))];
    root.innerHTML = `<div class="completion-shell" role="region" aria-labelledby="completionTitle">
      <header class="completion-hero"><p class="completion-eyebrow">Session complete</p><h1 id="completionTitle">${escapeHtml(model.workout.name)}</h1><p>${model.workout.completedAt ? `Completed ${escapeHtml(new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(model.workout.completedAt)))}` : "Workout saved"}</p><button type="button" class="completion-close" data-completion-close aria-label="Close workout summary">Continue</button></header>
      <section aria-labelledby="sessionStatsTitle"><h2 id="sessionStatsTitle">What you accomplished</h2><dl class="completion-stats">${stat("Duration", valueOrUnavailable(model.workout.duration, " min"))}${stat("Calories", valueOrUnavailable(model.workout.calories))}${stat("Exercises", String(model.workout.exercises))}${stat("Sets", valueOrUnavailable(model.workout.sets))}${stat("Reps", valueOrUnavailable(model.workout.reps))}${stat("Volume", valueOrUnavailable(model.workout.volume))}${stat("Estimated effort", valueOrUnavailable(model.workout.effort))}${stat("Completion time", model.workout.completedAt ? new Date(model.workout.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not recorded")}</dl></section>
      <section class="completion-progress" aria-labelledby="progressTitle"><div><p class="completion-eyebrow">Authoritative progress</p><h2 id="progressTitle">${p.xpEarned == null ? "Progress synced" : `+${number(p.xpEarned).toLocaleString()} XP earned`}</h2><p>${p.currentLevel == null ? "Progress projection unavailable." : `${number(p.lifetimeXp).toLocaleString()} lifetime XP · Level ${number(p.currentLevel)}${p.levelChanged ? " · Level up" : ""}`}</p></div>${p.currentLevel == null ? "" : `<div class="completion-level">${number(p.currentLevel)}</div><div class="completion-track" role="progressbar" aria-label="Progress toward next level" aria-valuemin="0" aria-valuemax="${number(p.levelSpanXp)}" aria-valuenow="${number(p.xpIntoLevel)}" aria-valuetext="${number(p.remainingXp)} XP remaining"><i style="--completion-progress:${percent}%"></i></div>`}</section>
      <section aria-labelledby="rewardsTitle"><h2 id="rewardsTitle">Rewards from this workout</h2><div class="completion-rewards">${rewards.length ? rewards.join("") : '<div class="completion-empty"><strong>No new rewards this session</strong><span>Your saved progress still counts toward future achievements.</span></div>'}</div></section>
      <div class="completion-columns"><section aria-labelledby="insightsTitle"><h2 id="insightsTitle">Session insights</h2>${model.insights.length ? `<ul>${model.insights.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>` : '<p class="completion-muted">No authoritative insights are available yet.</p>'}</section><section aria-labelledby="recordsTitle"><h2 id="recordsTitle">Personal records</h2><div class="completion-empty"><strong>Records ready</strong><span>No authoritative personal record was reported for this workout.</span></div></section></div>
      <section class="completion-next" aria-labelledby="nextTitle"><p class="completion-eyebrow">Up next</p><h2 id="nextTitle">Next recommendation</h2><p>${escapeHtml(model.recommendation || "No recommendation is available yet. Check your plan when you're ready.")}</p></section>
      <section class="completion-share" aria-labelledby="shareTitle"><div><p class="completion-eyebrow">Ma'at Fitness</p><h2 id="shareTitle">Workout complete</h2><strong>${escapeHtml(model.workout.name)}</strong><p>${valueOrUnavailable(model.workout.duration, " min")} · ${model.workout.exercises} exercises${p.xpEarned == null ? "" : ` · +${number(p.xpEarned)} XP`}${p.currentLevel == null ? "" : ` · Level ${number(p.currentLevel)}`}</p></div><button type="button" data-completion-print>Print summary</button></section>
    </div>`;
  }

  function mount(win = browser) {
    if (!win?.document) return null;
    const root = win.document.createElement("main"); root.className = "workout-completion"; root.hidden = true; root.setAttribute("aria-live", "polite"); root.setAttribute("aria-busy", "false");
    win.document.body.appendChild(root);
    const close = () => { root.hidden = true; win.document.body.classList.remove("completion-open"); };
    const show = (detail) => { root.hidden = false; win.document.body.classList.add("completion-open"); render(root, createViewModel(detail)); root.querySelector("[data-completion-close]")?.focus(); };
    root.addEventListener("click", (event) => { if (event.target.closest("[data-completion-close]")) close(); if (event.target.closest("[data-completion-print]")) win.print(); });
    win.addEventListener("keydown", (event) => { if (!root.hidden && event.key === "Escape") close(); });
    win.addEventListener("mufasa:workout-completion", (event) => show(event.detail));
    return { show, close, root, destroy() { root.remove(); } };
  }
  if (browser?.document) browser.document.readyState === "loading" ? browser.document.addEventListener("DOMContentLoaded", () => mount(browser), { once: true }) : mount(browser);
  return Object.freeze({ createViewModel, render, mount, valueOrUnavailable });
});
