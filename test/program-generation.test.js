"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {generateProgram,GENERATOR_VERSION}=require("../src/services/programGenerationEngine");
const {createUserStore}=require("../src/repositories/userStore");
const {createJourneyIntakeService}=require("../src/services/journeyIntakeService");

const profile=(pathways,overrides={})=>({version:1,pathways,goals:["general fitness"],experienceLevel:"beginner",rugbyEnabled:false,equipmentAvailability:{gymAccess:"no",equipment:["bodyweight"]},trainingAvailability:{sessionsPerWeek:3,sessionLengthMinutes:45},healthReviewRequired:false,...overrides});

test("generates deterministic programs for every supported pathway",()=>{
  const cases=[["general_fitness"],["yoga_wellness"],["athlete_performance"],["general_fitness","yoga_wellness"],["general_fitness","athlete_performance"],["yoga_wellness","athlete_performance"]];
  const expected=["general_fitness","yoga","athlete_performance","general_fitness_yoga","general_fitness_athlete","yoga_athlete"];
  cases.forEach((pathways,index)=>{const input=profile(pathways);const first=generateProgram(input);assert.deepEqual(first,generateProgram(input));assert.equal(first.recommendedProgram.pathway,expected[index]);});
  assert.equal(generateProgram(profile(["athlete_performance"],{rugbyEnabled:true})).recommendedProgram.pathway,"athlete_rugby");
});

test("never selects unavailable equipment and supports bodyweight, bands, dumbbells, barbell, and gym access",()=>{
  for(const available of [["bodyweight"],["bands"],["dumbbells"],["barbell"]]) {
    const result=generateProgram(profile(["general_fitness"],{equipmentAvailability:{gymAccess:"no",equipment:available}}));
    const allowed=new Set(["bodyweight",...result.recommendedProgram.equipment]);
    result.recommendedProgram.sessions.flatMap(session=>session.exercises).forEach(item=>assert.ok(allowed.has(item.equipment),item.equipment));
  }
  const gym=generateProgram(profile(["general_fitness"],{equipmentAvailability:{gymAccess:"yes",equipment:[]}}));
  assert.ok(gym.recommendedProgram.equipment.includes("machines"));
});

test("respects two through six training days and available session duration",()=>{
  for(let days=2;days<=6;days++){const result=generateProgram(profile(["general_fitness"],{trainingAvailability:{sessionsPerWeek:days,sessionLengthMinutes:30+days}}));assert.equal(result.recommendedFrequency,days);assert.equal(result.recommendedProgram.sessions.length,days);assert.equal(result.recommendedSessionLength,30+days);}
});

test("scales volume and progression across experience levels",()=>{
  const beginner=generateProgram(profile(["general_fitness"],{experienceLevel:"beginner"}));
  const intermediate=generateProgram(profile(["general_fitness"],{experienceLevel:"intermediate"}));
  const advanced=generateProgram(profile(["general_fitness"],{experienceLevel:"advanced"}));
  assert.notEqual(beginner.recommendedProgram.volume,intermediate.recommendedProgram.volume);
  assert.notEqual(intermediate.recommendedProgram.volume,advanced.recommendedProgram.volume);
  assert.notEqual(beginner.recommendedProgression,advanced.recommendedProgression);
  assert.ok(advanced.recommendedRecovery.restDaysPerWeek<=beginner.recommendedRecovery.restDaysPerWeek);
});

test("goals influence conditioning, mobility, strength, performance, and recovery",()=>{
  const result=generateProgram(profile(["general_fitness","athlete_performance"],{goals:["Weight loss","Muscle gain","Strength","Mobility","Performance","Recovery"]}));
  assert.deepEqual(result.recommendedProgram.goalEmphasis,{conditioning:true,mobility:true,strength:true,performance:true});
  assert.ok(result.recommendedRecovery.focus.includes("active_recovery"));
});

test("health review emits only a limited, review-gated recommendation",()=>{
  const result=generateProgram(profile(["athlete_performance"],{healthReviewRequired:true,trainingAvailability:{sessionsPerWeek:6,sessionLengthMinutes:90}}));
  assert.equal(result.recommendedProgram.unrestricted,false);assert.equal(result.recommendedFrequency,1);assert.equal(result.recommendedSessionLength,20);assert.equal(result.recommendedPhase,"health_review_limited_start");assert.match(result.recommendedProgression,/health review/i);
});

test("submission persists recommendation metadata without replacing an assigned program",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"program-generation-")),store=createUserStore({userDir:dir}),service=createJourneyIntakeService({userStore:store});
  store.updateUser("member",user=>{user.program={programId:"assigned_1",title:"Coach Program"};return user;});
  service.patch("member",{pathwaySelection:{selected:["general_fitness"],primary:"general_fitness"},identity:{fullName:"Alex Adult",phone:"555",cityState:"Austin",preferredCommunication:"text",emergencyContactName:"Sam",emergencyContactPhone:"556"},profile:{dateOfBirth:"1990-01-01",heightCm:175},goals:{primaryGoal:"Strength",successDefinition:"Consistent training"},healthSafety:{receivingTreatmentOrRehab:false,believesExerciseIsSafe:"yes",medicalDisclaimerConsent:true},trainingContext:{activeDaysPerWeek:"3",selfRatedFitnessLevel:"beginner",availableEquipment:["bands"]},schedule:{availableDays:["monday"],availableTimes:["morning"],realisticSessionsPerWeek:"3",preferredSessionMinutes:40},generalFitness:{weightChangeGoal:"build_strength"}});
  const result=service.submit("member"),saved=store.loadUser("member");
  assert.deepEqual(saved.program,{programId:"assigned_1",title:"Coach Program"});
  assert.deepEqual(Object.keys(saved.programRecommendation),["recommendedProgram","generatedAt","generatorVersion","journeyProfileVersion"]);
  assert.equal(saved.programRecommendation.generatorVersion,GENERATOR_VERSION);assert.deepEqual(result.programRecommendation,saved.programRecommendation);
});

test("legacy profiles with missing schedule and equipment remain compatible",()=>{
  const result=generateProgram({pathways:["general_fitness"],goals:[],equipmentAvailability:{equipment:[]},trainingAvailability:{}});
  assert.equal(result.recommendedFrequency,3);assert.deepEqual(result.recommendedProgram.equipment,["bodyweight"]);
});
