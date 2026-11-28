'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAthleteReviewService}=require('../src/rugby/athleteReviewService');
const {createAuthorizationResolver,parseAuthorizationConfig}=require('../src/lib/authorization');
const {installRugbyAthleteReviewRoutes}=require('../src/routes/rugbyAthleteReviewRoutes');
const now='2026-11-28T12:00:00.000Z';
const admin={userId:'admin',email:'admin@example.test',providerVerified:true,provider:'firebase'};
function fixture(){
 const event={eventId:'e1',athleteId:'a',eventType:'assessment_recorded',sourceRef:'assessment:m1',occurredAt:'2026-11-27T00:00:00.000Z',recordedAt:'2026-11-27T12:00:00.000Z',verificationStatus:'unverified'};
 const users=[{userId:'a',name:'Athlete A',email:'private@example.test',rugbyProfile:{club:'Quins',position:'wing'},rugbyAssessments:[{id:'m1',type:'sprint_10m',value:2,date:'2026-11-27'},{id:'legacy',type:'sprint_20m',value:3,date:'2026-11-27'}],rugbyEvidence:[event]},{userId:'b',rugbyCheckins:[{date:'2026-11-28',readiness:'pain',teamHighLoad:false,injuryConcern:true}]},{userId:'unrelated',email:'do-not-expose@example.test'}];
 let reads=0;
 const service=createAthleteReviewService({userStore:{listUsers(){reads++;return structuredClone(users);}},authorizationResolver:createAuthorizationResolver(parseAuthorizationConfig({ADMIN_EMAILS:admin.email})),now:()=>now});
 return {service,users,get reads(){return reads;}};
}
test('verified admins review saved, linked measurements without exposing unrelated user fields',()=>{
 const {service}=fixture();const list=service.list(admin);
 assert.deepEqual(list,[{athleteId:'a',name:'Athlete A'},{athleteId:'b',name:'b'}]);
 const result=service.read(admin,'a','BM-03');
 assert.equal(result.assessments[0].measurement.value,2);
 assert.equal(result.assessments[0].review,'unverified');
 assert.equal(result.legacyAssessmentCount,1);
 assert.equal(result.criteria.id,'BM-03');assert.equal(result.criteria.approved,false);
 assert.equal(result.reviewActive,true);assert.equal(result.stageChangeAuthorized,false);
 assert.equal(result.assignedStage,null);assert.equal(JSON.stringify(result).includes('private@example.test'),false);
 assert.equal(result.readiness.status,'HOLD');
});
test('members, role spoofing, trainers and pilot or unverified sessions cannot read athlete records',()=>{
 const f=fixture();
 for(const auth of [null,{userId:'member',role:'admin',providerVerified:true},{...admin,providerVerified:false},{...admin,provider:'pilot_bypass'},{...admin,identityClass:'pilot_bypass'},{userId:'trainer',providerVerified:true}]){
  assert.throws(()=>f.service.list(auth),/Admin required/);assert.throws(()=>f.service.read(auth,'a','BM-01'),/Admin required/);
 }
 assert.equal(f.reads,0);
});
test('stored pain is referred; an absent check-in remains unknown rather than a clinical referral',()=>{
 const {service}=fixture();assert.equal(service.read(admin,'b','BM-01').readiness.status,'REFER');
 assert.equal(service.read(admin,'a','BM-01').readiness.reason,'missing_history');
});
test('confirmed assessments require an independent assessor and a linked review',()=>{
 const f=fixture();const event=f.users[0].rugbyEvidence[0];
 f.users[0].rugbyEvidence.push({...event,eventId:'r1',eventType:'coach_reviewed',sourceRef:'evidence:e1',verificationStatus:'coach_reviewed',assessorId:'a',finding:'confirmed'});
 assert.equal(f.service.read(admin,'a','BM-01').assessments[0].review,'unverified');
 f.users[0].rugbyEvidence[1].assessorId='coach';
 assert.equal(f.service.read(admin,'a','BM-01').assessments[0].review,'confirmed');
});
test('malformed, future, duplicate and cross-athlete history fail closed',()=>{
 for(const patch of [{athleteId:'b'},{eventId:''},{recordedAt:'2099-01-01T00:00:00.000Z'},{occurredAt:'invalid'}]){
  const f=fixture();Object.assign(f.users[0].rugbyEvidence[0],patch);assert.throws(()=>f.service.read(admin,'a','BM-01'));
 }
 const f=fixture();f.users[0].rugbyEvidence.push({...f.users[0].rugbyEvidence[0]});assert.throws(()=>f.service.read(admin,'a','BM-01'));
});
test('superseded measurements are excluded and invalid targets cannot create an athlete',()=>{
 const f=fixture(),event=f.users[0].rugbyEvidence[0];f.users[0].rugbyEvidence.push({...event,eventId:'e2',supersedes:'e1'});
 assert.deepEqual(f.service.read(admin,'a','BM-01').assessments.map(item=>item.eventId),['e2']);
 assert.throws(()=>f.service.read(admin,'unrelated','BM-01'),/Athlete unavailable/);
 assert.throws(()=>f.service.read(admin,'a','BM-99'),/Invalid review selection/);
});
test('broken measurement links are visible but never eligible measurements',()=>{
 const f=fixture();f.users[0].rugbyAssessments[0].value='2';
 assert.equal(f.service.read(admin,'a','BM-01').assessments[0].measurement,null);
});
test('routes require authentication, keep responses private and hide internal failures',()=>{
 const {service}=fixture(),routes={},auth=()=>{};
 installRugbyAthleteReviewRoutes({app:{get(path,middleware,handler){assert.equal(middleware,auth);routes[path]=handler;}},requireAuth:auth,service});
 function call(path,req){const res={code:200,set(k,v){this[k]=v;},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};routes[path](req,res);return res;}
 const route='/api/admin/rugby/athlete-reviews/:athleteId';
 let res=call(route,{auth:admin,params:{athleteId:'a'},query:{stageId:'BM-01',eligibility:'ELIGIBLE_FOR_COACH_REVIEW'}});
 assert.equal(res.code,200);assert.equal(res['Cache-Control'],'private, no-store');assert.equal(res.body.data.readiness.status,'HOLD');
 assert.equal(call(route,{auth:null,params:{},query:{}}).code,403);
 assert.equal(call(route,{auth:admin,params:{athleteId:'missing'},query:{stageId:'BM-01'}}).code,404);
 assert.equal(call(route,{auth:admin,params:{athleteId:'a'},query:{}}).code,400);
});
