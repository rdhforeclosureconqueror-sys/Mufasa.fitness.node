"use strict";

const SOUND_ASSESSMENT_CONTRACT = Object.freeze({
  feature: "sound_assessment",
  architectureVersion: "1.0.0",
  scoringVersion: "0.1.0-phase0",
  recipeVersion: "0.1.0-phase0",
  modes: Object.freeze({
    quick: Object.freeze({ questionCount: 10 }),
    deep: Object.freeze({ questionCount: 25 }),
  }),
  dimensions: Object.freeze(["GR", "EF", "AG", "CO", "EX", "CL", "SP"]),
  moderator: "AR",
  diagnosticStages: Object.freeze([
    "BOOT", "BANK_LOAD", "BANK_SCHEMA", "QUESTION_RENDER", "ANSWER_CAPTURE",
    "SCORE_RAW", "MAX_OPPORTUNITY", "NORMALIZE", "CONSISTENCY", "ACTIVATION",
    "PROFILE", "PAIR_LIBRARY", "RECIPE", "RESULT_RENDER", "PERSISTENCE", "DEEP_HANDOFF",
  ]),
});

function parseBooleanFlag(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function isSoundAssessmentEnabled(env = process.env) {
  return parseBooleanFlag(env.SOUND_ASSESSMENT_ENABLED);
}

function soundAssessmentBootDiagnostic(env = process.env) {
  const enabled = isSoundAssessmentEnabled(env);
  return Object.freeze({
    STATUS: "PASS",
    FIRST_FAILURE: "NONE",
    STAGE: "BOOT",
    DETAIL: enabled
      ? "Sound Assessment contract loaded; feature flag enabled."
      : "Sound Assessment contract loaded; feature flag disabled (safe default).",
    feature: SOUND_ASSESSMENT_CONTRACT.feature,
    architectureVersion: SOUND_ASSESSMENT_CONTRACT.architectureVersion,
    scoringVersion: SOUND_ASSESSMENT_CONTRACT.scoringVersion,
    recipeVersion: SOUND_ASSESSMENT_CONTRACT.recipeVersion,
    enabled,
  });
}

module.exports = {
  SOUND_ASSESSMENT_CONTRACT,
  isSoundAssessmentEnabled,
  soundAssessmentBootDiagnostic,
};
