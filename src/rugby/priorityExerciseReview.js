'use strict';
const {getExercise}=require('../exercise-intelligence/exerciseCatalog');
const menus=require('../../data/rugby/full-xv-assessments/development-links.v1.json');
function buildPriorityExerciseReview(priority,input,program){
 const menu=menus.links.find(m=>m.domain===priority.domain);
 const scheduled=new Set(program.microcycles.flatMap(w=>(w.sessions||[]).flatMap(s=>(s.exercises||[]).map(e=>e.exerciseId))));
 const equipment=new Set(['bodyweight',...input.equipment]),ceiling={beginner:1,intermediate:2,advanced:3}[input.experienceLevel];
 const candidates=(priority.exerciseOptions||[]).map(option=>{
  const e=getExercise(option.exerciseId),reasons=[];
  if(!menu?.canonicalExerciseExamples.includes(option.exerciseId)||!e||e.exerciseId!==option.exerciseId||e.deprecation.deprecated||e.contentVersion!==option.contentVersion||e.schemaVersion!==option.schemaVersion)reasons.push('catalog_or_menu_review_required');
  if(e){const c=e.classification;if(!equipment.has(c.equipment))reasons.push('equipment_unavailable');if(!ceiling||c.difficultyScore>ceiling)reasons.push('experience_review_required');if(input.limitations.includes(c.movementPattern)||input.limitations.includes(e.exerciseId))reasons.push('reported_limitation');}
  return {exerciseId:option.exerciseId,displayName:e?.displayName||option.displayName,scheduledInGenericPreview:scheduled.has(option.exerciseId),status:reasons.length?'requires_resolution':'candidate_only',reasons};
 });
 return {menuVersion:menus.version,domain:priority.domain,exerciseFamilies:menu?.exerciseFamilies||[],retestPlan:priority.retestPlan,candidates,fieldDrillReviewRequired:!menu||!menu.canonicalExerciseExamples.length,coachApprovalRequired:true,automaticDose:false,trainingAuthorized:false};
}
module.exports={buildPriorityExerciseReview};
