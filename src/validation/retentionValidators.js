"use strict";

const { ValidationError } = require("./validationError");

const ALLOWED_GOALS = new Set([
  "fat_loss", "strength", "muscle_gain", "endurance", "mobility", "general_fitness", "sport_performance"
]);

function assertObject(value, field = "value") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError(`${field} must be an object`);
  return value;
}

function asString(value, field, { required = false, max = 500 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  const result = String(value).trim();
  if (required && !result) throw new ValidationError(`${field} is required`);
  if (result.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer`);
  return result || null;
}

function asNumber(value, field, { required = false, min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  const result = Number(value);
  if (!Number.isFinite(result)) throw new ValidationError(`${field} must be a number`);
  if (result < min || result > max) throw new ValidationError(`${field} must be between ${min} and ${max}`);
  return result;
}

function asBoolean(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be a boolean`);
  return value;
}

function asStringArray(value, field, { maxItems = 50, maxItemLen = 200 } = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`);
  if (value.length > maxItems) throw new ValidationError(`${field} must contain ${maxItems} items or fewer`);
  return value.map((item, index) => asString(item, `${field}[${index}]`, { required: true, max: maxItemLen }));
}

function validateGoalCategory(value, field = "goal") {
  const result = asString(value, field, { required: true, max: 80 });
  if (!ALLOWED_GOALS.has(result)) throw new ValidationError(`${field} must be one of: ${[...ALLOWED_GOALS].join(", ")}`);
  return result;
}

function validateClientIntake(input) {
  const payload = assertObject(input, "Request body");
  return {
    name: asString(payload.name, "name", { required: true, max: 120 }),
    email: asString(payload.email, "email", { required: true, max: 320 }),
    age: asNumber(payload.age, "age", { required: true, min: 13, max: 120 }),
    heightCm: asNumber(payload.heightCm, "heightCm", { required: false, min: 80, max: 260 }),
    weightKg: asNumber(payload.weightKg, "weightKg", { required: false, min: 20, max: 450 }),
    trainingExperience: asString(payload.trainingExperience, "trainingExperience", { required: false, max: 120 }),
    weeklyAvailability: asNumber(payload.weeklyAvailability, "weeklyAvailability", { required: true, min: 1, max: 7 }),
    availableEquipment: asStringArray(payload.availableEquipment, "availableEquipment", { maxItems: 40, maxItemLen: 100 }),
    preferredTrainingTimes: asStringArray(payload.preferredTrainingTimes, "preferredTrainingTimes", { maxItems: 20, maxItemLen: 100 }),
    medicalClearanceConfirmed: asBoolean(payload.medicalClearanceConfirmed, "medicalClearanceConfirmed", { required: true }),
    notes: asString(payload.notes, "notes", { required: false, max: 3000 })
  };
}

function validateGoalsBaseline(input) {
  const payload = assertObject(input, "Request body");
  return {
    goal: validateGoalCategory(payload.goal, "goal"),
    baseline: {
      weightKg: asNumber(payload.baseline?.weightKg, "baseline.weightKg", { required: false, min: 20, max: 450 }),
      waistCm: asNumber(payload.baseline?.waistCm, "baseline.waistCm", { required: false, min: 30, max: 300 }),
      bodyFatPercent: asNumber(payload.baseline?.bodyFatPercent, "baseline.bodyFatPercent", { required: false, min: 2, max: 80 }),
      pushUps: asNumber(payload.baseline?.pushUps, "baseline.pushUps", { required: false, min: 0, max: 1000 }),
      squatReps: asNumber(payload.baseline?.squatReps, "baseline.squatReps", { required: false, min: 0, max: 1000 }),
      plankSeconds: asNumber(payload.baseline?.plankSeconds, "baseline.plankSeconds", { required: false, min: 0, max: 3600 }),
      mileTimeSeconds: asNumber(payload.baseline?.mileTimeSeconds, "baseline.mileTimeSeconds", { required: false, min: 120, max: 7200 }),
      formScoreBaseline: asNumber(payload.baseline?.formScoreBaseline, "baseline.formScoreBaseline", { required: false, min: 0, max: 100 }),
      visualProgressScan: asString(payload.baseline?.visualProgressScan, "baseline.visualProgressScan", { required: false, max: 2000 })
    }
  };
}

function validateProgramAssignment(input) {
  const payload = assertObject(input, "Request body");
  return {
    clientId: asString(payload.clientId, "clientId", { required: true, max: 128 }),
    title: asString(payload.title, "title", { required: false, max: 120 }),
    goal: validateGoalCategory(payload.goal, "goal"),
    durationWeeks: asNumber(payload.durationWeeks, "durationWeeks", { required: true, min: 1, max: 104 }),
    daysPerWeek: asNumber(payload.daysPerWeek, "daysPerWeek", { required: true, min: 1, max: 7 }),
    movementFocus: asStringArray(payload.movementFocus, "movementFocus", { maxItems: 20, maxItemLen: 120 }),
    exercises: asStringArray(payload.exercises, "exercises", { maxItems: 100, maxItemLen: 120 }),
    progressionRules: asStringArray(payload.progressionRules, "progressionRules", { maxItems: 30, maxItemLen: 240 })
  };
}

function validateFormFindings(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError("formFindings must be an array");
  if (value.length > 24) throw new ValidationError("formFindings must contain 24 items or fewer");
  return value.map((item, index) => {
    const finding = assertObject(item, `formFindings[${index}]`);
    return {
      exerciseId: asString(finding.exerciseId, `formFindings[${index}].exerciseId`, { required: true, max: 128 }),
      setIndex: asNumber(finding.setIndex, `formFindings[${index}].setIndex`, { required: true, min: 0, max: 500 }),
      ruleId: asString(finding.ruleId, `formFindings[${index}].ruleId`, { required: true, max: 128 }),
      status: asString(finding.status, `formFindings[${index}].status`, { required: true, max: 32 }),
      affectedFramePercentage: asNumber(finding.affectedFramePercentage, `formFindings[${index}].affectedFramePercentage`, { required: false, min: 0, max: 100 }),
      maximumConsecutiveDurationMs: asNumber(finding.maximumConsecutiveDurationMs, `formFindings[${index}].maximumConsecutiveDurationMs`, { required: false, min: 0, max: 600000 }),
      confidence: asNumber(finding.confidence, `formFindings[${index}].confidence`, { required: false, min: 0, max: 1 }),
      recordedAt: asString(finding.recordedAt, `formFindings[${index}].recordedAt`, { required: false, max: 64 }),
      source: asString(finding.source, `formFindings[${index}].source`, { required: false, max: 64 }) || "workout_form_runtime"
    };
  }).filter(item => item.status === "needs_attention");
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
    formFindings: validateFormFindings(payload.formFindings),
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
    strengthProgressionNotes: asString(payload.strengthProgressionNotes, "strengthProgressionNotes", { required: false, max: 3000 }),
    formTrendNotes: asString(payload.formTrendNotes, "formTrendNotes", { required: false, max: 3000 }),
    bodyMeasurementsOptional: asString(payload.bodyMeasurementsOptional, "bodyMeasurementsOptional", { required: false, max: 2000 }),
    visualScanOptional: asString(payload.visualScanOptional, "visualScanOptional", { required: false, max: 2000 }),
    nextWeekFocus: asString(payload.nextWeekFocus, "nextWeekFocus", { required: false, max: 500 }),
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
  validateFormFindings,
  validateWeeklyCheckIn,
  validateVisualProgressScan
};