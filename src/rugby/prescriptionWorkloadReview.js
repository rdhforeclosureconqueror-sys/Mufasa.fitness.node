'use strict';
const policy=require('../../data/rugby/master-intelligence-v1/policies/beast-mode-development-cycle.json');
const kinds=['practice','match','independent_training','protected_recovery'];
function normalizeWorkload(raw){
 if(raw===undefined)return null;
 if(!Array.isArray(raw)||raw.length>28)throw Error('Invalid weekly workload context');
 return raw.map(x=>{
  if(!x||typeof x!=='object'||Object.keys(x).some(k=>!['day','kind','minutes'].includes(k))||!Number.isInteger(x.day)||x.day<0||x.day>6||!kinds.includes(x.kind)||!Number.isInteger(x.minutes)||x.minutes<1||x.minutes>1440)throw Error('Invalid workload entry');
  return {day:x.day,kind:x.kind,minutes:x.minutes};
 });
}
function reviewPrescription(program,workload){
 const reasons=new Set(['coach_prescription_review_required','readiness_and_field_transfer_review_required']);
 if(workload===null)reasons.add('weekly_workload_unknown');
 const weeks=program.microcycles.map((w,index)=>{
  const sessions=(w.sessions||[]).filter(s=>s.type==='workout');
  const collisions=[];
  for(const s of sessions){
   const day=new Date(s.date+'T00:00:00Z').getUTCDay();
   for(const entry of workload||[])if(entry.day===day){collisions.push({sessionId:s.sessionId,date:s.date,kind:entry.kind});reasons.add('same_day_'+entry.kind+'_review_required');}
  }
  return {week:w.week??index+1,plannedGymSessions:sessions.length,plannedGymMinutes:sessions.reduce((n,s)=>n+(s.durationMinutes||0),0),plannedSets:sessions.reduce((n,s)=>n+(s.exercises||[]).reduce((a,e)=>a+(e.sets||0),0),0),collisions};
 });
 return {schemaVersion:1,policyVersion:policy.version,policyActive:policy.activation,workloadSource:workload===null?'unknown':'coach_reported_recurring_week',weeklyWorkload:workload,externalMinutes:workload===null?null:workload.filter(e=>e.kind!=='protected_recovery').reduce((n,e)=>n+e.minutes,0),weeks,reasons:[...reasons],automaticDoseAdjustment:false,trainingAuthorized:false};
}
module.exports={normalizeWorkload,reviewPrescription};
