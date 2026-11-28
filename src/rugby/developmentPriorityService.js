'use strict';
const {randomUUID,createHash}=require('node:crypto');
const {currentCapturedAssessments}=require('./assessmentCapture');
const {evaluateStoredReadiness}=require('./storedReadiness');
const {getExercise}=require('../exercise-intelligence/exerciseCatalog');
const development=require('../../data/rugby/full-xv-assessments/development-links.v1.json');
function fail(message,status=400){const error=Error(message);error.status=status;throw error;}
const text=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;
function exerciseOption(id){
 const exercise=getExercise(id);
 if(!exercise||exercise.exerciseId!==id||exercise.deprecation.deprecated)return null;
 // Catalog defaults are reference content, not a rugby training dose.
 return {exerciseId:id,displayName:exercise.displayName,schemaVersion:exercise.schemaVersion,contentVersion:exercise.contentVersion,movementPattern:exercise.classification.movementPattern};
}
function createDevelopmentPriorityService({userStore,authorizationResolver,now=()=>new Date().toISOString()}){
 function authorize(auth){if(!auth?.userId||auth.providerVerified!==true||auth.provider==='pilot_bypass'||auth.identityClass==='pilot_bypass'||!['admin','super_admin'].includes(authorizationResolver.resolveRole(auth).role))fail('Admin required',403);}
 function load(athleteId){const user=userStore.listUsers().find(user=>user.userId===athleteId);if(!user)fail('Athlete unavailable',404);return user;}
 function menus(){return development.links.map(link=>({...structuredClone(link),exerciseOptions:link.canonicalExerciseExamples.map(exerciseOption).filter(Boolean)}));}
 function gates(user,athleteId,evidence){
  const readiness=evaluateStoredReadiness(user,athleteId,now().slice(0,10),undefined);
  const reasons=['Assessment capture is not independent verification. Protocol interpretation and coaching review remain required.','Comparable retesting and field transfer have not been established by this priority.'];
  reasons.unshift('Current readiness: '+readiness.status+' — '+readiness.reason.replaceAll('_',' ')+'.');
  if(evidence.some(record=>record.pain===true||record.context?.readiness==='pain'))reasons.unshift('Supporting evidence reports pain; review this finding before any training decision.');
  if(evidence.some(record=>record.pain===null))reasons.push('Some supporting evidence has unknown pain status.');
  if(evidence.some(record=>record.protocol.candidateSnapshot?.contact&&(record.context?.supervision!=='qualified_reported'||record.context?.prerequisites!=='demonstrated')))reasons.push('Contact supervision or prerequisites are not established for some evidence.');
  return {readiness,reasons};
 }
 function view(auth,athleteId){
  authorize(auth);const user=load(athleteId),evidence=currentCapturedAssessments(user,athleteId),currentIds=new Set(evidence.map(record=>record.id));
  const priorities=(user.rugbyDevelopmentPriorities||[]).map(priority=>{
   if(priority.athleteId!==athleteId)throw Error('Invalid priority history');
   const evidenceCurrent=priority.evidenceIds.every(id=>currentIds.has(id));
   return {...structuredClone(priority),evidenceCurrent,currentReviewState:evidenceCurrent?'working_priority':'needs_re_review'};
  });
  return {athlete:{athleteId,name:String(user.displayName||user.name||athleteId).slice(0,120)},evidence,domains:menus(),priorities,...gates(user,athleteId,evidence),trainingAuthorized:false,automaticPrescription:false};
 }
 function save(auth,athleteId,input){
  authorize(auth);load(athleteId);
  const fields=['requestId','domain','priorityType','evidenceIds','finding','rationale','alternative','retestPlan','exerciseIds'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!fields.includes(key)))fail('Invalid working-priority fields');
  if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId))fail('A valid submission ID is required');
  const domain=development.links.find(link=>link.domain===input.domain);if(!domain)fail('Unknown development domain');
  if(!['physical_capacity','movement_control','technical_execution','decision_quality','needs_more_evidence'].includes(input.priorityType))fail('Choose the kind of development question');
  for(const [key,min,max] of [['finding',5,1500],['rationale',10,2000],['alternative',5,1000],['retestPlan',10,1000]])if(!text(input[key],min,max))fail('Finding, rationale, alternative explanation and retest plan are required');
  if(!Array.isArray(input.evidenceIds)||!input.evidenceIds.length||input.evidenceIds.length>10||new Set(input.evidenceIds).size!==input.evidenceIds.length||input.evidenceIds.some(id=>typeof id!=='string'))fail('Select one to ten unique supporting records');
  if(!Array.isArray(input.exerciseIds)||input.exerciseIds.length>10||new Set(input.exerciseIds).size!==input.exerciseIds.length||input.exerciseIds.some(id=>!domain.canonicalExerciseExamples.includes(id)||!exerciseOption(id)))fail('Choose canonical exercise options from this development menu');
  const request={domain:domain.domain,priorityType:input.priorityType,evidenceIds:[...input.evidenceIds],finding:input.finding.trim(),rationale:input.rationale.trim(),alternative:input.alternative.trim(),retestPlan:input.retestPlan.trim(),exerciseIds:[...input.exerciseIds]};
  const fingerprint=createHash('sha256').update(JSON.stringify(request)).digest('hex');let result;
  userStore.updateUser(athleteId,user=>{
   const history=user.rugbyDevelopmentPriorities||[];
   const existing=history.find(priority=>priority.requestId===input.requestId);
   if(existing){if(existing.fingerprint!==fingerprint||existing.recordedBy!==auth.userId)fail('Submission ID already used for another priority',409);result=existing;return user;}
   if(history.length>=100)fail('Working-priority history limit reached');
   const current=currentCapturedAssessments(user,athleteId),selected=input.evidenceIds.map(id=>current.find(record=>record.id===id));
   if(selected.some(record=>!record))fail('Supporting evidence is unavailable or superseded; reload the athlete review',409);
   result={id:randomUUID(),requestId:input.requestId,fingerprint,version:1,athleteId,recordedBy:auth.userId,recordedAt:now(),state:'working_priority',...request,evidenceSnapshots:structuredClone(selected),domainSnapshot:structuredClone(domain),exerciseOptions:input.exerciseIds.map(exerciseOption),reviewSnapshot:gates(user,athleteId,selected),independentVerificationGranted:false,trainingAuthorized:false,automaticPrescription:false,stageChangeAuthorized:false};
   user.rugbyDevelopmentPriorities=[...history,result];return user;
  });
  return structuredClone(result);
 }
 return {view,save};
}
module.exports={createDevelopmentPriorityService};
