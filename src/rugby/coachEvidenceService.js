'use strict';
const {randomUUID}=require('node:crypto');
const {PERMISSIONS,ROLES}=require('../lib/authorization');
const {currentEvidence}=require('./athleteEvidence');
function createCoachEvidenceService({assignmentStore,userStore,authorizationResolver,now=()=>new Date().toISOString()}){
 function access(auth,athleteId){
  const actor=auth?.userId;
  if(typeof actor!=='string'||!actor||typeof athleteId!=='string'||!athleteId||actor===athleteId)throw Error('Access denied');
  const role=authorizationResolver.resolveRole(auth);
  if(![ROLES.TRAINER,ROLES.ADMIN,ROLES.SUPER_ADMIN].includes(role.role)||!authorizationResolver.hasPermission(role,PERMISSIONS.TRAINER_CLIENTS_READ)||!assignmentStore.hasActiveAccess(actor,athleteId))throw Error('Access denied');
  return actor;
 }
 function review(auth,athleteId,input){
  const actor=access(auth,athleteId);
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['eventId','finding'].includes(k))||typeof input.eventId!=='string'||!['confirmed','not_confirmed'].includes(input.finding))throw Error('Invalid review');
  let result;
  userStore.updateUser(athleteId,user=>{
   access(auth,athleteId);
   const history=user.rugbyEvidence||[];
   const target=currentEvidence(history,athleteId).find(e=>e.eventId===input.eventId&&e.eventType==='assessment_recorded'&&e.verificationStatus==='unverified');
   if(!target||!Array.isArray(user.rugbyAssessments)||!user.rugbyAssessments.some(a=>'assessment:'+a.id===target.sourceRef))throw Error('Evidence unavailable');
   if(history.some(e=>e.eventType==='coach_reviewed'&&e.sourceRef==='evidence:'+target.eventId))throw Error('Already reviewed');
   if(history.length>=1000)throw Error('Evidence limit');
   const at=now();
   if(!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at||Date.parse(at)<Date.parse(target.recordedAt))throw Error('Invalid review time');
   result={eventId:randomUUID(),athleteId,occurredAt:at,recordedAt:at,eventType:'coach_reviewed',sourceRef:'evidence:'+target.eventId,verificationStatus:'coach_reviewed',assessorId:actor,finding:input.finding};
   user.rugbyEvidence=[...history,result];return user;
  });
  return {...result};
 }
 function list(auth,athleteId){
  access(auth,athleteId);
  const user=userStore.loadUser(athleteId);
  const history=currentEvidence(user.rugbyEvidence||[],athleteId);
  return history.filter(e=>e.eventType==='assessment_recorded').map(e=>{
   const a=(user.rugbyAssessments||[]).find(a=>'assessment:'+a.id===e.sourceRef);
   return {eventId:e.eventId,occurredAt:e.occurredAt,measurement:a?{type:a.type,value:a.value,unit:a.unit,date:a.date}:null,review:history.find(r=>r.eventType==='coach_reviewed'&&r.sourceRef==='evidence:'+e.eventId)?.finding||null};
  });
 }
 return {review,list};
}
module.exports={createCoachEvidenceService};
