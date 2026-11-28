'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPriorityExerciseReview:build}=require('../src/rugby/priorityExerciseReview');
const {getExercise}=require('../src/exercise-intelligence/exerciseCatalog');
const e=getExercise('bodyweight_squat'),option={exerciseId:e.exerciseId,contentVersion:e.contentVersion,schemaVersion:e.schemaVersion};
const input={equipment:[],experienceLevel:'advanced',limitations:[]},program={microcycles:[{sessions:[{exercises:[{exerciseId:e.exerciseId}]}]}]};
test('pinned candidate is matched to generic preview without authorization',()=>{const r=build({domain:'movement',exerciseOptions:[option]},input,program);assert.equal(r.candidates[0].status,'candidate_only');assert.equal(r.candidates[0].scheduledInGenericPreview,true);assert.equal(r.trainingAuthorized,false);assert.equal(r.automaticDose,false);});
test('stale catalog and limitations require resolution',()=>{const r=build({domain:'movement',exerciseOptions:[{...option,contentVersion:'old'}]},{...input,limitations:['squat']},program);assert.deepEqual(r.candidates[0].reasons,['catalog_or_menu_review_required','reported_limitation']);});
test('technical domains retain field review without inventing exercise IDs',()=>{const r=build({domain:'reactive_agility',exerciseOptions:[]},input,program);assert.equal(r.fieldDrillReviewRequired,true);assert.deepEqual(r.candidates,[]);assert.ok(r.exerciseFamilies.length);});
