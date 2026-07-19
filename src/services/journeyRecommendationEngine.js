"use strict";

const unique = values => [...new Set(values.filter(Boolean))];
const normalized = value => String(value || "").trim().toLowerCase();
const contains = (values, terms) => values.some(value => terms.some(term => normalized(value).includes(term)));

function recommend(input) {
  const { selected, primaryPathway, rugbyEnabled, goals, healthReviewRequired } = input;
  const general = selected.includes("general_fitness");
  const yoga = selected.includes("yoga_wellness");
  const athlete = selected.includes("athlete_performance");
  const weightLoss = contains(goals, ["weight loss", "lose body", "fat loss", "lose_body"]);
  const recovery = yoga || contains(goals, ["recovery", "return", "rehab"]);
  const hydration = athlete || contains(goals, ["hydration", "conditioning", "endurance"]);
  const protein = athlete || contains(goals, ["protein", "strength", "muscle"]);
  const workoutItems = unique([general && "general_strength", general && "general_fitness", yoga && "mobility", yoga && "recovery", yoga && "yoga_practice", athlete && "athlete_programming", athlete && "speed", athlete && "power", athlete && "conditioning", rugbyEnabled && "rugby_programming"]);
  const assessmentItems = unique([(general || athlete) && "ohsa", general && "basic_movement_screen", yoga && "mobility", yoga && "balance", yoga && "flexibility", athlete && "power_testing", athlete && "speed_testing"]);
  const nutritionItems = unique([weightLoss && "weight_loss_education", weightLoss && "weekly_grocery_mission", protein && "protein_focused_education", recovery && "recovery_nutrition", hydration && "hydration_missions", athlete && "performance_nutrition"]);
  const modules = rugbyEnabled ? ["performance", "rugby", "recovery", "nutrition"] : athlete ? ["performance", "training", "recovery"] : primaryPathway === "yoga_wellness" ? ["yoga", "mobility", "recovery"] : ["workout", "nutrition", "habits"];
  if (general && yoga) modules.push("mobility", "recovery");
  return {
    workouts: { category: athlete && yoga ? "athlete_yoga_hybrid" : general && yoga ? "general_fitness_yoga_hybrid" : athlete ? "athlete_performance" : yoga ? "yoga_wellness" : "general_fitness", items: workoutItems, assignedProgramsChanged: false },
    nutrition: { items: nutritionItems, weeklyNutritionApi: { createPlan: "/api/me/nutrition/weekly-plans", generateMissions: "/api/me/nutrition/weekly-plans/:planId/generate-missions" }, automaticMealGeneration: false },
    assessments: { items: assessmentItems, first: healthReviewRequired ? null : assessmentItems[0] || null, completionChanged: false },
    dashboard: { key: rugbyEnabled ? "athlete_rugby" : athlete ? "athlete" : primaryPathway === "yoga_wellness" ? "yoga" : "general_fitness", modules: unique(modules) },
    reviewStatus: healthReviewRequired ? "health_review_required" : "ready",
    firstWorkout: healthReviewRequired ? null : workoutItems[0] || null,
    firstNutritionMission: nutritionItems.find(item => item.includes("mission")) || nutritionItems[0] || null,
    nextSteps: unique([healthReviewRequired ? "complete_health_review" : "complete_first_assessment", workoutItems.length && "review_recommended_workout", nutritionItems.length && "start_nutrition_mission"])
  };
}

function createJourneyContext(profile) {
  return { version: 1, pathways: [...profile.pathways], goals: [...profile.goals], sport: profile.sport, equipment: { ...profile.equipmentAvailability, equipment: [...profile.equipmentAvailability.equipment] }, schedule: { ...profile.trainingAvailability, days: [...profile.trainingAvailability.days], times: [...profile.trainingAvailability.times] }, training: { experienceLevel: profile.experienceLevel, workoutCategory: profile.workoutRecommendationCategory }, nutritionPriorities: [...profile.recommendations.nutrition.items], healthReviewState: profile.recommendations.reviewStatus, assessmentRecommendations: [...profile.recommendations.assessments.items] };
}

function deriveJourneyProfile(intake = {}) {
  const selected = intake.pathwaySelection?.selected || intake.selectedPathways || [];
  const primaryPathway = intake.pathwaySelection?.primary || intake.primaryPathway || selected[0] || null;
  const sport = intake.athletePerformance?.sport || null;
  const rugbyEnabled = selected.includes("athlete_performance") && normalized(sport) === "rugby";
  const healthReviewRequired = (intake.healthSafety?.healthFlags || []).length > 0 || intake.status === "needs_review";
  const goals = unique([intake.goals?.primaryGoal, ...(intake.goals?.secondaryGoals || []), intake.generalFitness?.weightChangeGoal, ...(intake.yogaWellness?.primaryIntentions || []), ...(intake.athletePerformance?.performancePriorities || [])]);
  const recommendations = recommend({ selected, primaryPathway, rugbyEnabled, goals, healthReviewRequired });
  const profile = { version: 1, sourceSchemaVersion: intake.schemaVersion || 1, primaryPathway, secondaryPathway: selected.find(pathway => pathway !== primaryPathway) || null, pathways: unique(selected), primaryGoal: intake.goals?.primaryGoal || intake.generalFitness?.weightChangeGoal || null, goals, experienceLevel: intake.trainingContext?.selfRatedFitnessLevel || intake.yogaWellness?.experienceLevel || intake.athletePerformance?.currentLevel || null, sport, rugbyEnabled, equipmentAvailability: { gymAccess: intake.trainingContext?.gymAccess || null, fieldTrackAccess: intake.trainingContext?.fieldTrackAccess || null, equipment: unique(intake.trainingContext?.availableEquipment || []) }, trainingAvailability: { activeDaysPerWeek: intake.trainingContext?.activeDaysPerWeek || null, sessionsPerWeek: intake.schedule?.realisticSessionsPerWeek || null, days: unique(intake.schedule?.availableDays || []), times: unique(intake.schedule?.availableTimes || []) }, healthReviewRequired, assessmentEligibility: healthReviewRequired ? "pending_health_review" : "eligible", nutritionCoachingEligibility: "eligible", workoutRecommendationCategory: recommendations.workouts.category, dashboardModules: recommendations.dashboard.modules, recommendations };
  profile.journeyContext = createJourneyContext(profile);
  return profile;
}

module.exports = { deriveJourneyProfile, createJourneyContext };
