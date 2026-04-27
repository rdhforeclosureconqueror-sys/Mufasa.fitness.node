"use strict";

const { ApiError } = require("../lib/apiResponse");

const ALLOWED_GOALS = new Set([
  "fat_loss",
  "muscle_gain",
  "strength",
  "mobility",
  "endurance",
  "rehab_prehab",
  "general_fitness"
]);

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, field) {
  if (!isObject(value)) throw new ApiError("VALIDATION_ERROR", `${field} must be an object`, 400);
  return value;
}

function asString(value, field, { required = false, min = 1, max = 512 } = {}) {
  if (value == null || value === "") {
    if (required) throw new ApiError("VALIDATION_ERROR", `${field} is required`, 400);
    return null;
  }
  if (typeof value !== "string") throw new ApiError("VALIDATION_ERROR", `${field} must be a string`, 400);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ApiError("VALIDATION_ERROR", `${field} length must be ${min}-${max}`, 400);
  }
  return trimmed;
}

function asNumber(value, field, { required = false, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  if (value == null || value === "") {
    if (required) throw new ApiError("VALIDATION_ERROR", `${field} is required`, 400);
    return null;
  }
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) throw new ApiError("VALIDATION_ERROR", `${field} must be a number`, 400);
  if (num < min || num > max) throw new ApiError("VALIDATION_ERROR", `${field} must be between ${min} and ${max}`, 400);
  return num;
}

function asBoolean(value, field, { required = false } = {}) {
  if (value == null) {
    if (required) throw new ApiError("VALIDATION_ERROR", `${field} is required`, 400);
    return null;
  }
  if (typeof value !== "boolean") throw new ApiError("VALIDATION_ERROR", `${field} must be a boolean`, 400);
  return value;
}

function asStringArray(value, field, { maxItems = 50, maxItemLen = 256 } = {}) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ApiError("VALIDATION_ERROR", `${field} must be an array`, 400);
  if (value.length > maxItems) throw new ApiError("VALIDATION_ERROR", `${field} can include at most ${maxItems} items`, 400);
  return value.map((entry, index) => asString(entry, `${field}[${index}]`, { required: true, min: 1, max: maxItemLen }));
}

function validateGoalCategory(goal, field = "goal") {
  const normalized = asString(goal, field, { required: true, max: 64 })?.toLowerCase().replace(/[\s/]+/g, "_");
  if (!ALLOWED_GOALS.has(normalized)) {
    throw new ApiError("VALIDATION_ERROR", `${field} must be one of: ${Array.from(ALLOWED_GOALS).join(", ")}`, 400);
  }
  return normalized;
}

function validateClientIntake(input) {
  const payload = assertObject(input, "Request body");
  return {
    name: asString(payload.name, "name", { required: true, max: 120 }),
    age: asNumber(payload.age, "age", { required: true, min: 1, max: 120 }),
    sex: asString(payload.sex, "sex", { required: false, max: 40 }),
    heightCm: asNumber(payload.height ?? payload.heightCm, "height", { required: true, min: 50, max: 300 }),
    weightKg: asNumber(payload.weight ?? payload.weightKg, "weight", { required: false, min: 20, max: 450 }),
    goals: asStringArray(payload.goals, "goals", { maxItems: 20, maxItemLen: 200 }),
    injuries: asStringArray(payload.injuries, "injuries", { maxItems: 30, maxItemLen: 220 }),
    limitations: asStringArray(payload.limitations, "limitations", { maxItems: 30, maxItemLen: 220 }),
    trainingExperience: asString(payload.trainingExperience, "trainingExperience", { required: false, max: 500 }),
    equipment: asStringArray(payload.equipment, "equipment", { maxItems: 40, maxItemLen: 120 }),
    schedule: asString(payload.schedule, "schedule", { required: false, max: 500 }),
    preferredWorkoutDays: asStringArray(payload.preferredWorkoutDays, "preferredWorkoutDays", { maxItems: 7, maxItemLen: 20 }),
    medicalDisclaimerConsent: asBoolean(payload.medicalDisclaimerConsent, "medicalDisclaimerConsent", { required: true }),
    notes: asString(payload.notes, "notes", { required: false, max: 3000 })
  };
}

function validateGoalsBaseline(input) {
  const payload = assertObject(input, "Request body");
  return {
    goal: validateGoalCategory(payload.goal, "goal"),
    baseline: {
      startingStrengthTests: asStringArray(payload.baseline?.startingStrengthTests, "baseline.startingStrengthTests", { maxItems: 25, maxItemLen: 220 }),
      formScoreBaseline: asNumber(payload.baseline?.formScoreBaseline, "baseline.formScoreBaseline", { required: false, min: 0, max: 100 }),
      measurements: asStringArray(payload.baseline?.measurements, "baseline.measurements", { maxItems: 20, maxItemLen: 200 }),
      visualProgressScan: asString(payload.baseline?.visualProgressScan, "baseline.visualProgressScan", { required: false, max: 2000 })
    }
  };
}

function validateProgramAssignment(input) {
  const payload = assertObject(input, "Request body");
  return {
    clientId: asString(payload.clientId, "clientId", { required: true, max: 128 }),
    goal: validateGoalCategory(payload.goal, "goal"),
    durationWeeks: asNumber(payload.durationWeeks, "durationWeeks", { required: true, min: 1, max: 104 }),
    daysPerWeek: asNumber(payload.daysPerWeek, "daysPerWeek", { required: true, min: 1, max: 7 }),
    movementFocus: asStringArray(payload.movementFocus, "movementFocus", { maxItems: 20, maxItemLen: 120 }),
    exercises: asStringArray(payload.exercises, "exercises", { maxItems: 100, maxItemLen: 120 }),
    progressionRules: asStringArray(payload.progressionRules, "progressionRules", { maxItems: 30, maxItemLen: 240 })
  };
}

function validateWorkoutTracking(input) {
  const payload = assertObject(input, "Request body");
  return {
    programId: asString(payload.programId, "programId", { required: true, max: 128 }),
    workoutId: asString(payload.workoutId, "workoutId", { required: true, max: 128 }),
    exercisesCompleted: asStringArray(payload.exercisesCompleted, "exercisesCompleted", { maxItems: 100, maxItemLen: 160 }),
    reps: asNumber(payload.reps, "reps", { required: false, min: 0, max: 2000 }),
    sets: asNumber(payload.sets, "sets", { required: false, min: 0, max: 500 }),
    formScore: asNumber(payload.formScore, "formScore", { required: false, min: 0, max: 100 }),
    sessionDurationMinutes: asNumber(payload.sessionDuration ?? payload.sessionDurationMinutes, "sessionDuration", { required: false, min: 0, max: 600 }),
    notes: asString(payload.notes, "notes", { required: false, max: 2000 }),
    completionStatus: asString(payload.completionStatus, "completionStatus", { required: true, max: 32 })
  };
}

function validateWeeklyCheckIn(input) {
  const payload = assertObject(input, "Request body");
  return {
    energy: asNumber(payload.energy, "energy", { required: true, min: 1, max: 10 }),
    soreness: asNumber(payload.soreness, "soreness", { required: true, min: 1, max: 10 }),
    sleep: asNumber(payload.sleep, "sleep", { required: true, min: 0, max: 24 }),
    motivation: asNumber(payload.motivation, "motivation", { required: true, min: 1, max: 10 }),
    weightKg: asNumber(payload.weight ?? payload.weightKg, "weight", { required: false, min: 20, max: 450 }),
    measurements: asStringArray(payload.measurements, "measurements", { maxItems: 20, maxItemLen: 180 }),
    progressNotes: asString(payload.progressNotes, "progressNotes", { required: false, max: 3000 }),
    adherence: asNumber(payload.adherence, "adherence", { required: true, min: 0, max: 100 }),
    painFlag: asBoolean(payload.painFlag, "painFlag", { required: true })
  };
}

function validateVisualProgressScan(input) {
  const payload = assertObject(input, "Request body");
  return {
    captureLabel: asString(payload.captureLabel, "captureLabel", { required: false, max: 120 }),
    frontImageUrl: asString(payload.frontImageUrl, "frontImageUrl", { required: true, max: 2048 }),
    sideImageUrl: asString(payload.sideImageUrl, "sideImageUrl", { required: true, max: 2048 }),
    backImageUrl: asString(payload.backImageUrl, "backImageUrl", { required: true, max: 2048 }),
    bodyMapSummary: asString(payload.bodyMapSummary, "bodyMapSummary", { required: false, max: 2000 }),
    estimatedProportions: asStringArray(payload.estimatedProportions, "estimatedProportions", { maxItems: 20, maxItemLen: 200 }),
    postureAlignment: asString(payload.postureAlignment, "postureAlignment", { required: false, max: 2000 }),
    visualChangeNotes: asString(payload.visualChangeNotes, "visualChangeNotes", { required: false, max: 2000 })
  };
}

module.exports = {
  ALLOWED_GOALS,
  validateClientIntake,
  validateGoalsBaseline,
  validateProgramAssignment,
  validateWorkoutTracking,
  validateWeeklyCheckIn,
  validateVisualProgressScan
};
