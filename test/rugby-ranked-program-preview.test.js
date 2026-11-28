'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {selectExercises}=require('../src/program-engine/exerciseSelector');
const {generateProgram}=require('../src/program-engine/programGenerator');
const input={goal:'general_fitness',experienceLevel:'advanced',trainingDays:2,durationWeeks:4,sessionDuration:30,availableDays:[1,3],equipment:['bodyweight','barbell','dumbbell'],limitations:[],startDate:'2026-11-28'};
test('ranked compatible exercise takes precedence over template preference',()=>{const base=selectExercises(input);const ranked=selectExercises(input,['bodyweight_squat']);assert.equal(ranked.find(e=>e.movementPattern==='squat').exerciseId,'bodyweight_squat');assert.equal(ranked.length,base.length);});
test('rank cannot override constraints',()=>{const result=selectExercises({...input,limitations:['bodyweight_squat','hinge']},['bodyweight_squat','barbell_deadlift']);assert.ok(result.every(e=>e.exerciseId!=='bodyweight_squat'&&e.movementPattern!=='hinge'));});
test('ranked program retains schedule and distinct identity when selection changes',()=>{const a=generateProgram(input),b=generateProgram(input,[],{rankedIds:['bodyweight_squat']});assert.equal(b.microcycles.length,a.microcycles.length);assert.notEqual(b.programId,a.programId);assert.equal(generateProgram(input,[],{rankedIds:['bodyweight_squat']}).programId,b.programId);});
