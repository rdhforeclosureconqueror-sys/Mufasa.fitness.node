'use strict';
const {evaluateStoredReadiness}=require('./storedReadiness');
const {evaluate}=require('../../docs/rugby/master-intelligence-v1/prototypes/exercise-eligibility.cjs');
// Internal review only. No request-supplied clearance, competency or approval.
function evaluateAthleteEligibility(user,athleteId,today,ageGroup){
 const readiness=evaluateStoredReadiness(user,athleteId,today,ageGroup);
 const eligibility=evaluate(readiness.status==='REFER'?{pain:true}:{pain:undefined,clinicalConcern:undefined});
 return {readiness,eligibility,automaticPrescriptionAllowed:false,automaticProgressionAllowed:false};
}
module.exports={evaluateAthleteEligibility};
