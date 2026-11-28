'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reviewExerciseVariations:review}=require('../src/rugby/exerciseVariationReview');
const input={equipment:['dumbbell','barbell'],experienceLevel:'advanced',limitations:[],goal:'strength'};
test('documented relationships remain distinct from alternatives and do not authorize progression',()=>{const r=review(['goblet_squat','goblet_squat'],input);assert.equal(r.rows.length,1);assert.ok(r.rows[0].relationships.some(x=>x.direction==='regression'&&x.exerciseId==='bodyweight_squat'));assert.ok(r.rows[0].relationships.some(x=>x.direction==='progression'&&x.competencyVerified===false));assert.equal(r.automaticProgression,false);assert.equal(r.trainingAuthorized,false);});
test('limitations block related variations and alternatives',()=>{const r=review(['goblet_squat'],{...input,limitations:['squat']});assert.ok(r.rows[0].relationships.every(x=>!x.compatible));assert.deepEqual(r.rows[0].alternatives,[]);});
test('unknown identity does not invent a relationship',()=>{assert.equal(review(['unknown'],input).rows[0].status,'unknown_catalog_identity');});
