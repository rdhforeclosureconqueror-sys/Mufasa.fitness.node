"use strict";

const { templates } = require("./workoutTemplates");
const { exercises } = require("./exerciseCatalog");

const VERSION = 1;
const levelRank = { beginner: 0, intermediate: 1, advanced: 2 };
const aliases = { bands: "resistance_bands", band: "resistance_bands", dumbbell: "dumbbells", machine: "machines", none: "bodyweight" };
const normalize = value => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

function availableEquipment(profile) {
  const available = new Set(["bodyweight"]);
  for (const value of profile.equipmentAvailability?.equipment || []) available.add(aliases[normalize(value)] || normalize(value));
  if (["yes", "true", "full", "gym", "available"].includes(normalize(profile.equipmentAvailability?.gymAccess))) ["dumbbells", "barbell", "resistance_bands", "machines"].forEach(x => available.add(x));
  return available;
}

function chooseExercise(category, pathway, experience, available) {
  const candidates = exercises.filter(item => item.movementPattern === category && item.pathwayCompatibility.includes(pathway) && levelRank[item.difficulty] <= levelRank[experience]);
  return candidates.find(item => available.has(item.equipment)) || candidates.filter(item => available.has(item.equipment)).at(-1) || exercises.find(item => item.movementPattern === category && item.equipment === "bodyweight");
}

function restrictedPlan(profile) {
  return { version: VERSION, week: 1, status: "health_review_restricted", recommendationOnly: true, sessions: [{ week: 1, day: profile.trainingAvailability?.days?.[0] || "day_1", session: "Restricted Starter Session", durationMinutes: 20, exercises: ["breathing_reset", "supported_relaxation"].map(id => { const item=exercises.find(x=>x.id===id); return { exerciseId:item.id, displayName:item.displayName, sets:1, reps:"5 comfortable breaths", restSeconds:60, notes:"Stop if symptoms occur; remain within a comfortable range." }; }), notes:"Health review is required before unrestricted programming. No progression is permitted." }] };
}

function buildWorkoutPlan(profile = {}, recommendation = profile) {
  if (profile.healthReviewRequired || recommendation.recommendedProgram?.unrestricted === false) return restrictedPlan(profile);
  const pathway = recommendation.recommendedProgram?.pathway || "general_fitness";
  const template = templates[pathway] || templates.general_fitness;
  const experience = levelRank[normalize(profile.experienceLevel)] == null ? "beginner" : normalize(profile.experienceLevel);
  const requested = Math.max(2, Math.min(6, Number(recommendation.recommendedFrequency || profile.trainingAvailability?.sessionsPerWeek || 3)));
  const days = profile.trainingAvailability?.days || [];
  const available = availableEquipment(profile);
  const sessions = Array.from({ length: requested }, (_, index) => {
    const spec = template.trainingDays[index % template.trainingDays.length];
    return { week:1, day:days[index] || `day_${index+1}`, session:`${pathway.replaceAll("_", " ")} ${index+1}`, durationMinutes:Number(recommendation.recommendedSessionLength || profile.trainingAvailability?.sessionLengthMinutes || 45), exercises:spec.categories.map(category => { const item=chooseExercise(category,pathway,experience,available); return { exerciseId:item.id, displayName:item.displayName, sets:spec.sets[experience], reps:spec.reps, restSeconds:spec.restSeconds, notes:`Use controlled technique. ${template.progressionRules[experience]}` }; }), notes:"Recommended session; adjust only through the documented progression rule." };
  });
  return { version:VERSION, week:1, status:"recommended", recommendationOnly:true, pathway, experience, sessions };
}

module.exports = { PLAN_GENERATOR_VERSION: VERSION, buildWorkoutPlan, availableEquipment };
