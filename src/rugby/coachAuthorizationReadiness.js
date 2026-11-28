'use strict';
const {evaluateStoredReadiness}=require('./storedReadiness');
const {currentCapturedAssessments}=require('./assessmentCapture');
// Diagnostic gate only: no status grants activation or medical clearance.
function reviewAuthorizationReadiness(user,athleteId,draft,today){
 const reasons=[];
 const readiness=evaluateStoredReadiness(user,athleteId,today,undefined);
 if(!user||user.userId!==athleteId||draft?.snapshot?.athleteId!==athleteId)reasons.push('athlete_mismatch');
 if(readiness.status!=='REVIEW_REQUIRED')reasons.push('readiness_'+readiness.status.toLowerCase());
 const ids=draft?.snapshot?.evidenceIds;
 const current=user?.userId===athleteId?currentCapturedAssessments(user,athleteId):[];
 if(!Array.isArray(ids)||!ids.length||!ids.every(id=>current.some(e=>e.id===id)))reasons.push('evidence_missing_or_superseded');
 for(const e of current.filter(e=>Array.isArray(ids)&&ids.includes(e.id))){
  if(e.pain!==false||e.context?.readiness==='pain')reasons.push('evidence_pain_review_required');
  if(e.protocol?.candidateSnapshot?.contact&&(e.context?.supervision!=='qualified_reported'||e.context?.prerequisites!=='demonstrated'))reasons.push('contact_prerequisites_unresolved');
 }
 const prescription=draft?.snapshot?.prescriptionReview;
 if(!prescription||prescription.workloadSource!=='coach_reported_recurring_week'||prescription.competitionSource!=='coach_reported_dates'||!Array.isArray(prescription.weeklyWorkload)||!Array.isArray(prescription.matchDates))reasons.push('workload_or_calendar_unresolved');
 if(!Array.isArray(prescription?.weeks)||!prescription.weeks.length||prescription.weeks.some(w=>!Number.isInteger(w.plannedGymSessions)||w.plannedGymSessions<1||!Array.isArray(w.feasibility)||w.feasibility.length!==w.plannedGymSessions||w.feasibility.some(s=>s.status!=='minimum_fits_unverified')))reasons.push('session_feasibility_unresolved');
 return {schemaVersion:1,readiness,reasons:[...new Set(reasons)],state:reasons.length?'blocked':'explicit_safety_review_required',trainingAuthorized:false,assignmentAuthorized:false,medicalClearance:false};
}
module.exports={reviewAuthorizationReadiness};
