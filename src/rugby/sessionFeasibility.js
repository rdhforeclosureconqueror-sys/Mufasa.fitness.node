'use strict';
function reviewSession(session,adaptation){
 const range=adaptation.restGuidanceSeconds;
 const valid=n=>Number.isFinite(n)&&n>=0;
 const budget=valid(session.durationMinutes)?session.durationMinutes*60:null;
 const warm=session.warmUp?.durationMinutes,cool=session.coolDown?.durationMinutes;
 let execution=0,rest=0,complete=Boolean(range)&&valid(warm)&&valid(cool)&&Array.isArray(session.exercises)&&session.exercises.length>0;
 for(const e of session.exercises||[]){
  const tempo=typeof e.tempo==='string'&&/^\d+-\d+-\d+$/.test(e.tempo)?e.tempo.split('-').map(Number).reduce((a,b)=>a+b,0):null;
  if(!Number.isInteger(e.sets)||e.sets<1||!Number.isInteger(e.reps)||e.reps<1||!tempo){complete=false;continue;}
  execution+=e.sets*e.reps*tempo;
  if(range)rest+=(e.sets-1)*range[0];
 }
 const lowerBound=complete?execution+rest+(warm+cool)*60:null;
 return {sessionId:session.sessionId,budgetSeconds:budget,estimatedMinimumSeconds:lowerBound,executionSeconds:complete?execution:null,minimumRestSeconds:complete?rest:null,status:lowerBound===null||budget===null?'insufficient_information':lowerBound>budget?'exceeds_budget':'minimum_fits_unverified',excludedTime:['instruction','equipment_setup','transitions','unilateral_extra_execution','additional_rest'],assumptions:['tempo_seconds_per_rep','minimum_course_guide_rest_between_sets_only','single_execution_per_prescribed_rep'],automaticDoseAdjustment:false};
}
module.exports={reviewSession};
