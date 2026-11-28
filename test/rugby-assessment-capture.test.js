'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {createUserStore}=require('../src/repositories/userStore');
const {createAuthorizationResolver,parseAuthorizationConfig}=require('../src/lib/authorization');
const {createAssessmentCapture}=require('../src/rugby/assessmentCapture');
const {createAthleteReviewService}=require('../src/rugby/athleteReviewService');
const {installRugbyAssessmentCaptureRoutes}=require('../src/routes/rugbyAssessmentCaptureRoutes');
const admin={userId:'owner',email:'owner@example.test',provider:'firebase',providerVerified:true};
const member={userId:'athlete',provider:'firebase',providerVerified:true};
const at='2026-11-28T12:00:00.000Z';
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-assessments-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const userStore=createUserStore({userDir:dir});userStore.ensureDirs();userStore.saveUser({userId:'athlete',rugbyAssessments:[{id:'legacy'}],rugbyEvidence:[]});
 const authorizationResolver=createAuthorizationResolver(parseAuthorizationConfig({ADMIN_EMAILS:admin.email}));
 return {userStore,authorizationResolver,service:createAssessmentCapture({userStore,authorizationResolver,now:()=>at})};
}
const physical=()=>({requestId:randomUUID(),protocolId:'sprint_10m',date:'2026-11-27',trial:1,value:2.1,pain:false,setupNotes:'Electronic timing, standing start, dry grass.'});
function movement(service){
 const protocol=service.catalog(member).protocols.find(item=>item.id==='overhead_squat');
 return {requestId:randomUUID(),protocolId:protocol.id,date:'2026-11-27',trial:1,pain:null,setupNotes:'Side and front observation. Depth not assessed.',observations:Object.fromEntries(protocol.observationKeys.map(key=>[key,'not_assessed']))};
}
test('physical self-report persists with server-owned identity, unit and source; legacy records unchanged',t=>{
 const {service,userStore}=fixture(t);const saved=service.record(member,'athlete',physical());
 assert.equal(saved.unit,'seconds');assert.equal(saved.source,'athlete_self_report');assert.equal(saved.independentlyVerified,false);assert.equal(saved.assessorId,'athlete');
 assert.equal(service.read(member,'athlete')[0].id,saved.id);assert.equal(userStore.loadUser('athlete').rugbyAssessments[0].id,'legacy');assert.deepEqual(userStore.loadUser('athlete').rugbyEvidence,[]);
});
test('overhead squat saves descriptive observations without a numeric score or diagnosis',t=>{
 const {service}=fixture(t),input=movement(service);input.observations.knees_collapse='observed';
 const saved=service.record(member,'athlete',input);assert.equal(saved.observations.knees_collapse,'observed');assert.equal(saved.pain,null);assert.equal(saved.value,undefined);assert.equal(saved.protocol.category,'movement');
});
test('admin records for another saved athlete without pretending to be the athlete or independent verifier',t=>{
 const {service}=fixture(t);const saved=service.adminRecord(admin,'athlete',physical());assert.equal(saved.source,'admin_recorded');assert.equal(saved.assessorId,'owner');assert.equal(saved.athleteId,'athlete');assert.equal(saved.independentlyVerified,false);
});
test('retrying a submission returns the same record while conflicting reuse is rejected',t=>{
 const {service}=fixture(t),input=physical(),first=service.record(member,'athlete',input);
 assert.equal(service.record(member,'athlete',input).id,first.id);assert.equal(service.read(member,'athlete').length,1);
 assert.throws(()=>service.record(member,'athlete',{...input,value:9}),/Submission ID already used/);
});
test('members cannot configure tests, impersonate another athlete or use admin endpoints',t=>{
 const {service}=fixture(t);
 assert.throws(()=>service.configure(member,{kind:'physical_test',name:'Jump',setup:'Standing broad jump',unit:'cm'}),/Admin required/);
 assert.throws(()=>service.record(member,'owner',physical()),/Admin required/);assert.throws(()=>service.read(member,'owner'),/Admin required/);
 assert.throws(()=>service.adminRecord(member,'athlete',physical()),/Admin required/);assert.throws(()=>service.adminRead(member,'athlete'),/Admin required/);
});
test('unverified and pilot sessions cannot read or write assessment workflows',t=>{
 const {service}=fixture(t);
 for(const auth of [null,{...admin,providerVerified:false},{...admin,provider:'pilot_bypass'},{...admin,identityClass:'pilot_bypass'}]){
  assert.throws(()=>service.catalog(auth),/Verified sign-in required/);assert.throws(()=>service.record(auth,'athlete',physical()),/Verified sign-in required/);
 }
});
test('server rejects forged authority, units, invalid numbers and invalid dates without writes',t=>{
 const {service}=fixture(t);
 for(const patch of [{source:'coach'},{athleteId:'owner'},{independentlyVerified:true},{unit:'kg'},{value:'2'},{value:NaN},{value:-1},{date:'2026-02-30'},{date:'2027-01-01'},{trial:0},{pain:'no'},{setupNotes:''},{protocolId:'unknown'},{observations:{}}])assert.throws(()=>service.record(member,'athlete',{...physical(),...patch}));
 assert.deepEqual(service.read(member,'athlete'),[]);
});
test('incomplete, extra or malformed movement observations are rejected',t=>{
 const {service}=fixture(t),input=movement(service);
 for(const patch of [{value:3},{observations:{}},{observations:{...input.observations,score:5}},{observations:{...input.observations,knees_collapse:'pass'}},{observations:{...input.observations,squat_depth:'observed'}}])assert.throws(()=>service.record(member,'athlete',{...input,...patch}));
});
test('admin creates a custom physical test and combine, and recorded results pin their definitions',t=>{
 const {service,userStore}=fixture(t);
 const jump=service.configure(admin,{kind:'physical_test',name:'Standing broad jump',unit:'cm',setup:'Standing start. Measure from line to closest heel; record surface and trial.'});
 const combine=service.configure(admin,{kind:'combine',name:'Quins initial combine',setup:'Use identical equipment and test order on retesting.',protocolIds:[jump.id,'overhead_squat']});
 assert.equal(service.catalog(member).combines[0].id,combine.id);
 const result=service.record(member,'athlete',{...physical(),protocolId:jump.id,value:200,combineId:combine.id,sessionName:'Session one'});
 assert.equal(result.unit,'cm');assert.equal(result.combine.name,combine.name);assert.equal(result.protocol.version,1);
 userStore.updateUser('owner',user=>{user.rugbyAssessmentConfig.protocols[0].name='Changed later';return user;});
 assert.equal(service.read(member,'athlete')[0].protocol.name,'Standing broad jump');
});
test('combine rejects unknown, duplicate and unrelated tests; count measurements require integers',t=>{
 const {service}=fixture(t);
 for(const protocolIds of [[],['unknown'],['sprint_10m','sprint_10m']])assert.throws(()=>service.configure(admin,{kind:'combine',name:'Battery',setup:'Consistent setup',protocolIds}));
 const combine=service.configure(admin,{kind:'combine',name:'Sprint battery',setup:'Consistent setup',protocolIds:['sprint_20m']});
 assert.throws(()=>service.record(member,'athlete',{...physical(),combineId:combine.id,sessionName:'Session one'}));
 const reps=service.configure(admin,{kind:'physical_test',name:'Pull ups',unit:'reps',setup:'Document grip, range and technique.'});assert.throws(()=>service.record(member,'athlete',{...physical(),protocolId:reps.id,value:2.5}));
});
test('capture survives service recreation and flows into athlete review, including movement and physical gaps',t=>{
 const f=fixture(t);f.service.record(member,'athlete',physical());f.service.record(member,'athlete',movement(f.service));
 const recreated=createAssessmentCapture({userStore:f.userStore,authorizationResolver:f.authorizationResolver,now:()=>at});assert.equal(recreated.read(member,'athlete').length,2);
 const review=createAthleteReviewService({userStore:f.userStore,authorizationResolver:f.authorizationResolver,now:()=>at}).read(admin,'athlete','BM-03');
 assert.equal(review.developmentAssessments.length,2);assert.equal(review.stageChangeAuthorized,false);assert.equal(review.gaps.some(gap=>gap.startsWith('Record movement')),false);assert.equal(review.gaps.some(gap=>gap.startsWith('Record physical')),false);
});
test('routes are authenticated, rate-limit writes, keep responses private and prevent body identity spoofing',t=>{
 const {service}=fixture(t),routes={},auth=()=>{},limit=()=>{};
 const app=Object.fromEntries(['get','post'].map(method=>[method,(url,...handlers)=>{assert.equal(handlers[0],auth);if(method==='post')assert.equal(handlers[1],limit);routes[method+' '+url]=handlers.at(-1);} ]));
 installRugbyAssessmentCaptureRoutes({app,requireAuth:auth,writeLimit:limit,service});
 function call(method,url,req){const res={code:200,set(key,value){this[key]=value;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};routes[method+' '+url](req,res);return res;}
 let res=call('post','/api/me/rugby/assessment-records',{auth:member,body:{...physical(),athleteId:'owner'}});assert.equal(res.code,400);
 res=call('post','/api/me/rugby/assessment-records',{auth:member,body:physical()});assert.equal(res.code,201);assert.equal(res['Cache-Control'],'private, no-store');assert.equal(res.body.data.athleteId,'athlete');
 assert.equal(call('get','/api/admin/rugby/athletes/:athleteId/assessment-records',{auth:member,params:{athleteId:'athlete'}}).code,403);
});
