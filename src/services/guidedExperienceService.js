"use strict";

const TOUR_IDS = Object.freeze(["introduction", "dashboard", "intake", "training", "challenge", "nutrition", "exercise-library", "yoga", "run-club", "progress", "avatar"]);
const PROMPT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function cleanState(value = {}) {
  const tours = {};
  for (const id of TOUR_IDS) {
    const source = value.tours?.[id] || {};
    tours[id] = { seen: Boolean(source.seen), dismissed: Boolean(source.dismissed), completedAt: source.completedAt || null };
  }
  return {
    version: 2,
    journeyGuideVersion: 1,
    proactiveDisabled: Boolean(value.proactiveDisabled),
    lastPromptKey: value.lastPromptKey || null,
    lastPromptAt: value.lastPromptAt || null,
    dismissedPromptKeys: [...new Set((value.dismissedPromptKeys || []).filter(x => typeof x === "string"))].slice(-30),
    tours
  };
}

// This is a projection only. memberHomeService remains the canonical owner/read model.
function projectJourneyState(memberHome = {}) {
  const workoutsCompleted = Number(memberHome.progressSummary?.workoutsCompleted || 0);
  const programExists = memberHome.activeProgram?.source && memberHome.activeProgram.source !== "No active program";
  return {
    authenticated: true,
    intakeComplete: Boolean(memberHome.journey?.complete),
    intakeStarted: Boolean(memberHome.journey?.started),
    goalsComplete: Boolean(memberHome.journey?.complete),
    medicalHistoryReady: !memberHome.healthReview?.required,
    healthReviewRequired: Boolean(memberHome.healthReview?.required),
    baselineReadyOrSkipped: Boolean(memberHome.journey?.complete),
    programExists: Boolean(programExists),
    firstWorkoutComplete: workoutsCompleted > 0,
    workoutsCompleted,
    nutritionUsed: Boolean(memberHome.nutritionMission?.active),
    progressAvailable: workoutsCompleted > 0,
    returningMember: workoutsCompleted > 0 || Boolean(memberHome.inProgressSession),
    nextAction: memberHome.primaryAction || null
  };
}

function determineNextGuidance(member, guide = {}, { now = Date.now(), manual = false } = {}) {
  if (!member?.authenticated) return null;
  let prompt;
  if (!member.intakeComplete) prompt = { key: "intake-incomplete", title: member.intakeStarted ? "Continue your intake" : "Start your intake", explanation: "Complete your intake so PocketPT can personalize your experience.", route: "/workout.html#retentionFlowRoot", tourId: "intake" };
  else if (member.healthReviewRequired || member.medicalHistoryReady === false) prompt = { key: "health-review", title: "Complete your readiness review", explanation: "Your readiness review needs to be completed before moving into training. Follow the instructions shown with your Intake.", route: "/workout.html#retentionFlowRoot", tourId: "intake" };
  else if (!member.programExists) prompt = { key: "program-missing", title: "Review your personalized training plan", explanation: "Your Intake is complete. Next, review or create your personalized training plan.", route: "/workout.html#generatedWorkoutPlan", tourId: "training" };
  else if (!member.firstWorkoutComplete) prompt = { key: "first-workout", title: "Walk through your first training session", explanation: "Your program is ready. Let’s walk through your first training session.", route: "/workout.html#generatedWorkoutPlan", tourId: "training" };
  else if (!member.nutritionUsed) prompt = { key: "nutrition-discovery", title: "Explore nutrition when it helps", explanation: "You’ve started training. Nutrition can help PocketPT understand more of your transformation.", route: "/nutrition.html", tourId: "nutrition", optional: true };
  else prompt = { key: `returning-${String(member.nextAction?.type || "progress").replace(/_/g, "-")}`, title: member.nextAction?.title || "Continue your training", explanation: member.nextAction?.explanation || "Review your progress and choose your next useful action.", route: member.nextAction?.route || "/dashboard.html", tourId: member.nextAction?.route?.includes("workout") ? "training" : "progress" };
  if (manual) return prompt;
  if (guide.proactiveDisabled || guide.dismissedPromptKeys?.includes(prompt.key)) return null;
  const lastAt = Date.parse(guide.lastPromptAt || "");
  if (guide.lastPromptKey === prompt.key && Number.isFinite(lastAt) && now - lastAt < PROMPT_COOLDOWN_MS) return null;
  return prompt;
}

function createGuidedExperienceService({ userStore, memberStateReader, clock = () => Date.now() }) {
  const presentation = userId => cleanState(userStore.loadUser(userId).guidedExperience);
  const get = userId => {
    const state = presentation(userId);
    const memberState = memberStateReader ? projectJourneyState(memberStateReader(userId)) : null;
    return { ...state, memberState, nextGuidance: memberState ? determineNextGuidance(memberState, state, { now: clock() }) : null };
  };
  const update = (userId, patch = {}) => {
    if (patch.tourId && !TOUR_IDS.includes(patch.tourId)) throw Object.assign(new Error("unknown_tour"), { status: 422 });
    let result;
    userStore.updateUser(userId, user => {
      const state = cleanState(user.guidedExperience);
      if (typeof patch.proactiveDisabled === "boolean") state.proactiveDisabled = patch.proactiveDisabled;
      if (patch.promptKey && patch.action === "prompt") { state.lastPromptKey = String(patch.promptKey); state.lastPromptAt = new Date(clock()).toISOString(); }
      if (patch.promptKey && patch.action === "dismiss-prompt") state.dismissedPromptKeys = [...new Set([...state.dismissedPromptKeys, String(patch.promptKey)])].slice(-30);
      if (patch.tourId) {
        const tour = state.tours[patch.tourId];
        if (patch.action === "dismiss") { tour.dismissed = true; tour.seen = true; }
        if (patch.action === "complete") { tour.seen = true; tour.dismissed = false; tour.completedAt = new Date(clock()).toISOString(); }
        if (patch.action === "replay") tour.dismissed = false;
      }
      user.guidedExperience = state; result = state; return user;
    });
    return result;
  };
  const eligible = (state, id, { manual = false } = {}) => manual || (!state.proactiveDisabled && !state.tours[id]?.completedAt && !state.tours[id]?.dismissed);
  return { get, update, eligible, TOUR_IDS };
}

module.exports = { createGuidedExperienceService, cleanState, projectJourneyState, determineNextGuidance, TOUR_IDS, PROMPT_COOLDOWN_MS };
