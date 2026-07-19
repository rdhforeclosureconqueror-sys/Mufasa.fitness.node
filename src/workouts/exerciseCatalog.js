"use strict";

const exercise = (id, displayName, movementPattern, equipment, difficulty, primaryMuscles, secondaryMuscles, pathwayCompatibility, goalCompatibility, safeProgressionOptions = []) => Object.freeze({ id, displayName, movementPattern, equipment, difficulty, primaryMuscles, secondaryMuscles, pathwayCompatibility, goalCompatibility, safeProgressionOptions });
const all = ["general_fitness", "yoga", "athlete_performance", "general_fitness_yoga", "general_fitness_athlete", "yoga_athlete", "athlete_rugby"];
const strength = all.filter(x => x !== "yoga");
const athlete = all.filter(x => x.includes("athlete"));

const exercises = Object.freeze([
  exercise("barbell_squat", "Barbell Squat", "squat", "barbell", "advanced", ["quadriceps", "glutes"], ["hamstrings", "core"], strength, ["strength", "muscle_gain", "performance"], []),
  exercise("goblet_squat", "Goblet Squat", "squat", "dumbbells", "intermediate", ["quadriceps", "glutes"], ["hamstrings", "core"], strength, ["strength", "muscle_gain", "general_fitness"], ["barbell_squat"]),
  exercise("bodyweight_squat", "Bodyweight Squat", "squat", "bodyweight", "beginner", ["quadriceps", "glutes"], ["hamstrings", "core"], strength, ["general_fitness", "strength"], ["goblet_squat"]),
  exercise("barbell_rdl", "Barbell Romanian Deadlift", "hinge", "barbell", "advanced", ["hamstrings", "glutes"], ["back", "core"], strength, ["strength", "muscle_gain", "performance"]),
  exercise("dumbbell_rdl", "Dumbbell Romanian Deadlift", "hinge", "dumbbells", "intermediate", ["hamstrings", "glutes"], ["back", "core"], strength, ["strength", "general_fitness"], ["barbell_rdl"]),
  exercise("glute_bridge", "Glute Bridge", "hinge", "bodyweight", "beginner", ["glutes", "hamstrings"], ["core"], strength, ["general_fitness", "strength"], ["dumbbell_rdl"]),
  exercise("dumbbell_floor_press", "Dumbbell Floor Press", "push", "dumbbells", "intermediate", ["chest", "triceps"], ["shoulders"], strength, ["strength", "muscle_gain"]),
  exercise("band_chest_press", "Band Chest Press", "push", "resistance_bands", "beginner", ["chest", "triceps"], ["shoulders"], strength, ["strength", "general_fitness"], ["dumbbell_floor_press"]),
  exercise("incline_push_up", "Incline Push-Up", "push", "bodyweight", "beginner", ["chest", "triceps"], ["shoulders", "core"], strength, ["general_fitness", "strength"], ["band_chest_press"]),
  exercise("cable_row", "Cable Row", "pull", "machines", "intermediate", ["back"], ["biceps", "shoulders"], strength, ["strength", "muscle_gain"]),
  exercise("dumbbell_row", "One-Arm Dumbbell Row", "pull", "dumbbells", "intermediate", ["back"], ["biceps", "core"], strength, ["strength", "general_fitness"], ["cable_row"]),
  exercise("band_row", "Band Row", "pull", "resistance_bands", "beginner", ["back"], ["biceps", "shoulders"], strength, ["general_fitness", "strength"], ["dumbbell_row"]),
  exercise("prone_w_raise", "Prone W Raise", "pull", "bodyweight", "beginner", ["upper_back"], ["shoulders"], all, ["mobility", "general_fitness"], ["band_row"]),
  exercise("dead_bug", "Dead Bug", "core", "bodyweight", "beginner", ["core"], ["hip_flexors"], all, ["general_fitness", "performance"]),
  exercise("acceleration_march", "Acceleration March", "speed", "bodyweight", "beginner", ["glutes", "calves"], ["core", "hip_flexors"], athlete, ["performance", "speed"]),
  exercise("skater_bound", "Skater Bound", "power", "bodyweight", "intermediate", ["glutes", "quadriceps"], ["calves", "core"], athlete, ["performance", "power"]),
  exercise("reverse_lunge", "Reverse Lunge", "single_leg", "bodyweight", "beginner", ["quadriceps", "glutes"], ["hamstrings", "core"], athlete, ["performance", "strength"]),
  exercise("low_impact_intervals", "Low-Impact Intervals", "conditioning", "bodyweight", "beginner", ["cardiovascular_system"], ["legs"], all, ["weight_loss", "endurance", "performance"]),
  exercise("breathing_reset", "Breathing Reset", "breathing", "bodyweight", "beginner", ["diaphragm"], ["core"], all, ["recovery", "mobility"]),
  exercise("cat_cow", "Cat-Cow Flow", "spinal_mobility", "bodyweight", "beginner", ["spinal_muscles"], ["core"], all, ["mobility", "recovery"]),
  exercise("low_lunge_flow", "Low Lunge Flow", "hip_mobility", "bodyweight", "beginner", ["hip_flexors", "glutes"], ["quadriceps"], all, ["mobility", "recovery"]),
  exercise("supported_relaxation", "Supported Relaxation", "recovery", "bodyweight", "beginner", ["whole_body"], [], all, ["recovery"]),
  exercise("mobility_cooldown", "Mobility Cooldown", "mobility", "bodyweight", "beginner", ["whole_body"], [], all, ["mobility", "recovery"])
]);

const byId = Object.freeze(Object.fromEntries(exercises.map(item => [item.id, item])));
module.exports = { exercises, byId };
