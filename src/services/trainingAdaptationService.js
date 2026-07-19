"use strict";

const ADAPTATIONS = Object.freeze({
  FOLLOW_ASSIGNED_PROGRAM: "FOLLOW_ASSIGNED_PROGRAM",
  COMPLETE_HEALTH_REVIEW: "COMPLETE_HEALTH_REVIEW",
  EXTEND_RECOVERY: "EXTEND_RECOVERY",
  REDUCE_PROGRESSION_RATE: "REDUCE_PROGRESSION_RATE",
  PROGRESS_EARLIER: "PROGRESS_EARLIER",
  MAINTAIN: "MAINTAIN"
});

const round = value => Math.round(value * 10) / 10;
const average = values => values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
const numeric = (items, key) => items.map(item => Number(item?.[key])).filter(Number.isFinite);
const direction = values => {
  if (values.length < 2) return "stable";
  const midpoint = Math.ceil(values.length / 2);
  const first = average(values.slice(0, midpoint));
  const last = average(values.slice(midpoint));
  return last > first + 2 ? "improving" : last < first - 2 ? "declining" : "stable";
};

function summarizeTrainingHistory(user = {}) {
  const plans = Array.isArray(user.generatedWorkoutPlans) ? user.generatedWorkoutPlans : [];
  const legacyPlan = !plans.length && user.generatedWorkoutPlan?.plan
    ? [{ ...user.generatedWorkoutPlan.plan, planVersion: Number(user.generatedWorkoutPlan.plan.version || 1) }]
    : [];
  const allPlans = plans.length ? plans : legacyPlan;
  const executions = Array.isArray(user.generatedWorkoutExecutions) ? user.generatedWorkoutExecutions : [];
  const completedExecutions = executions.filter(item => item?.status === "completed");
  const prescribedSessions = allPlans.reduce((sum, plan) => sum + (Array.isArray(plan.sessions) ? plan.sessions.length : 0), 0);
  const completedKeys = new Set(completedExecutions.map(item => `${Number(item.planVersion || 1)}:${item.sessionId}`));
  const completedSessions = completedKeys.size;
  const exerciseItems = completedExecutions.flatMap(item => Array.isArray(item.exerciseProgress) ? item.exerciseProgress : []);
  const progressions = Array.isArray(user.generatedWorkoutProgressions) ? user.generatedWorkoutProgressions : [];
  const outcomes = progressions.map(item => item.outcome).filter(Boolean);
  const checkIns = Array.isArray(user.checkIns) ? user.checkIns : [];
  const adherenceHistory = allPlans.map(plan => {
    const version = Number(plan.planVersion || plan.version || 1);
    const prescribed = Array.isArray(plan.sessions) ? plan.sessions.length : 0;
    const completed = new Set(completedExecutions.filter(item => Number(item.planVersion || 1) === version).map(item => item.sessionId)).size;
    return prescribed ? Math.round(completed / prescribed * 100) : 0;
  });
  const adherencePercent = prescribedSessions ? Math.min(100, Math.round(completedSessions / prescribedSessions * 100)) : 0;
  return {
    summaryVersion: 1,
    completedWeeks: allPlans.filter(plan => plan.status === "completed" || plan.completedAt).length,
    completedSessions,
    missedSessions: Math.max(0, prescribedSessions - completedSessions),
    prescribedSessions,
    adherencePercent,
    adherenceHistory,
    progressionHistory: outcomes,
    deloadHistory: progressions.filter(item => item.outcome === "DELOAD").map(item => item.evaluatedAt).filter(Boolean),
    maintainHistory: progressions.filter(item => item.outcome === "MAINTAIN").map(item => item.evaluatedAt).filter(Boolean),
    healthReviewHistory: progressions.filter(item => item.outcome === "HEALTH_REVIEW_BLOCKED").map(item => item.evaluatedAt).filter(Boolean),
    incompleteWeeks: outcomes.filter(outcome => outcome === "INCOMPLETE_WEEK").length,
    exerciseCompletionPercent: exerciseItems.length ? Math.round(exerciseItems.filter(item => item.completed).length / exerciseItems.length * 100) : 0,
    averageRecoveryIndicators: {
      sleep: average(numeric(checkIns, "sleep")),
      soreness: average(numeric(checkIns, "soreness")),
      energy: average(numeric(checkIns, "energy"))
    }
  };
}

function adaptTraining(user = {}) {
  const history = summarizeTrainingHistory(user);
  const recent = history.progressionHistory.slice(-4);
  const assigned = Boolean(user.program);
  const healthRestricted = user.journeyProfile?.healthReviewRequired === true || user.memberJourneyProfile?.status === "needs_review" || user.generatedWorkoutPlan?.plan?.status === "health_review_restricted";
  let action = ADAPTATIONS.MAINTAIN;
  let reason = "Current long-term evidence supports maintaining the current level.";
  let recommendedFocus = "consistency";
  if (assigned) {
    action = ADAPTATIONS.FOLLOW_ASSIGNED_PROGRAM; reason = "Your coach-assigned program has precedence."; recommendedFocus = "assigned program";
  } else if (healthRestricted) {
    action = ADAPTATIONS.COMPLETE_HEALTH_REVIEW; reason = "Health-review restrictions prevent progression recommendations."; recommendedFocus = "health review";
  } else if (recent.filter(item => item === "DELOAD").length >= 2) {
    action = ADAPTATIONS.EXTEND_RECOVERY; reason = "Frequent recent deloads support an additional recovery week."; recommendedFocus = "recovery";
  } else if (recent.slice(-3).filter(item => item === "INCOMPLETE_WEEK").length >= 2) {
    action = ADAPTATIONS.REDUCE_PROGRESSION_RATE; reason = "Multiple incomplete weeks support slower progression."; recommendedFocus = "session completion";
  } else if (history.completedWeeks >= 3 && history.adherencePercent >= 90) {
    action = ADAPTATIONS.PROGRESS_EARLIER; reason = "Excellent long-term consistency supports earlier progression review."; recommendedFocus = "bounded progression";
  }
  const recovery = history.averageRecoveryIndicators;
  const insights = [`You've completed ${history.adherencePercent}% of your sessions.`];
  if (recovery.energy >= 7 && recovery.soreness <= 3 && recovery.sleep >= 7) insights.push("Recovery has been excellent.");
  insights.push(action === ADAPTATIONS.EXTEND_RECOVERY ? "An additional recovery week is recommended." : action === ADAPTATIONS.PROGRESS_EARLIER ? "A progression review is recommended earlier." : action === ADAPTATIONS.FOLLOW_ASSIGNED_PROGRAM ? "Continue following your coach-assigned program." : action === ADAPTATIONS.COMPLETE_HEALTH_REVIEW ? "Progression remains paused while health review is required." : "Maintaining your current workload is recommended.");
  const consistencyScore = history.adherencePercent;
  return {
    deterministic: true,
    engineVersion: 1,
    history,
    recommendation: { action, reason, recommendedFocus, progressionPhaseChange: 0, changeLimit: "ONE_VARIABLE", variableToReview: action === ADAPTATIONS.PROGRESS_EARLIER ? "repetitions" : null },
    insights,
    dashboard: {
      consistencyScore,
      adherenceTrend: direction(history.adherenceHistory),
      progressionTrend: direction(history.adherenceHistory.filter((_, index) => history.progressionHistory[index] === "PROGRESS")),
      recommendedFocus,
      nextMilestone: assigned ? "Continue the next coach-assigned session." : healthRestricted ? "Complete the required health review before progression." : consistencyScore < 90 ? `Reach 90% session adherence (${history.completedSessions}/${history.prescribedSessions || 1} completed).` : "Complete the next recommended week."
    }
  };
}

function createTrainingAdaptationService({ userStore }) {
  return { read: userId => adaptTraining(userStore.loadUser(userId)) };
}

module.exports = { ADAPTATIONS, summarizeTrainingHistory, adaptTraining, createTrainingAdaptationService };
