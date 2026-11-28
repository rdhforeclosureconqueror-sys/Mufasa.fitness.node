'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rankRugbyExercises:rank}=require('../src/rugby/exerciseRelevance');
const p={domain:'acceleration',priorityType:'physical_capacity',evidenceIds:['e']};
const input={equipment:['barbell','dumbbell'],experienceLevel:'advanced',limitations:[]};
test('ranks existing catalog with explainable evidence context',()=>{const r=rank(p,input);assert.ok(r.candidateCount>0);assert.ok(r.candidates.some(e=>e.relevance==='menu_candidate'));assert.deepEqual(r.evidenceIds,['e']);assert.equal(r.trainingAuthorized,false);assert.ok(r.candidates.every(e=>e.rugbyApplication));});
test('respects equipment and movement restrictions',()=>{const r=rank(p,{equipment:[],experienceLevel:'beginner',limitations:['squat','hinge','lunge']});assert.ok(r.candidates.every(e=>!['squat','hinge','lunge'].includes(e.movementPattern)));});
test('technical and unresolved priorities do not infer gym prescriptions',()=>{for(const q of [{...p,priorityType:'needs_more_evidence'},{...p,domain:'attack_iq',priorityType:'decision_quality'}]){const r=rank(q,input);assert.deepEqual(r.candidates,[]);assert.equal(r.fieldOrFurtherReviewRequired,true);}});
