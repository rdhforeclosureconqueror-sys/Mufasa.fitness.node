'use strict';
const {randomUUID,createHash}=require('node:crypto');
const fullXv=require('./fullXvCapture');
const faultKeys=['squat_depth','arms_fall_forward','heels_lift','knees_collapse','torso_lean','hip_shift'];
const builtins=[
 ['sprint_10m','10 m sprint','seconds'],['sprint_20m','20 m sprint','seconds'],
 ['agility_505_left','505 agility — left','seconds'],['agility_505_right','505 agility — right','seconds'],
 ['ankle_knee_to_wall','Ankle knee-to-wall','cm']
].map(([id,name,unit])=>({id,name,unit,category:'physical',version:1,setup:'Document the equipment, start/timing method, surface and test procedure. Use the same procedure when retesting.'}));
builtins.push({id:'overhead_squat',name:'Overhead squat movement screen',category:'movement',version:1,observationKeys:faultKeys,observationValues:{squat_depth:['not_assessed','described_in_notes']},setup:'Describe squat depth in the notes and record observed compensations. This is descriptive observation capture, not diagnosis or a validated automatic score.'});
function invalid(message){const error=Error(message);error.status=400;throw error;}
function object(input,keys){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))invalid('Unexpected or invalid assessment fields');}
function text(value,min,max){return typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;}
function date(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function requireVerified(auth){if(!auth?.userId||auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'){const error=Error('Verified sign-in required');error.status=403;throw error;}}
function requireAdmin(auth,resolver){requireVerified(auth);if(!['admin','super_admin'].includes(resolver.resolveRole(auth).role)){const error=Error('Admin required');error.status=403;throw error;}}

function readCapturedAssessments(user,athleteId){
 const records=user.rugbyAssessmentRecords||[];
 if(!Array.isArray(records)||records.some(record=>!record||record.captureVersion!==1||record.athleteId!==athleteId))throw Error('Invalid saved assessment records');
 return structuredClone(records);
}
function currentCapturedAssessments(user,athleteId){
 const records=readCapturedAssessments(user,athleteId),superseded=new Set(records.map(record=>record.supersedes).filter(Boolean));
 return records.filter(record=>!superseded.has(record.id));
}
function createAssessmentCapture({userStore,authorizationResolver,now=()=>new Date().toISOString()}){
 const configurations=()=>userStore.listUsers().flatMap(user=>user.rugbyAssessmentConfig?[user.rugbyAssessmentConfig]:[]);
 function catalog(auth){
  requireVerified(auth);
  const configs=configurations();
  return structuredClone({protocols:[...builtins,...configs.flatMap(config=>config.protocols||[])],combines:configs.flatMap(config=>config.combines||[]),canConfigure:['admin','super_admin'].includes(authorizationResolver.resolveRole(auth).role),...fullXv.menu()});
 }
 function configure(auth,input){
  requireAdmin(auth,authorizationResolver);
  object(input,['kind','name','setup','unit','protocolIds','candidateId']);
  if(!['physical_test','combine','candidate_capture'].includes(input.kind)||!text(input.name,2,100)||!text(input.setup,5,1000))invalid('A name and test procedure are required');
  if(input.kind!=='candidate_capture'&&input.candidateId!==undefined)invalid('Candidate ID requires framework registration');
  const entry={id:randomUUID(),name:input.name.trim(),setup:input.setup.trim(),version:1,createdAt:now()};
  let key;
  if(input.kind==='physical_test'){
   if(!['seconds','cm','m','kg','reps'].includes(input.unit)||input.protocolIds!==undefined)invalid('Invalid physical test unit');
   Object.assign(entry,{category:'physical',unit:input.unit});key='protocols';
  }else if(input.kind==='candidate_capture'){
   if(input.unit!==undefined||input.protocolIds!==undefined)invalid('Framework metrics are defined by the candidate');
   Object.assign(entry,fullXv.binding(input.candidateId,input.setup.trim(),auth.userId,entry.createdAt));key='protocols';
  }else{
   const known=new Set(catalog(auth).protocols.map(protocol=>protocol.id));
   if(input.unit!==undefined||!Array.isArray(input.protocolIds)||!input.protocolIds.length||input.protocolIds.length>30||new Set(input.protocolIds).size!==input.protocolIds.length||input.protocolIds.some(id=>!known.has(id)))invalid('Select valid unique combine tests');
   entry.protocolIds=[...input.protocolIds];key='combines';
  }
  userStore.updateUser(auth.userId,user=>{
   const config=user.rugbyAssessmentConfig||{protocols:[],combines:[]};
   if(!Array.isArray(config.protocols)||!Array.isArray(config.combines)||config[key].length>=100)invalid('Assessment configuration limit reached');
   user.rugbyAssessmentConfig={...config,[key]:[...config[key],entry]};return user;
  });
  return structuredClone(entry);
 }
 function read(auth,athleteId){
  requireVerified(auth);if(athleteId!==auth.userId)requireAdmin(auth,authorizationResolver);
  return readCapturedAssessments(userStore.loadUser(athleteId),athleteId);
 }
 function getPositions(auth,athleteId){
  requireVerified(auth);if(athleteId!==auth.userId)requireAdmin(auth,authorizationResolver);
  return structuredClone(userStore.loadUser(athleteId).rugbyAssessmentPositions||{primary:null,secondary:null});
 }
 function savePositions(auth,athleteId,input){
  requireVerified(auth);if(athleteId!==auth.userId)requireAdmin(auth,authorizationResolver);
  if(athleteId!==auth.userId&&!userStore.listUsers().some(user=>user.userId===athleteId)){const error=Error('Athlete unavailable');error.status=404;throw error;}
  const value={...fullXv.positions(input),recordedBy:auth.userId,recordedAt:now(),source:athleteId===auth.userId?'athlete_self_report':'admin_recorded',participationAuthorized:false};
  userStore.updateUser(athleteId,user=>{user.rugbyAssessmentPositions=value;return user;});return structuredClone(value);
 }
 function record(auth,athleteId,input){
  requireVerified(auth);if(athleteId!==auth.userId)requireAdmin(auth,authorizationResolver);
  if(typeof athleteId!=='string'||!athleteId)invalid('Athlete required');
  if(athleteId!==auth.userId&&!userStore.listUsers().some(user=>user.userId===athleteId)){const error=Error('Athlete unavailable');error.status=404;throw error;}
  object(input,['protocolId','date','value','observations','pain','setupNotes','combineId','sessionName','trial','requestId','context','supersedes']);
  if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId))invalid('A valid submission ID is required');
  const at=now();
  // A date is local to the test venue. Allow the UTC+14 edge without accepting arbitrary future days.
  const latestDate=new Date(Date.parse(at)+14*60*60*1000).toISOString().slice(0,10);
  if(!date(input.date)||input.date>latestDate||!text(input.setupNotes,5,1000)||![true,false,null].includes(input.pain)||!Number.isInteger(input.trial)||input.trial<1||input.trial>20)invalid('Valid test date, setup notes, pain response and trial are required');
  const available=catalog(auth),protocol=available.protocols.find(protocol=>protocol.id===input.protocolId);
  if(!protocol)invalid('Unknown assessment protocol');
  const context=fullXv.context(protocol,input.context);
  const measurement={};
  if(protocol.category==='physical'){
   if(input.observations!==undefined||typeof input.value!=='number'||!Number.isFinite(input.value)||input.value<0||input.value>1000000||(protocol.unit==='reps'&&!Number.isInteger(input.value)))invalid('Invalid physical measurement');
   measurement.value=input.value;measurement.unit=protocol.unit;
  }else{
   if(input.value!==undefined)invalid('Movement observations do not use a physical measurement');
   object(input.observations,protocol.observationKeys);
   if(!protocol.observationKeys.every(key=>(protocol.observationValues?.[key]||['observed','not_observed','not_assessed']).includes(input.observations[key])))invalid('Complete all movement observations');
   measurement.observations={...input.observations};
  }
  let combine=null;
  if(input.combineId){
   const definition=available.combines.find(combine=>combine.id===input.combineId);
   if(!definition||!definition.protocolIds.includes(protocol.id)||!text(input.sessionName,2,100))invalid('Test must belong to the selected combine and have a session name');
   combine={id:definition.id,name:definition.name,version:definition.version,sessionName:input.sessionName.trim(),setup:definition.setup};
  }else if(input.sessionName)invalid('Choose a combine for this session');
  let result;
  const fingerprint=createHash('sha256').update(JSON.stringify({protocolId:protocol.id,date:input.date,trial:input.trial,...measurement,pain:input.pain,setupNotes:input.setupNotes.trim(),combine,context,supersedes:input.supersedes})).digest('hex');
  userStore.updateUser(athleteId,user=>{
   const records=readCapturedAssessments(user,athleteId);
   const existing=records.find(record=>record.requestId===input.requestId);
   if(existing){
    if(existing.fingerprint!==fingerprint||existing.assessorId!==auth.userId){const error=Error('Submission ID already used for another result');error.status=409;throw error;}
    result=existing;return user;
   }
   if(input.supersedes!==undefined){
    const prior=records.find(record=>record.id===input.supersedes);
    if(!prior||prior.protocol.id!==protocol.id||records.some(record=>record.supersedes===prior.id))invalid('Correction must reference a current result for the same athlete and procedure');
   }
   if(records.length>=1000)invalid('Assessment history limit reached');
   result={id:randomUUID(),requestId:input.requestId,fingerprint,captureVersion:1,athleteId,recordedAt:at,assessorId:auth.userId,date:input.date,trial:input.trial,protocol:structuredClone(protocol),...measurement,pain:input.pain,setupNotes:input.setupNotes.trim(),combine,...(input.supersedes?{supersedes:input.supersedes}:{}),...(context?{context,reviewState:'review_required',participationAuthorized:false}:{}),source:athleteId===auth.userId?'athlete_self_report':'admin_recorded',independentlyVerified:false};
   user.rugbyAssessmentRecords=[...records,result];return user;
  });
  return structuredClone(result);
 }
 return {catalog,configure,read,record,getPositions,savePositions,
  adminGetPositions:(auth,athleteId)=>{requireAdmin(auth,authorizationResolver);return getPositions(auth,athleteId);},
  adminSavePositions:(auth,athleteId,input)=>{requireAdmin(auth,authorizationResolver);return savePositions(auth,athleteId,input);},
  adminRead:(auth,athleteId)=>{requireAdmin(auth,authorizationResolver);return read(auth,athleteId);},
  adminRecord:(auth,athleteId,input)=>{requireAdmin(auth,authorizationResolver);return record(auth,athleteId,input);}};
}
module.exports={createAssessmentCapture,readCapturedAssessments,currentCapturedAssessments};
