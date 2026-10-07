"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SOUND_ASSESSMENT_CONTRACT,
  isSoundAssessmentEnabled,
  soundAssessmentBootDiagnostic,
} = require("../src/sound-assessment/contract");

test("Phase 0 contract fixes Quick and Deep evidence depths", () => {
  assert.equal(SOUND_ASSESSMENT_CONTRACT.modes.quick.questionCount, 10);
  assert.equal(SOUND_ASSESSMENT_CONTRACT.modes.deep.questionCount, 25);
});

test("Phase 0 contract separates seven measured dimensions from AR moderator", () => {
  assert.deepEqual(SOUND_ASSESSMENT_CONTRACT.dimensions, ["GR", "EF", "AG", "CO", "EX", "CL", "SP"]);
  assert.equal(SOUND_ASSESSMENT_CONTRACT.moderator, "AR");
  assert.equal(SOUND_ASSESSMENT_CONTRACT.dimensions.includes("AR"), false);
});

test("feature flag fails safely to disabled", () => {
  assert.equal(isSoundAssessmentEnabled({}), false);
  assert.equal(isSoundAssessmentEnabled({ SOUND_ASSESSMENT_ENABLED: "false" }), false);
  assert.equal(isSoundAssessmentEnabled({ SOUND_ASSESSMENT_ENABLED: "1" }), false);
  assert.equal(isSoundAssessmentEnabled({ SOUND_ASSESSMENT_ENABLED: "true" }), true);
  assert.equal(isSoundAssessmentEnabled({ SOUND_ASSESSMENT_ENABLED: " TRUE " }), true);
});

test("BOOT diagnostic follows first-failure contract while disabled", () => {
  const result = soundAssessmentBootDiagnostic({});
  assert.equal(result.STATUS, "PASS");
  assert.equal(result.FIRST_FAILURE, "NONE");
  assert.equal(result.STAGE, "BOOT");
  assert.equal(result.enabled, false);
  assert.match(result.DETAIL, /disabled/);
});

test("BOOT diagnostic reports enabled state without changing contract", () => {
  const result = soundAssessmentBootDiagnostic({ SOUND_ASSESSMENT_ENABLED: "true" });
  assert.equal(result.STATUS, "PASS");
  assert.equal(result.FIRST_FAILURE, "NONE");
  assert.equal(result.STAGE, "BOOT");
  assert.equal(result.enabled, true);
  assert.equal(result.scoringVersion, SOUND_ASSESSMENT_CONTRACT.scoringVersion);
});

test("diagnostic stage order preserves the architecture first-failure pipeline", () => {
  assert.deepEqual(SOUND_ASSESSMENT_CONTRACT.diagnosticStages, [
    "BOOT", "BANK_LOAD", "BANK_SCHEMA", "QUESTION_RENDER", "ANSWER_CAPTURE",
    "SCORE_RAW", "MAX_OPPORTUNITY", "NORMALIZE", "CONSISTENCY", "ACTIVATION",
    "PROFILE", "PAIR_LIBRARY", "RECIPE", "RESULT_RENDER", "PERSISTENCE", "DEEP_HANDOFF",
  ]);
});
