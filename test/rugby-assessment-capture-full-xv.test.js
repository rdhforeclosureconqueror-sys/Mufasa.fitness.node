'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {createUserStore}=require('../src/repositories/userStore');
const {createAuthorizationResolver,parseAuthorizationConfig}=require('../src/lib/authorization');
const {createAssessmentCapture}=require('../src/rugby/assessmentCapture');
const {createAthleteReviewService}=require('../src/rugby/athleteReviewService');
const admin={userId:'coach',email:'coach@example.test',provider:'firebase',providerVerified:true};
const athlete={userId:'athlete',provider:'firebase',providerVerified:true};
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xv-capture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const userStore=createUserStore({userDir:dir});userStore.ensureDirs();for(const userId of ['athlete','other'])userStore.saveUser({userId});
 const resolver=createAuthorizationResolver(parseAuthorizationConfig({ADMIN_EMAILS:admin.email}));
 const now=()=> '2026-11-28T12:00:00.000Z';
 return {userStore,service:createAssessmentCapture({userStore,authorizationResolver:resolver,now}),review:createAthleteReviewService({userStore,authorizationResolver:resolver,now})};
}
const bind=(service,id)=>service.configure(admin,{kind:'candidate_capture',candidateId:id,name:'Local '+id,setup:'Coach reviewed local setup, population, conditions and procedure for raw capture.'});
const context=()=>({position:14,role:'Wing support',side:'right',environment:'field',pressure:'controlled',readiness:'normal',conditions:'Dry grass, boots, fixed start geometry and assessor view.'});
const skillContext=()=>({...context(),prompts:'None',behavior:'Held depth and scanned defender',decision:'Pass selected',execution:'Pass arrived behind receiver',outcome:'Receiver slowed',clipRef:'clip:session-one'});
function result(protocol,patch={}){return {requestId:randomUUID(),protocolId:protocol.id,date:'2026-11-27',trial:1,pain:false,setupNotes:'Actual field conditions and fixed geometry recorded.',...(protocol.category==='physical'?{value:2.1}:{observations:protocol.category==='movement'?Object.fromEntries(protocol.observationKeys.map(key=>[key,'not_assessed'])):{development_state:'independent_controlled'}}),context:protocol.category==='rugby_skill'?skillContext():context(),...patch};}
test('all fifteen positions and twenty-nine candidates appear without automatic protocol approval',t=>{
 const {service}=fixture(t),catalog=service.catalog(athlete);
 assert.deepEqual(catalog.positionProfiles.map(profile=>profile.number),Array.from({length:15},(_,i)=>i+1));assert.equal(catalog.candidateAssessments.length,29);
 assert.ok(catalog.positionProfiles.find(profile=>profile.number===9).assessmentIds.includes('scrum_half_service'));
 assert.equal(catalog.protocols.some(protocol=>protocol.candidateId),false);
});
test('every candidate can be registered with a new live UUID and immutable source/procedure snapshot',t=>{
 const {service}=fixture(t);
 for(const candidate of service.catalog(admin).candidateAssessments){
  const protocol=bind(service,candidate.id);assert.notEqual(protocol.id,candidate.id);assert.equal(protocol.candidateVersion,1);assert.equal(protocol.captureOnly,true);assert.equal(protocol.criteriaApproved,false);assert.equal(protocol.candidateSnapshot.status,'candidate');assert.match(protocol.setup,/Local procedure:/);
  if(candidate.mode==='physical')assert.equal(protocol.unit,candidate.metrics[0].unit);
 }
 assert.equal(service.catalog(admin).protocols.filter(protocol=>protocol.candidateId).length,29);
});
test('members cannot register procedures; arbitrary candidate IDs and caller approval flags reject',t=>{
 const {service}=fixture(t),input={kind:'candidate_capture',candidateId:'attack_decision',name:'Local skill',setup:'Fixed geometry and defender response.'};
 assert.throws(()=>service.configure(athlete,input),/Admin required/);
 assert.throws(()=>service.configure(admin,{...input,candidateId:'invented'}),/Unknown framework/);
 for(const patch of [{criteriaApproved:true},{unit:'seconds'},{protocolIds:[]},{candidateSnapshot:{}}])assert.throws(()=>service.configure(admin,{...input,...patch}));
});
test('saved primary/secondary preferences are athlete scoped and never assign participation',t=>{
 const {service,userStore,review}=fixture(t);
 const saved=service.savePositions(athlete,'athlete',{primary:14,secondary:15});assert.equal(saved.participationAuthorized,false);assert.equal(saved.source,'athlete_self_report');
 assert.equal(service.getPositions(athlete,'athlete').primary,14);assert.equal(userStore.loadUser('athlete').rugbyProfile,undefined);
 assert.ok(review.list(admin).some(row=>row.athleteId==='athlete'));
 assert.throws(()=>service.savePositions(athlete,'other',{primary:1,secondary:null}),/Admin required/);
 assert.throws(()=>service.adminGetPositions(athlete,'athlete'),/Admin required/);
 assert.throws(()=>service.savePositions(admin,'athlete',{primary:14,secondary:14}));
 assert.throws(()=>service.savePositions(admin,'athlete',{primary:16,secondary:null}));
 assert.throws(()=>service.savePositions(admin,'athlete',{primary:14,secondary:null,role:'super_admin'}));
});
test('skill observations retain factual behavior, decision, execution, outcome and simulator context separately',t=>{
 const {service,review}=fixture(t),protocol=bind(service,'attack_decision');
 const saved=service.adminRecord(admin,'athlete',result(protocol,{context:{...skillContext(),environment:'simulator'}}));
 assert.equal(saved.observations.development_state,'independent_controlled');assert.equal(saved.context.environment,'simulator');assert.notEqual(saved.context.decision,saved.context.execution);assert.equal(saved.assessorId,'coach');assert.equal(saved.source,'admin_recorded');assert.equal(saved.participationAuthorized,false);assert.equal(saved.independentlyVerified,false);assert.equal(saved.reviewState,'review_required');
 assert.equal(review.read(admin,'athlete','BM-03').developmentAssessments[0].context.environment,'simulator');
});
test('missing context, fabricated numeric skill scores and implicit not-assessed zero are rejected',t=>{
 const {service}=fixture(t),protocol=bind(service,'attack_decision');
 for(const patch of [{context:undefined},{value:0},{observations:{development_state:0}},{observations:{development_state:'verified'}},{context:{...skillContext(),verified:true}},{context:{...skillContext(),decision:''}}])assert.throws(()=>service.record(athlete,'athlete',result(protocol,patch)));
 const saved=service.record(athlete,'athlete',result(protocol,{observations:{development_state:'not_assessed'}}));assert.equal(saved.observations.development_state,'not_assessed');assert.equal(saved.value,undefined);
});
test('contact observations require structured supervision/context, including explicit unknown prerequisites',t=>{
 const {service}=fixture(t),protocol=bind(service,'scrum_role'),input=result(protocol);
 assert.throws(()=>service.adminRecord(admin,'athlete',input),/Contact records/);
 input.context={...skillContext(),position:1,role:'Loosehead bind',supervisor:'Not recorded',supervision:'not_established',contactLevel:'no_contact',space:'Unopposed indoor setup',prerequisites:'not_assessed'};
 const saved=service.adminRecord(admin,'athlete',input);assert.equal(saved.context.prerequisites,'not_assessed');assert.equal(saved.participationAuthorized,false);assert.equal(saved.reviewState,'review_required');
 for(const key of ['supervisor','supervision','contactLevel','space','prerequisites']){const modified=structuredClone(input);delete modified.context[key];assert.throws(()=>service.record(athlete,'athlete',{...modified,requestId:randomUUID()}));}
});
test('live procedure registration does not relabel historical builtin records or conflate jump alternatives',t=>{
 const {service}=fixture(t);
 const legacy=service.record(athlete,'athlete',{requestId:randomUUID(),protocolId:'sprint_10m',date:'2026-11-27',trial:1,pain:false,setupNotes:'Old generic setup.',value:2});
 bind(service,'acceleration_10m');const cmj=bind(service,'cmj'),broad=bind(service,'broad_jump');
 assert.equal(service.read(athlete,'athlete')[0].protocol.candidateId,undefined);assert.equal(legacy.protocol.id,'sprint_10m');assert.notEqual(cmj.id,broad.id);assert.notEqual(cmj.candidateId,broad.candidateId);
});
test('corrections append, preserve original context and expose only the current result in review',t=>{
 const {service,review}=fixture(t),protocol=bind(service,'attack_decision');
 const first=service.adminRecord(admin,'athlete',result(protocol));
 const correction=result(protocol,{supersedes:first.id,context:{...skillContext(),execution:'Pass arrived in front'}});
 const next=service.adminRecord(admin,'athlete',correction);
 assert.equal(service.adminRecord(admin,'athlete',correction).id,next.id);
 assert.equal(service.read(admin,'athlete').length,2);assert.equal(service.read(admin,'athlete')[0].context.execution,'Pass arrived behind receiver');
 assert.deepEqual(review.read(admin,'athlete','BM-03').developmentAssessments.map(record=>record.id),[next.id]);
 assert.throws(()=>service.adminRecord(admin,'athlete',result(protocol,{supersedes:first.id})));
 assert.throws(()=>service.adminRecord(admin,'other',result(protocol,{supersedes:next.id})));
 const different=bind(service,'defence_connection');assert.throws(()=>service.adminRecord(admin,'athlete',result(different,{supersedes:next.id})));
});
