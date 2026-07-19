"use strict";

const { ApiError } = require("../lib/apiResponse");

const PATHWAYS = ["general_fitness", "yoga_wellness", "athlete_performance"];
const STEPS = ["pathway_selection", "identity_profile", "goals", "health_safety", "training_context", "schedule", "pathway_details", "final_review"];
const SECTIONS = ["identity", "profile", "pathwaySelection", "goals", "healthSafety", "trainingContext", "schedule", "athletePerformance", "rugbySupplement", "generalFitness", "yogaWellness"];

function fail(field, message) { throw new ApiError("VALIDATION_ERROR", `${field}: ${message}`, 400, { field }); }
function object(v, field) { if (!v || typeof v !== "object" || Array.isArray(v)) fail(field, "must be an object"); return v; }
function string(v, field, max = 1000) {
  if (v == null || v === "") return null;
  if (typeof v !== "string") fail(field, "must be a string");
  const out = v.trim();
  if (out.length > max) fail(field, `must be at most ${max} characters`);
  return out || null;
}
function boolean(v, field) { if (v == null) return null; if (typeof v !== "boolean") fail(field, "must be a boolean"); return v; }
function number(v, field, min, max) { if (v == null || v === "") return null; const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) fail(field, `must be between ${min} and ${max}`); return n; }
function date(v, field) { const s = string(v, field, 10); if (s == null) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`)) || new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) !== s) fail(field, "must be a valid YYYY-MM-DD date"); return s; }
function array(v, field, max = 20, itemMax = 200) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > max) fail(field, `must be an array with at most ${max} items`);
  return v.map((x, i) => { const s = string(x, `${field}[${i}]`, itemMax); if (!s) fail(`${field}[${i}]`, "must not be empty"); return s; });
}
function unique(v, field, max, itemMax) { const out = array(v, field, max, itemMax); if (new Set(out).size !== out.length) fail(field, "must contain unique values"); return out; }

const schema = {
  identity: { fullName:[string,120], preferredName:[string,120], phone:[string,40], cityState:[string,160], preferredCommunication:[string,60], emergencyContactName:[string,120], emergencyContactPhone:[string,40] },
  profile: { dateOfBirth:[date], genderIdentity:[string,80], genderSelfDescription:[string,200], heightCm:[number,50,300], weightKg:[number,20,450] },
  goals: { primaryGoal:[string,160], secondaryGoals:[array,3,160], successDefinition:[string,1000], importantDate:[date] },
  healthSafety: { currentPainOrInjury:[string,1200], receivingTreatmentOrRehab:[boolean], instructedToAvoidStrenuousExercise:[string,1200], concussionHistory:[string,1200], conditions:[array,20,160], details:[string,2000], believesExerciseIsSafe:[string,40], coachNotesBeforeTesting:[string,1200], medicalDisclaimerConsent:[boolean] },
  trainingContext: { activeDaysPerWeek:[string,40], currentTrainingTypes:[array,20,120], selfRatedFitnessLevel:[string,80], gymAccess:[string,80], fieldTrackAccess:[string,80], availableEquipment:[array,40,120] },
  schedule: { preferredStartDate:[date], availableDays:[array,7,20], availableTimes:[array,10,80], realisticSessionsPerWeek:[string,40], preferredSessionMinutes:[number,15,180], limitations:[string,1000] },
  athletePerformance: { enabled:[boolean], sport:[string,80], sportOther:[string,120], currentLevel:[string,120], performancePriorities:[array,3,160], currentTeamOrClub:[string,200] },
  rugbySupplement: { enabled:[boolean], experienceYears:[string,40], formats:[array,2,40], clubStatus:[string,100], currentOrProspectiveClub:[string,200], playingStatus:[string,100], primaryPosition:[string,100], secondaryPosition:[string,100], highestLevelPlayed:[string,160], previousTeams:[string,1000], performanceLimiters:[string,1200], previousTestResults:[string,1200], preferredCoachingStyle:[string,500], additionalContext:[string,1500] },
  generalFitness: { enabled:[boolean], weightChangeGoal:[string,120], desiredWeightChange:[number,-300,300], motivation:[string,1000] },
  yogaWellness: { enabled:[boolean], experienceLevel:[string,100], primaryIntentions:[array,10,120], preferredPracticeTypes:[array,10,120], mobilityLimitations:[string,1200] }
};

function validateSection(name, value) {
  const input = object(value, name); const allowed = schema[name]; const out = {};
  for (const key of Object.keys(input)) {
    if (!(key in allowed)) fail(`${name}.${key}`, "is not supported");
    const [fn, ...args] = allowed[key]; out[key] = fn(input[key], `${name}.${key}`, ...args);
  }
  return out;
}

function validateJourneyPatch(input) {
  const payload = object(input, "Request body"); const out = {};
  for (const key of Object.keys(payload)) {
    if (key === "currentStep") {
      out.currentStep = string(payload[key], key, 80);
      if (!STEPS.includes(out.currentStep)) fail(key, "must be a supported intake step");
    }
    else if (key === "pathwaySelection") {
      const p = object(payload[key], key); const selected = unique(p.selected, "pathwaySelection.selected", 2, 40);
      if (selected.length === 0) fail("pathwaySelection.selected", "must select one or two pathways");
      if (selected.some(x => !PATHWAYS.includes(x))) fail("pathwaySelection.selected", "contains an unknown pathway");
      const primary = string(p.primary, "pathwaySelection.primary", 40);
      if (primary && !selected.includes(primary)) fail("pathwaySelection.primary", "must be selected");
      out.pathwaySelection = { selected, primary };
    } else if (SECTIONS.includes(key)) out[key] = validateSection(key, payload[key]);
    else fail(key, "is not writable");
  }
  return out;
}

function validatePathwayConsistency(record) {
  const selected = record.pathwaySelection.selected;
  const checks = [["generalFitness","general_fitness"],["yogaWellness","yoga_wellness"],["athletePerformance","athlete_performance"]];
  for (const [section, pathway] of checks) if (record[section].enabled !== selected.includes(pathway)) fail(`${section}.enabled`, `must match ${pathway} selection`);
  if (record.rugbySupplement.enabled && (!selected.includes("athlete_performance") || String(record.athletePerformance.sport).toLowerCase() !== "rugby")) fail("rugbySupplement.enabled", "requires Athlete Performance with Rugby selected");
}

module.exports = { PATHWAYS, validateJourneyPatch, validatePathwayConsistency };
