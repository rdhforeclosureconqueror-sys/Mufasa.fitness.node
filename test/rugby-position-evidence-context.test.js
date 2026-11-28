'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPositionEvidenceContext:build}=require('../src/rugby/positionEvidenceContext');
const p={domain:'acceleration',evidenceIds:['e']},e=[{id:'e',protocol:{id:'sprint_10m'},context:{position:11}}];
test('all XV positions retain their own role and canonical assessment context',()=>{for(let n=1;n<=15;n++){const r=build({primary:n},p,e);assert.equal(r.roles[0].number,n);assert.ok(r.roles[0].domainAssessmentIds.includes('acceleration_10m'));assert.equal(r.roles[0].evidence[0].positionContextMatch,n===11);assert.equal(r.trainingAuthorized,false);}});
test('unknown positions and unknown protocols do not invent context',()=>{assert.deepEqual(build(null,p,e).roles,[]);const r=build({primary:11,secondary:14},p,[{id:'e',protocol:{id:'custom'}}]);assert.equal(r.roles.length,2);assert.equal(r.roles[0].evidence[0].assessmentId,null);assert.equal(r.automaticWeighting,false);});

test('missing current evidence is explicit and position provenance is preserved',()=>{const r=build({primary:11,source:'athlete_self_report',recordedAt:'2026-11-28'},p,[]);assert.deepEqual(r.missingEvidenceIds,['e']);assert.equal(r.positionSource,'athlete_self_report');assert.equal(r.positionRecordedAt,'2026-11-28');assert.deepEqual(r.roles[0].evidence,[]);});
