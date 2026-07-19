"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveJourneyProfile, createJourneyContext } = require("../src/services/journeyRecommendationEngine");

const intake = overrides => ({ schemaVersion: 1, status: "submitted", pathwaySelection: { selected: ["general_fitness"], primary: "general_fitness" }, goals: { primaryGoal: "Lose body fat", secondaryGoals: ["strength"] }, healthSafety: { healthFlags: [] }, trainingContext: { selfRatedFitnessLevel: "beginner", availableEquipment: ["bands"], activeDaysPerWeek: "3" }, schedule: { realisticSessionsPerWeek: "3", availableDays: ["monday"], availableTimes: ["morning"] }, generalFitness: { weightChangeGoal: "lose_body_fat" }, yogaWellness: { primaryIntentions: [] }, athletePerformance: { sport: null, performancePriorities: [] }, ...overrides });

test("normalizes a legacy-compatible general fitness journey and all integration decisions", () => {
  const profile = deriveJourneyProfile(intake());
  assert.equal(profile.sourceSchemaVersion, 1);
  assert.equal(profile.workoutRecommendationCategory, "general_fitness");
  assert.deepEqual(profile.recommendations.workouts.items, ["general_strength", "general_fitness"]);
  assert.ok(profile.recommendations.nutrition.items.includes("weekly_grocery_mission"));
  assert.deepEqual(profile.recommendations.assessments.items, ["ohsa", "basic_movement_screen"]);
  assert.deepEqual(profile.dashboardModules, ["workout", "nutrition", "habits"]);
  assert.equal(profile.recommendations.workouts.assignedProgramsChanged, false);
  assert.equal(profile.recommendations.assessments.completionChanged, false);
});

test("combines general fitness and yoga without duplicate recommendations", () => {
  const profile = deriveJourneyProfile(intake({ pathwaySelection: { selected: ["general_fitness", "yoga_wellness"], primary: "general_fitness" }, yogaWellness: { experienceLevel: "beginner", primaryIntentions: ["mobility", "recovery"] } }));
  assert.equal(profile.secondaryPathway, "yoga_wellness");
  assert.equal(profile.recommendations.workouts.category, "general_fitness_yoga_hybrid");
  assert.equal(new Set(profile.recommendations.workouts.items).size, profile.recommendations.workouts.items.length);
  assert.equal(new Set(profile.dashboardModules).size, profile.dashboardModules.length);
});

test("enables Rugby-only recommendations for Rugby athletes", () => {
  const rugby = deriveJourneyProfile(intake({ pathwaySelection: { selected: ["athlete_performance"], primary: "athlete_performance" }, athletePerformance: { sport: "Rugby", currentLevel: "club", performancePriorities: ["power"] } }));
  assert.equal(rugby.rugbyEnabled, true);
  assert.ok(rugby.recommendations.workouts.items.includes("rugby_programming"));
  assert.deepEqual(rugby.dashboardModules, ["performance", "rugby", "recovery", "nutrition"]);
  assert.ok(rugby.recommendations.assessments.items.includes("power_testing"));
  assert.ok(rugby.recommendations.nutrition.items.includes("performance_nutrition"));
  const soccer = deriveJourneyProfile(intake({ pathwaySelection: { selected: ["athlete_performance"], primary: "athlete_performance" }, athletePerformance: { sport: "Soccer", performancePriorities: ["speed"] } }));
  assert.equal(soccer.rugbyEnabled, false);
  assert.ok(!soccer.recommendations.workouts.items.includes("rugby_programming"));
  assert.ok(!soccer.dashboardModules.includes("rugby"));
});

test("health review gates first training actions but retains recommendation metadata", () => {
  const profile = deriveJourneyProfile(intake({ status: "needs_review", healthSafety: { healthFlags: ["CURRENT_PAIN_OR_INJURY"] } }));
  assert.equal(profile.assessmentEligibility, "pending_health_review");
  assert.equal(profile.recommendations.assessments.first, null);
  assert.equal(profile.recommendations.firstWorkout, null);
  assert.ok(profile.recommendations.workouts.items.length > 0);
});

test("creates a reusable, allowlisted AI-safe context without raw health answers", () => {
  const profile = deriveJourneyProfile(intake());
  const context = createJourneyContext(profile);
  assert.deepEqual(context, profile.journeyContext);
  assert.deepEqual(Object.keys(context), ["version", "pathways", "goals", "sport", "equipment", "schedule", "training", "nutritionPriorities", "healthReviewState", "assessmentRecommendations"]);
  assert.doesNotMatch(JSON.stringify(context), /medicalDisclaimer|currentPain|fullName/);
});
