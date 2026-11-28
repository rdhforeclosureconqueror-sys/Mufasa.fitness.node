'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {selectExercises}=require('../src/program-engine/exerciseSelector');
const {exerciseService}=require('../src/exercise-intelligence');
const {EXERCISES}=require('../src/program-engine/programTemplates');
test('canonical catalog exceeds hardcoded choices and supplies alternatives',()=>{const ids=Object.values(EXERCISES).flat().map(x=>x.id);assert.ok(exerciseService.list().length>800);const result=selectExercises({equipment:['bodyweight','barbell','dumbbell','band','machine','cable','kettlebell'],experienceLevel:'advanced',limitations:ids});assert.ok(result.length);assert.ok(result.every(e=>!ids.includes(e.exerciseId)));});
test('bodyweight selection respects blocked patterns and exercise IDs',()=>{const result=selectExercises({equipment:[],experienceLevel:'beginner',limitations:['squat','horizontal_push','dead_bug']});assert.ok(result.length);assert.ok(result.every(e=>e.equipment==='bodyweight'&&e.difficulty===1&&!['squat','push'].includes(e.movementPattern)&&e.exerciseId!=='dead_bug'));});
test('all blocked patterns require review instead of unsafe fallback',()=>assert.throws(()=>selectExercises({equipment:[],experienceLevel:'beginner',limitations:['squat','hinge','push','pull','core']}),/No compatible exercise/));
