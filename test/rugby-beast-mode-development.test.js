'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {reviewDevelopmentCycle:r}=require('../src/rugby/beastModeDevelopmentReview');
const identity={athleteId:'a',stageId:'BM-03'};
const fixture=()=>({...identity,pain:false,clinicalConcern:false,baseline:{...identity,date:'2026-11-01',protocolId:'p'},retest:{...identity,date:'2026-11-10',protocolId:'p'},programme:{...identity,version:'v1',sessions:[{id:'s',date:'2026-11-05',status:'completed'}]},fieldObservations:[{...identity,date:'2026-11-09',context:'rugby_field',finding:'demonstrated'}]});
test('complete candidate never authorizes',()=>assert.equal(r(fixture()).stageChangeAuthorized,false));
test('missed training holds but permits retest',()=>{const x=fixture();x.programme.sessions[0].status='missed';assert.equal(r(x).status,'HOLD');assert.equal(r(x).retestAllowed,true);});
test('planned recovery not penalized',()=>{const x=fixture();x.programme.sessions.push({id:'rest',date:'2026-11-06',status:'planned_recovery'});assert.equal(r(x).reason,'candidate_cycle_complete_trusted_review_required');});
test('gym alone insufficient',()=>{const x=fixture();x.fieldObservations[0].context='gym';assert.equal(r(x).reason,'field_transfer_required');});
test('different test protocol denied',()=>{const x=fixture();x.retest.protocolId='q';assert.equal(r(x).reason,'comparable_baseline_retest_required');});
test('pain overrides cycle',()=>assert.equal(r({...fixture(),pain:true}).status,'REFER'));
test('cross athlete field evidence denied',()=>{const x=fixture();x.fieldObservations[0].athleteId='b';assert.equal(r(x).reason,'field_transfer_required');});
test('duplicate sessions denied',()=>{const x=fixture();x.programme.sessions.push(x.programme.sessions[0]);assert.equal(r(x).reason,'invalid_programme_evidence');});

test('missing cycle never permits retest',()=>{for(const x of [null,undefined,[],42,{}]){assert.equal(r(x).status,'HOLD_SAFETY');assert.equal(r(x).retestAllowed,false);}});

test('recovery alone cannot establish training consistency',()=>{const x=fixture();x.programme.sessions[0].status='planned_recovery';assert.equal(r(x).reason,'active_training_evidence_required');assert.equal(r(x).retestAllowed,true);});
