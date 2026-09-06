'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { createCoachContextService, compactJourneyProfile }=require('../src/ai/coachContextService');
const { deriveJourneyProfile }=require('../src/services/journeyRecommendationEngine');

function user(){return {
  userId:'member-a',
  profile:{name:'Alex'},
  clientIntake:{name:'Legacy Alex',phone:'555-SECRET',emergencyContact:'PRIVATE'},
  journeyProfile:{
    version:3,
    primaryPathway:'athlete_performance',
    pathways:['athlete_performance','rugby'],
    experienceLevel:'intermediate',
    rugbyEnabled:true,
    healthReviewRequired:false,
    trainingAvailability:{days:['mon','wed','fri'],times:['morning'],activeDaysPerWeek:4,sessionsPerWeek:3,sessionLengthMinutes:45},
    equipmentAvailability:{gymAccess:'full_gym',fieldTrackAccess:'track',equipment:['kettlebell','bands']},
    recommendations:{
      workouts:{category:'strength_conditioning'},
      assessments:{items:['movement_baseline']},
      nutrition:{items:['protein_consistency']},
      dashboard:{modules:['program','recovery']},
      reviewStatus:'not_required'
    }
  },
  workoutTracking:[{workoutId:'w1',completedAt:100,name:'Strength A',reps:24,formScore:88,status:'completed'}],
  goalsBaseline:{goal:'build_strength',baseline:{sessionsPerWeek:1}},
  checkIns:[{ts:99,energy:4,soreness:2,sleep:7,motivation:5}],
  sessions:{},yogaSessions:[]
};}

test('Phase C exposes bounded derived journey context alongside existing member facts',()=>{
  const service=createCoachContextService({userStore:{loadUser:()=>user()},clock:()=>0});
  const context=service.build('member-a');
  assert.equal(context.schemaVersion,2);
  assert.equal(context.member.displayName,'Alex');
  assert.equal(context.journey.authority,'derived_journey_profile');
  assert.equal(context.journey.primaryPathway,'athlete_performance');
  assert.deepEqual(context.journey.trainingAvailability.days,['mon','wed','fri']);
  assert.equal(context.journey.trainingAvailability.activeDaysPerWeek,4);
  assert.equal(context.journey.trainingAvailability.sessionMinutes,45);
  assert.equal(context.journey.equipmentAvailability.gymAccess,'full_gym');
  assert.equal(context.journey.equipmentAvailability.fieldTrackAccess,'track');
  assert.deepEqual(context.journey.equipmentAvailability.equipment,['kettlebell','bands']);
  assert.equal(context.journey.coachingRecommendations.workoutCategory,'strength_conditioning');
  assert.equal(context.journey.featureFlags.rugbyEnabled,true);
  assert.equal(context.workouts.recent[0].totalReps,24);
  assert.equal(context.goals.goal,'build_strength');
  assert.equal(context.recovery.energy,4);
});

test('Phase C matches the real canonical Journey Profile schema emitted by the recommendation engine',()=>{
  const canonical=deriveJourneyProfile({
    status:'submitted',
    pathwaySelection:{selected:['athlete_performance'],primary:'athlete_performance'},
    goals:{primaryGoal:'build strength'},
    athletePerformance:{sport:'rugby',currentLevel:'intermediate',performancePriorities:['strength']},
    trainingContext:{selfRatedFitnessLevel:'intermediate',gymAccess:'full_gym',fieldTrackAccess:'track',availableEquipment:['kettlebell'],activeDaysPerWeek:4},
    schedule:{realisticSessionsPerWeek:3,preferredSessionMinutes:50,availableDays:['mon','wed','fri'],availableTimes:['morning']},
    healthSafety:{healthFlags:[]}
  });
  const compact=compactJourneyProfile(canonical);
  assert.equal(compact.trainingAvailability.activeDaysPerWeek,4);
  assert.equal(compact.trainingAvailability.sessionsPerWeek,3);
  assert.equal(compact.trainingAvailability.sessionMinutes,50);
  assert.equal(compact.equipmentAvailability.gymAccess,'full_gym');
  assert.equal(compact.equipmentAvailability.fieldTrackAccess,'track');
  assert.deepEqual(compact.equipmentAvailability.equipment,['kettlebell']);
  assert.equal(compact.coachingRecommendations.workoutCategory,canonical.recommendations.workouts.category);
});

test('Phase C does not expose raw intake or arbitrary private fields',()=>{
  const context=createCoachContextService({userStore:{loadUser:()=>user()},clock:()=>0}).build('member-a');
  const serialized=JSON.stringify(context);
  assert.doesNotMatch(serialized,/555-SECRET/);
  assert.doesNotMatch(serialized,/emergencyContact/);
  assert.doesNotMatch(serialized,/clientIntake/);
  assert.equal(context.journey.privacyPolicy,'bounded_coaching_projection_no_raw_intake');
});

test('journey lists are capped to keep prompts bounded',()=>{
  const profile={pathways:Array.from({length:20},(_,i)=>`path-${i}`),trainingAvailability:{days:Array.from({length:20},(_,i)=>`day-${i}`),times:Array.from({length:20},(_,i)=>`time-${i}`)},equipmentAvailability:{equipment:Array.from({length:30},(_,i)=>`eq-${i}`)},recommendations:{assessments:{items:Array.from({length:20},(_,i)=>`a-${i}`)},nutrition:{items:Array.from({length:20},(_,i)=>`n-${i}`)},dashboard:{modules:Array.from({length:20},(_,i)=>`m-${i}`)},workouts:{category:'general'}}};
  const compact=compactJourneyProfile(profile);
  assert.equal(compact.pathways.length,6);
  assert.equal(compact.trainingAvailability.days.length,7);
  assert.equal(compact.trainingAvailability.times.length,6);
  assert.equal(compact.equipmentAvailability.equipment.length,12);
  assert.equal(compact.coachingRecommendations.assessments.length,6);
});

test('Phase C does not invent journey context when canonical derived profile is absent',()=>{
  const service=createCoachContextService({userStore:{loadUser:()=>({userId:'member-b',sessions:{},workoutTracking:[],yogaSessions:[]})},clock:()=>0});
  assert.equal(service.build('member-b').journey,null);
});
