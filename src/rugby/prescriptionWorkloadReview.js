'use strict';
const policy=require('../../data/rugby/master-intelligence-v1/policies/beast-mode-development-cycle.json');
const {makePlan,dayDistance}=require('./inSeasonPlan');
function normalizeMatchDates(raw){if(raw===undefined)return null;if(!Array.isArray(raw)||raw.length>100)throw Error('Invalid match dates');for(const date of raw)dayDistance(date,date);return [...new Set(raw)].sort();}
const kinds=['practice','match','independent_training','protected_recovery'];
function normalizeWorkload(raw){
 if(raw===undefined)return null;
 if(!Array.isArray(raw)||raw.length>28)throw Error('Invalid weekly workload context');
 const daily=Array(7).fill(0);
 return raw.map(x=>{
  if(!x||typeof x!=='object'||Object.keys(x).some(k=>!['day','kind','minutes'].includes(k))||!Number.isInteger(x.day)||x.day<0||x.day>6||!kinds.includes(x.kind)||!Number.isInteger(x.minutes)||x.minutes<1||x.minutes>1440)throw Error('Invalid workload entry');
  daily[x.day]+=x.minutes;
  if(daily[x.day]>1440)throw Error('Daily workload exceeds available minutes');
  return {day:x.day,kind:x.kind,minutes:x.minutes};
 });
}
function reviewPrescription(program,workload,matchDates=null){
 const reasons=new Set(['coach_prescription_review_required','readiness_and_field_transfer_review_required']);
 if(workload===null)reasons.add('weekly_workload_unknown');
 if(matchDates===null)reasons.add('competition_calendar_unknown');
 const weeks=program.microcycles.map((w,index)=>{
  const sessions=(w.sessions||[]).filter(s=>s.type==='workout');
  const collisions=[];
  const competition=sessions.map(s=>{if(matchDates===null)return {sessionId:s.sessionId,date:s.date,phase:null};const p=makePlan({today:s.date,matchDates});if(p.phase==='match_window'||p.phase==='match_week')reasons.add('competition_proximity_review_required');return {sessionId:s.sessionId,date:s.date,phase:p.phase,daysToMatch:p.daysToMatch,daysSinceMatch:p.daysSinceMatch};});
  for(const s of sessions){
   const day=new Date(s.date+'T00:00:00Z').getUTCDay();
   for(const entry of workload||[])if(entry.day===day){collisions.push({sessionId:s.sessionId,date:s.date,kind:entry.kind});reasons.add('same_day_'+entry.kind+'_review_required');}
  }
  return {week:w.week??index+1,plannedGymSessions:sessions.length,plannedGymMinutes:sessions.reduce((n,s)=>n+(s.durationMinutes||0),0),plannedSets:sessions.reduce((n,s)=>n+(s.exercises||[]).reduce((a,e)=>a+(e.sets||0),0),0),collisions,competition};
 });
 return {schemaVersion:1,policyVersion:policy.version,policyActive:policy.activation,workloadSource:workload===null?'unknown':'coach_reported_recurring_week',weeklyWorkload:workload,matchDates,competitionSource:matchDates===null?'unknown':'coach_reported_dates',competitionInterpretation:'SAQ guide proximity context only; not resistance training dosage or clearance',externalMinutes:workload===null?null:workload.filter(e=>e.kind!=='protected_recovery').reduce((n,e)=>n+e.minutes,0),weeks,reasons:[...reasons],automaticDoseAdjustment:false,trainingAuthorized:false};
}
module.exports={normalizeWorkload,normalizeMatchDates,reviewPrescription};
