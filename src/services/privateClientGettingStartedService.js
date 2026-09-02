"use strict";

const { ApiError } = require("../lib/apiResponse");
const VALID_PLANS = new Set(["self", "trainer"]);
const clone = value => value == null ? value : structuredClone(value);

function completedSessions(user) {
  return Object.values(user?.sessions || {}).filter(s => s?.completedAt || s?.endedAt || s?.status === "completed");
}
function journeyState(user) {
  const intake = user?.journeyIntake || user?.retention?.intake || {};
  const profile = user?.journeyProfile || user?.retention?.journeyProfile || {};
  const complete = ["submitted", "approved", "needs_review"].includes(String(intake.status || "").toLowerCase()) || Boolean(profile.submittedAt);
  return { intake, profile, complete };
}
function baselineState(user) {
  const profile = user?.transformationProfile || {};
  const checkIns = Array.isArray(profile.checkIns) ? profile.checkIns : [];
  const baseline = checkIns.find(item => item?.baseline) || null;
  const measurements = baseline?.measurements || {};
  const measurementCount = ["bicep", "chest", "waist", "hips", "thigh"].filter(key => Number.isFinite(Number(measurements[key]))).length;
  const photosComplete = Boolean(baseline?.photos?.front && baseline?.photos?.side);
  return { profile, baseline, measurementCount, measurementsComplete: measurementCount > 0, photosComplete };
}
function assessmentState(user, journey) {
  const pending = Array.isArray(journey.profile?.assessmentRequirements) ? journey.profile.assessmentRequirements : [];
  const completed = [
    ...(Array.isArray(user?.assessments) ? user.assessments : []),
    ...(Array.isArray(user?.ohsa) ? user.ohsa : [])
  ].filter(item => item?.completedAt || item?.status === "completed" || item?.ts);
  return { required: pending.length > 0, pendingCount: pending.length, completedCount: completed.length, complete: pending.length === 0 || completed.length > 0 };
}
function task(id, title, state, detail, route = null, owner = "client") {
  return { id, title, state, complete: state === "complete", detail, route, owner };
}
function buildGettingStartedModel(user) {
  const journey = journeyState(user);
  const baseline = baselineState(user);
  const assessment = assessmentState(user, journey);
  const prefs = user?.privateClientGettingStarted || {};
  const privateClient = user?.privateCoachingQuote?.quoteStatus === "requested" || Boolean(user?.privateCoachingQuote?.submittedAt);
  const accessAccepted = Boolean(user?.courtesyTrial?.acceptedAt || ["active", "trialing"].includes(String(user?.membership?.status || "").toLowerCase()));
  const returnComplete = Boolean(baseline.profile?.returnAgreement);
  const photosPlan = VALID_PLANS.has(prefs.photosPlan) ? prefs.photosPlan : null;
  const measurementsPlan = VALID_PLANS.has(prefs.measurementsPlan) ? prefs.measurementsPlan : null;
  const photoReady = baseline.photosComplete || photosPlan === "trainer";
  const measurementReady = baseline.measurementsComplete || measurementsPlan === "trainer";
  const programAssigned = Boolean(user?.program?.assignedByTrainerUserId || user?.program?.programId);
  const workouts = completedSessions(user);

  const tasks = [
    task("access", "Join PocketPT", accessAccepted ? "complete" : "pending", accessAccepted ? "Your account access is active." : "Accept your PocketPT access/trial to enter the member system.", "/trial.html"),
    task("coaching_request", "Private coaching request", privateClient ? "complete" : "pending", privateClient ? "Your private coaching request was received." : "Tell us what kind of private coaching support you want.", "/private-sessions.html"),
    task("retention_journey", "Complete your Retention Journey", journey.complete ? "complete" : "pending", journey.complete ? "Your goals, history, schedule, and preferences are on file." : "Complete the Journey so your trainer has the information needed to build safely and intentionally.", "/workout.html#retentionFlowRoot"),
    task("return_agreement", "Create your Return Agreement", returnComplete ? "complete" : "pending", returnComplete ? "Your plan for returning after setbacks is saved." : "Define how you will return when motivation, energy, or life interrupts the plan.", "/transformation-profile.html#return-agreement"),
    task("assessment", "Complete required health / movement assessment", assessment.complete ? "complete" : "pending", assessment.complete ? (assessment.required ? "Your required assessment evidence is on file." : "No additional assessment is currently required.") : `${assessment.pendingCount} assessment requirement(s) still need attention.`, "/workout.html#ohsSummaryView"),
    task("measurements", "Baseline measurements", baseline.measurementsComplete ? "complete" : measurementsPlan === "trainer" ? "scheduled" : "pending", baseline.measurementsComplete ? `${baseline.measurementCount} baseline measurement area(s) recorded.` : measurementsPlan === "trainer" ? "You chose to complete measurements in person with your trainer." : "Record your baseline measurements or choose to do them in person with your trainer.", "/transformation-profile.html#progress-check-in"),
    task("photos", "Front + side baseline photos", baseline.photosComplete ? "complete" : photosPlan === "trainer" ? "scheduled" : "pending", baseline.photosComplete ? "Your private baseline photos are saved." : photosPlan === "trainer" ? "You chose to take your baseline photos in person with your trainer." : "Upload private front and side photos, or choose to take them with your trainer.", "/transformation-profile.html#progress-check-in"),
    task("program", "Trainer prepares your program", programAssigned ? "complete" : (journey.complete && returnComplete && assessment.complete && photoReady && measurementReady) ? "trainer_action" : "blocked", programAssigned ? "Your trainer-assigned program is active." : (journey.complete && returnComplete && assessment.complete && photoReady && measurementReady) ? "You have completed your preparation. Your trainer now has what they need to prepare and assign your program." : "This unlocks after the required client preparation is complete.", programAssigned ? "/workout.html" : null, "trainer"),
    task("first_workout", "Complete your first workout", workouts.length > 0 ? "complete" : programAssigned ? "ready" : "blocked", workouts.length > 0 ? "First workout complete — your 1 Workout achievement/badge is earned through the existing reward system." : programAssigned ? "Your program is ready. Complete your first workout to earn your first workout badge." : "This unlocks when your trainer assigns your program.", programAssigned ? "/workout.html" : null)
  ];

  const next = tasks.find(item => !["complete", "scheduled"].includes(item.state)) || null;
  const clientPreparationComplete = journey.complete && returnComplete && assessment.complete && photoReady && measurementReady;
  return {
    schemaVersion: 1,
    privateClient,
    tasks,
    completedCount: tasks.filter(item => item.complete).length,
    totalCount: tasks.length,
    clientPreparationComplete,
    readyForTrainerProgramming: clientPreparationComplete && !programAssigned,
    programAssigned,
    firstWorkoutComplete: workouts.length > 0,
    preferences: { photosPlan, measurementsPlan },
    nextAction: next ? clone(next) : null,
    welcomeBackMessage: next ? `Welcome back. Your next step is: ${next.title}.` : "Welcome back. Your getting-started checklist is complete. Keep building from here."
  };
}

function createPrivateClientGettingStartedService({ userStore }) {
  function read(userId) { return buildGettingStartedModel(userStore.loadUser(userId)); }
  function savePreferences(userId, input = {}) {
    const patch = {};
    for (const key of ["photosPlan", "measurementsPlan"]) {
      if (input[key] == null || input[key] === "") continue;
      if (!VALID_PLANS.has(input[key])) throw new ApiError("GETTING_STARTED_PREFERENCE_INVALID", `${key} must be self or trainer`, 422);
      patch[key] = input[key];
    }
    userStore.updateUser(userId, user => {
      user.privateClientGettingStarted = { ...(user.privateClientGettingStarted || {}), ...patch, updatedAt: new Date().toISOString() };
      return user;
    });
    return read(userId);
  }
  return { read, savePreferences };
}

module.exports = { createPrivateClientGettingStartedService, buildGettingStartedModel };
