'use strict';
const {evaluateSafety}=require('../../docs/rugby/master-intelligence-v1/prototypes/safety-evaluator.cjs');
const {evaluateReadiness}=require('../../docs/rugby/master-intelligence-v1/prototypes/readiness-evaluator.cjs');
const {validateCheckin}=require('./checkinValidation');
function evaluateStoredReadiness(user,athleteId,today,ageGroup){
 const out=(status,reason,extra={})=>({status,reason,automaticPrescriptionAllowed:false,automaticProgressionAllowed:false,medicalClearance:false,...extra});
 if(!user||typeof athleteId!=='string'||!athleteId||!Array.isArray(user.rugbyCheckins))return out('HOLD','missing_history');
 let records;
 try{
  validateCheckin({date:today,readiness:'normal'});
  records=user.rugbyCheckins.map(raw=>{
   const item=validateCheckin({...raw,...(raw.recovery?{recovery:Object.fromEntries(Object.entries(raw.recovery).filter(([k])=>k!=='scaleVersion'))}:{})});
   if(raw.recovery&&raw.recovery.scaleVersion!=='v1')throw Error('Unknown scale');
   if(item.date>today||typeof raw.injuryConcern!=='boolean'||typeof raw.teamHighLoad!=='boolean')throw Error('Invalid stored checkin');
   return item;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  if(new Set(records.map(r=>r.date)).size!==records.length)throw Error('Duplicate date');
 }catch{return out('HOLD','invalid_history');}
 const current=records[0];
 if(!current)return out('HOLD','missing_checkin');
 const safety=evaluateSafety({screening:true,pain:current.readiness==='pain',clinicalConcern:current.injuryConcern});
 if(safety.primary==='block_and_refer')return out('REFER','reported_pain_or_injury',{date:current.date});
 if(current.date!==today)return out('HOLD','stale_checkin',{date:current.date});
 if(current.readiness==='fatigued'||current.teamHighLoad)return out('HOLD','reported_fatigue_or_team_load',{date:current.date});
 // Legacy check-ins cannot establish detailed recovery or clinical clearance.
 const readiness=evaluateReadiness({ageGroup,clinicalConcern:false,current:current.recovery?{...current.recovery,athleteId}:null,previous:records[1]?.recovery?{...records[1].recovery,athleteId}:null});
 return out('REVIEW_REQUIRED','detailed_readiness_and_safety_evidence_missing',{date:current.date,reportedReadiness:current.readiness,detailedReadinessStatus:readiness.status,changes:readiness.changes??null,comparisonDate:readiness.comparable?records[1].date:null});
}
module.exports={evaluateStoredReadiness};
