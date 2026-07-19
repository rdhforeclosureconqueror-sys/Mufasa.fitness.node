"use strict";

// Member-home is a presentation read model. Canonical domain services remain the
// owners of Journey, workout, progression, adaptation, nutrition and dashboard rules.
const LABELS = Object.freeze({
  draft: "In progress", submitted: "Complete", approved: "Complete",
  needs_review: "Needs review", review_required: "Needs review",
  not_required: "No review needed", in_progress: "In progress",
  completed: "Complete", recommended: "Ready", active: "In progress",
  restricted: "Needs review", unavailable: "Temporarily unavailable"
});

function label(value, fallback = "Not available") {
  return LABELS[String(value || "").toLowerCase()] || fallback;
}

function action(type, title, explanation, route, eligibility = "eligible") {
  return { type, title, explanation, route, eligibility: label(eligibility, eligibility === "eligible" ? "Ready" : "Not available") };
}

function resolveNextBestAction(model) {
  if (!model.journey.complete) return action("complete_journey", model.journey.started ? "Resume your Journey" : "Start your Journey", "Complete your intake so your recommendations reflect your goals and schedule.", "/workout.html#retentionFlowRoot");
  if (model.healthReview.required) return action("await_health_review", "Your information needs review", "Review is required before training progression. This is not a medical diagnosis or clearance.", "/workout.html#generatedWorkoutPlan", "restricted");
  if (model.inProgressSession) return action("resume_workout", "Resume your workout", `Continue ${model.inProgressSession.title}.`, `/workout.html#generatedWorkoutPlan`);
  if (model.assessmentRecommendation?.eligible) return action("complete_assessment", "Complete your recommended assessment", model.assessmentRecommendation.explanation, "/workout.html#ohsSummaryView");
  if (model.nextWorkout) return action("start_workout", "Start your next workout", `${model.nextWorkout.title} is ready when you are.`, "/workout.html#generatedWorkoutPlan");
  if (model.weeklyProgression?.acceptanceAvailable) return action("review_next_week", "Review your next training week", "A server-generated progression recommendation is ready for review.", "/workout.html#generatedWorkoutProgression");
  if (model.nutritionMission?.active) return action("complete_nutrition_mission", "Continue your nutrition focus", model.nutritionMission.title, "/nutrition.html");
  if (model.activeProgram.source !== "No active program") return action("continue_program", "Continue your active program", model.activeProgram.title, "/workout.html");
  return action("review_progress", "Review your progress", "See your recent activity and choose a useful next step.", "/dashboard.html");
}

function createMemberHomeService({ journeyIntakeService, personalizationService, generatedWorkoutService, generatedWorkoutProgressionService, trainingAdaptationService, nutritionService, userDataService }) {
  function read(userId) {
    const journeyRead = journeyIntakeService.get(userId);
    const personalization = personalizationService.getPersonalization(userId);
    const workout = generatedWorkoutService.readModel(userId);
    const progression = generatedWorkoutProgressionService.state(userId);
    const adaptation = trainingAdaptationService.read(userId);
    const nutrition = nutritionService.currentWeeklyPlan(userId);
    const progress = userDataService.getProgressDashboard(userId);
    const sessions = workout.plan?.sessions || [];
    const inProgress = sessions.find(item => item.status === "in_progress") || null;
    const nextWorkout = sessions.find(item => item.status === "not_started") || null;
    const incompleteMission = (nutrition.missions || []).find(item => !["completed", "skipped"].includes(item.status)) || null;
    const assessmentItems = personalization.recommendedAssessments || [];
    const assessment = assessmentItems[0] || null;
    const intake = journeyRead.intake;
    const journeyComplete = ["submitted", "approved", "needs_review"].includes(intake.status);
    const source = workout.activeProgramSource;
    const activeProgram = source === "coach_assigned"
      ? { source: "Assigned program", title: workout.assignedProgram?.title || "Assigned program" }
      : source === "member_selected" ? { source: "Selected program", title: "Your selected program" }
        : source === "generated_recommendation" ? { source: "Journey recommendation", title: workout.plan?.recommendedProgram?.title || "Recommended weekly plan" }
          : { source: "No active program", title: "Complete your Journey to receive a recommendation" };
    const model = {
      version: 1,
      journey: { status: label(intake.status), complete: journeyComplete, started: journeyRead.progress.completedCount > 0, primaryPathway: journeyRead.journeyProfile.primaryPathway || null, secondaryPathway: journeyRead.journeyProfile.pathways?.find(p => p !== journeyRead.journeyProfile.primaryPathway) || null, completedSteps: journeyRead.progress.completedCount, totalSteps: journeyRead.progress.totalRequiredSteps },
      healthReview: { required: personalization.featureFlags.requiresHealthReview, state: label(personalization.healthReviewState), message: personalization.featureFlags.requiresHealthReview ? "Your information needs review before progression. This does not imply medical diagnosis or clearance." : "No health review is currently required." },
      activeProgram,
      recommendedProgram: workout.plan?.recommendedProgram || null,
      currentWorkoutWeek: workout.available ? { weekNumber: workout.plan.week, status: label(workout.plan.status), sessionsCompleted: sessions.filter(s => s.status === "completed").length, sessionsTotal: sessions.length } : null,
      nextWorkout: nextWorkout ? { sessionId: nextWorkout.sessionId, title: nextWorkout.title, durationMinutes: nextWorkout.durationMinutes, status: "Ready" } : null,
      inProgressSession: inProgress ? { executionId: inProgress.executionId, sessionId: inProgress.sessionId, title: inProgress.title, status: "In progress" } : null,
      weeklyProgression: progression.available ? { status: label(progression.currentPlan?.status), acceptanceAvailable: progression.nextRecommendedAction === "ACCEPT_NEXT_WEEK", nextAction: progression.nextRecommendedAction === "ACCEPT_NEXT_WEEK" ? "Review next week" : "Continue this week" } : null,
      trainingAdaptation: { status: "Ready", insight: adaptation.insights?.[0] || adaptation.dashboard?.recommendedFocus || "Complete workouts to build progress insights." },
      nutritionMission: incompleteMission ? { active: true, title: incompleteMission.title, status: label(incompleteMission.status), progress: incompleteMission.progressValue || 0 } : { active: false, title: "No active nutrition mission", status: "Not available", progress: 0 },
      assessmentRecommendation: assessment ? { eligible: true, title: typeof assessment === "string" ? assessment : (assessment.title || assessment.name || "Movement assessment"), explanation: "Use the recommended assessment to establish or update your movement baseline." } : null,
      dashboardModules: personalization.recommendedDashboard?.modules || [],
      progressSummary: { workoutsCompleted: progress.workoutsCompleted, status: progress.goalProgress?.status === "in_progress" ? "In progress" : "Ready" },
      emptyStateGuidance: []
    };
    if (!workout.available) model.emptyStateGuidance.push("No generated workout week is available yet. Complete your Journey or continue your existing program.");
    if (!nutrition.plan) model.emptyStateGuidance.push("No nutrition mission is active. You can use the nutrition journal at any time.");
    if (!assessment) model.emptyStateGuidance.push("No assessment is currently recommended.");
    model.primaryAction = resolveNextBestAction(model);
    model.secondaryActions = [
      action("view_workout_plan", "Workout plan", "View your current workout week.", "/workout.html#generatedWorkoutPlan"),
      action("view_nutrition", "Nutrition", "Open your journal and missions.", "/nutrition.html"),
      action("view_progress", "Progress", "Review your progress dashboard.", "/dashboard.html")
    ].filter(item => item.type !== model.primaryAction.type);
    return model;
  }
  return { read };
}

module.exports = { createMemberHomeService, resolveNextBestAction, label };
