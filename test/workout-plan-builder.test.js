"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { templates } = require("../src/workouts/workoutTemplates");
const { exercises } = require("../src/workouts/exerciseCatalog");
const { buildWorkoutPlan } = require("../src/workouts/workoutPlanBuilder");
const { createUserStore } = require("../src/repositories/userStore");
const { createJourneyIntakeService } = require("../src/services/journeyIntakeService");

const profile = (pathway, overrides = {}) => ({ pathways:["general_fitness"], experienceLevel:"advanced", goals:["strength"], healthReviewRequired:false, equipmentAvailability:{ equipment:["barbell"], gymAccess:"no" }, trainingAvailability:{ sessionsPerWeek:3, sessionLengthMinutes:45, days:["monday", "wednesday", "friday"] }, ...overrides, recommendedProgram:{ pathway, unrestricted:true, ...overrides.recommendedProgram }, recommendedFrequency:overrides.recommendedFrequency || 3, recommendedSessionLength:overrides.recommendedSessionLength || 45 });

test("defines complete reusable templates for every base and hybrid pathway", () => {
  assert.deepEqual(Object.keys(templates), ["general_fitness", "yoga", "athlete_performance", "general_fitness_yoga", "general_fitness_athlete", "yoga_athlete", "athlete_rugby"]);
  Object.values(templates).forEach(template => { assert.ok(template.trainingDays.length); assert.ok(template.progressionRules.beginner); template.trainingDays.forEach(day => { assert.ok(day.categories.length); assert.ok(day.sets.beginner); assert.ok(day.reps); assert.ok(day.restSeconds); }); });
});

test("exercise catalog is normalized, complete, and duplicate-free", () => {
  assert.equal(new Set(exercises.map(item => item.id)).size, exercises.length);
  for (const item of exercises) for (const key of ["id", "displayName", "movementPattern", "equipment", "difficulty", "primaryMuscles", "secondaryMuscles", "pathwayCompatibility", "goalCompatibility", "safeProgressionOptions"]) assert.ok(Object.hasOwn(item, key), `${item.id}.${key}`);
});

test("builds deterministic plans for every pathway and hybrid", () => {
  for (const pathway of Object.keys(templates)) { const input=profile(pathway); const first=buildWorkoutPlan(input,input); assert.deepEqual(first,buildWorkoutPlan(input,input)); assert.equal(first.pathway,pathway); assert.equal(first.sessions.length,3); assert.equal(first.sessions[0].day,"monday"); assert.ok(first.sessions[0].exercises.every(x => x.exerciseId && x.sets && x.reps && x.restSeconds && x.notes)); }
});

test("deterministically substitutes squat equipment from barbell to dumbbell to bodyweight", () => {
  const selected = equipment => { const input=profile("general_fitness",{equipmentAvailability:{equipment,gymAccess:"no"}}); return buildWorkoutPlan(input,input).sessions[0].exercises[0].exerciseId; };
  assert.equal(selected(["barbell"]),"barbell_squat");
  assert.equal(selected(["dumbbells"]),"goblet_squat");
  assert.equal(selected([]),"bodyweight_squat");
});

test("experience scales sets and goals remain accepted deterministically", () => {
  const sets = level => { const input=profile("general_fitness",{experienceLevel:level,goals:[level === "beginner" ? "weight loss" : "strength"]}); return buildWorkoutPlan(input,input).sessions[0].exercises[0].sets; };
  assert.deepEqual([sets("beginner"),sets("intermediate"),sets("advanced")],[2,3,4]);
});

test("health review produces only a restricted starter session", () => {
  const input=profile("athlete_rugby",{healthReviewRequired:true,recommendedProgram:{pathway:"athlete_rugby",unrestricted:false},recommendedFrequency:6});
  const plan=buildWorkoutPlan(input,input); assert.equal(plan.status,"health_review_restricted"); assert.equal(plan.sessions.length,1); assert.deepEqual(plan.sessions[0].exercises.map(x=>x.exerciseId),["breathing_reset","supported_relaxation"]); assert.match(plan.sessions[0].notes,/No progression/);
});

test("legacy profiles default schedule, equipment, and experience safely", () => {
  const input={recommendedProgram:{pathway:"general_fitness",unrestricted:true}}; const plan=buildWorkoutPlan(input,input); assert.equal(plan.sessions.length,3); assert.equal(plan.experience,"beginner"); assert.equal(plan.sessions[0].exercises[0].exerciseId,"bodyweight_squat");
});

test("submission persists recommendations separately and protects assigned coach program", () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"workout-plan-")); const store=createUserStore({userDir:dir}); const service=createJourneyIntakeService({userStore:store});
  store.updateUser("member", user => { user.program={programId:"coach_1",title:"Assigned"}; return user; });
  service.patch("member",{pathwaySelection:{selected:["general_fitness"],primary:"general_fitness"},identity:{fullName:"Alex",phone:"555",cityState:"Austin",preferredCommunication:"text",emergencyContactName:"Sam",emergencyContactPhone:"556"},profile:{dateOfBirth:"1990-01-01",heightCm:175},goals:{primaryGoal:"Strength",successDefinition:"Consistency"},healthSafety:{receivingTreatmentOrRehab:false,believesExerciseIsSafe:"yes",medicalDisclaimerConsent:true},trainingContext:{activeDaysPerWeek:"3",selfRatedFitnessLevel:"beginner",availableEquipment:[]},schedule:{availableDays:["monday"],availableTimes:["morning"],realisticSessionsPerWeek:"3",preferredSessionMinutes:40},generalFitness:{weightChangeGoal:"build_strength"}});
  const result=service.submit("member"), saved=store.loadUser("member"); assert.deepEqual(saved.program,{programId:"coach_1",title:"Assigned"}); assert.equal(saved.generatedWorkoutPlan.recommendationOnly,true); assert.deepEqual(result.generatedWorkoutPlan,saved.generatedWorkoutPlan); assert.notEqual(saved.generatedWorkoutPlan,saved.program);
});
