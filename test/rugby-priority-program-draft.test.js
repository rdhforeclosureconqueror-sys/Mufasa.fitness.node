'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPriorityProgramDraft:build}=require('../src/rugby/priorityProgramDraft');
function fixture(){return {athleteId:'a',priorityId:'p',priorityView:{athlete:{athleteId:'a'},evidence:[{id:'e'}],priorities:[{id:'p',athleteId:'a',version:1,evidenceCurrent:true,currentReviewState:'working_priority',priorityType:'physical_capacity',evidenceIds:['e']}]},program:{schemaVersion:1,programId:'preview',microcycles:[{}]}}}
test('draft is deterministic, isolated and never authorizes assignment',()=>{const f=fixture(),d=build(f);assert.equal(d.fingerprint,build(f).fingerprint);assert.equal(d.assignmentAuthorized,false);assert.equal(d.trainingAuthorized,false);f.program.programId='changed';assert.equal(d.snapshot.program.programId,'preview');});
test('rejects cross athlete, stale or missing evidence and unresolved priority',()=>{for(const mutate of [f=>f.athleteId='b',f=>f.priorityView.priorities[0].evidenceCurrent=false,f=>f.priorityView.evidence=[],f=>f.priorityView.priorities[0].priorityType='needs_more_evidence',f=>f.program=null]){const f=fixture();mutate(f);assert.throws(()=>build(f));}});
