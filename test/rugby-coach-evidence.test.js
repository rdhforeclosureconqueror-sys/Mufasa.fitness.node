'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createCoachEvidenceService}=require('../src/rugby/coachEvidenceService');
const {createAuthorizationResolver}=require('../src/lib/authorization');
const {appendSelfReport}=require('../src/rugby/athleteEvidence');
const at='2026-11-25T00:00:00.000Z';
function fixture(){
 const users={a:{rugbyAssessments:[{id:'m'}],rugbyEvidence:appendSelfReport([],{eventType:'assessment_recorded',occurredAt:at,sourceRef:'assessment:m'},'a',at,'e')}};
 let active=true;
 const service=createCoachEvidenceService({now:()=>at,authorizationResolver:createAuthorizationResolver({adminEmails:[],bootstrap:{superAdminUserIds:[],superAdminSubjects:[]},roleAssignments:{adminUserIds:['admin'],adminSubjects:[],trainerUserIds:['coach','other','a'],trainerSubjects:[]}}),assignmentStore:{hasActiveAccess:(actor,id)=>active&&actor==='coach'&&id==='a'},userStore:{updateUser:(id,fn)=>{users[id]=fn(structuredClone(users[id]));}}});
 return {users,review:(actor='coach',input={eventId:'e',finding:'confirmed'},id='a')=>service.review({userId:actor},id,input),revoke:()=>{active=false;}};
}
test('assigned coach appends review without changing original',()=>{const f=fixture(),before=structuredClone(f.users.a.rugbyEvidence[0]),r=f.review();assert.equal(r.assessorId,'coach');assert.equal(r.finding,'confirmed');assert.equal(r.verificationStatus,'coach_reviewed');assert.deepEqual(f.users.a.rugbyEvidence[0],before);assert.equal(f.users.a.rugbyEvidence.length,2);});
for(const actor of ['other','admin','member','a'])test('deny '+actor,()=>{const f=fixture();assert.throws(()=>f.review(actor),/Access denied/);assert.equal(f.users.a.rugbyEvidence.length,1);});
test('revoked assignment denied',()=>{const f=fixture();f.revoke();assert.throws(()=>f.review(),/Access denied/);});
test('duplicate review denied',()=>{const f=fixture();f.review();assert.throws(()=>f.review(),/Already reviewed/);});
test('forged assessor denied',()=>assert.throws(()=>fixture().review('coach',{eventId:'e',finding:'confirmed',assessorId:'other'})));
test('missing assessment denied',()=>{const f=fixture();f.users.a.rugbyAssessments=[];assert.throws(()=>f.review(),/Evidence unavailable/);});
test('negative finding preserved',()=>assert.equal(fixture().review('coach',{eventId:'e',finding:'not_confirmed'}).finding,'not_confirmed'));
