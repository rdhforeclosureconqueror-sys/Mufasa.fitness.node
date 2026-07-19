"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createPersonalizationService } = require("../src/services/personalizationService");
const { deriveJourneyProfile } = require("../src/services/journeyRecommendationEngine");

const profileFor = (selected, primary, sport = null) => deriveJourneyProfile({
  schemaVersion: 1, status: "submitted",
  pathwaySelection: { selected, primary }, goals: { primaryGoal: "Build strength", secondaryGoals: [] },
  healthSafety: { healthFlags: [] }, trainingContext: { selfRatedFitnessLevel: "beginner", availableEquipment: ["bands"] },
  schedule: { availableDays: ["monday"], availableTimes: ["morning"] },
  generalFitness: {}, yogaWellness: { primaryIntentions: [] }, athletePerformance: { sport, performancePriorities: [] }
});

function service(profile) {
  return createPersonalizationService({ journeyIntakeService: { get: () => ({ journeyProfile: profile }) } });
}

test("all consumer views are projections of the canonical Journey Profile", () => {
  const profile = profileFor(["general_fitness"], "general_fitness");
  const subject = service(profile);
  const all = subject.getPersonalization("member");
  assert.equal(subject.getWorkoutRecommendation("member").category, profile.recommendations.workouts.category);
  assert.deepEqual(subject.getDashboardConfiguration("member"), profile.recommendations.dashboard);
  assert.deepEqual(subject.getNutritionPriorities("member"), profile.recommendations.nutrition.items);
  assert.deepEqual(subject.getAssessmentRecommendations("member"), profile.recommendations.assessments.items);
  assert.equal(all.featureFlags.hasNutritionRecommendations, true);
  assert.equal(all.featureFlags.hasAssessmentRecommendations, true);
});

test("Rugby and pathway flags are deterministic and Rugby remains conditional", () => {
  const rugby = service(profileFor(["athlete_performance"], "athlete_performance", "Rugby")).getFeatureFlags("member");
  const soccer = service(profileFor(["athlete_performance"], "athlete_performance", "Soccer")).getFeatureFlags("member");
  assert.deepEqual(rugby, { hasAthleteFeatures: true, hasYogaFeatures: false, hasRugbyFeatures: true, requiresHealthReview: false, hasNutritionRecommendations: true, hasAssessmentRecommendations: true });
  assert.equal(soccer.hasRugbyFeatures, false);
});

test("consumer projections are defensive copies and never mutate Journey Profile", () => {
  const profile = profileFor(["general_fitness"], "general_fitness");
  const subject = service(profile);
  subject.getNutritionPriorities("member").push("duplicate_decision");
  subject.getDashboardConfiguration("member").modules.push("duplicate_widget");
  assert.ok(!profile.recommendations.nutrition.items.includes("duplicate_decision"));
  assert.ok(!profile.recommendations.dashboard.modules.includes("duplicate_widget"));
});

test("application recommendation entry points delegate to the canonical service", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const retentionFlow = fs.readFileSync(path.join(__dirname, "..", "public", "retention-flow.js"), "utf8");
  for (const method of ["getWorkoutRecommendation", "getDashboardConfiguration", "getNutritionPriorities", "getAssessmentRecommendations"]) {
    assert.match(server, new RegExp(`personalizationService\\.${method}\\(req\\.auth\\.userId\\)`));
  }
  assert.match(retentionFlow, /authedRequest\("\/api\/me\/personalization"\)/);
  assert.match(retentionFlow, /personalization\?\.featureFlags\?\.hasAssessmentRecommendations/);
  assert.match(retentionFlow, /personalization\?\.recommendedWorkoutCategory/);
});

test("canonical service contains no legacy personalization inputs or decision tree", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "services", "personalizationService.js"), "utf8");
  assert.doesNotMatch(source, /clientIntake|goalsBaseline|memberJourneyProfile|user\.profile|user\.program/);
  assert.doesNotMatch(source, /primaryPathway\s*===|sport\).*rugby|includes\("rugby"\)/i);
});
