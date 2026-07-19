"use strict";

const progression = {
  beginner: "Add reps within the range, then use the next safe progression when every set is controlled.",
  intermediate: "Reach the top of the rep range before adding a small load or progression.",
  advanced: "Add load or complexity only after completing every target with consistent technique."
};

const strength = (categories, extra = {}) => ({ categories, sets: { beginner: 2, intermediate: 3, advanced: 4 }, reps: "8-12", restSeconds: 75, ...extra });
const mobility = { categories: ["breathing", "spinal_mobility", "hip_mobility", "recovery"], sets: { beginner: 1, intermediate: 2, advanced: 2 }, reps: "5-8 breaths", restSeconds: 30 };
const conditioning = { categories: ["conditioning", "core", "mobility"], sets: { beginner: 2, intermediate: 3, advanced: 4 }, reps: "30-45 seconds", restSeconds: 45 };

const templates = Object.freeze({
  general_fitness: { trainingDays: [strength(["squat", "hinge", "push", "pull", "core"]), conditioning] },
  yoga: { trainingDays: [mobility] },
  athlete_performance: { trainingDays: [strength(["squat", "hinge", "push", "pull", "speed"]), strength(["power", "single_leg", "pull", "push", "core"]), conditioning] },
  general_fitness_yoga: { trainingDays: [strength(["squat", "hinge", "push", "pull", "core"]), mobility] },
  general_fitness_athlete: { trainingDays: [strength(["squat", "hinge", "push", "pull", "core"]), strength(["power", "single_leg", "pull", "push", "speed"]), conditioning] },
  yoga_athlete: { trainingDays: [strength(["power", "single_leg", "pull", "push", "speed"]), mobility, conditioning] },
  athlete_rugby: { trainingDays: [strength(["squat", "hinge", "push", "pull", "core"]), strength(["power", "single_leg", "pull", "push", "speed"]), conditioning] }
});

for (const template of Object.values(templates)) template.progressionRules = progression;

module.exports = { templates, progression };
