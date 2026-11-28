'use strict';
const {exerciseService}=require('../exercise-intelligence');
const {slug}=require('../exercise-intelligence/exerciseClassification');
const menus=require('../../data/rugby/full-xv-assessments/development-links.v1.json');
// Coach-review hypotheses, not validated transfer coefficients.
const RULES={
 acceleration:{patterns:['hinge','squat','lunge'],muscles:['glutes','hamstrings','quadriceps','calves'],purpose:'Lower-body force capacity may support acceleration; sprint practice and retesting remain necessary.'},
 speed:{patterns:['hinge','lunge'],muscles:['hamstrings','glutes','calves'],purpose:'Posterior-chain capacity may support sprint preparation; maximum velocity requires specific exposure.'},
 braking_cod:{patterns:['lunge','squat','hinge'],muscles:['quadriceps','glutes','hamstrings','adductors'],purpose:'Lower-body strength may support braking; directional technique and matched-speed retesting remain necessary.'},
 power:{patterns:['squat','hinge','lunge'],muscles:['quadriceps','glutes','hamstrings'],purpose:'Strength and appropriate explosive work may support power; jump or throw practice remains separate.'},
 strength:{patterns:['squat','hinge','lunge','horizontal_push','horizontal_pull','vertical_push','vertical_pull','core','carry'],muscles:[],purpose:'Develop general force capacity; role-specific transfer requires field evidence.'},
 movement:{patterns:['mobility','core','squat','lunge'],muscles:[],purpose:'Explore controlled movement or mobility where follow-up supports it; screening is not a diagnosis.'}
};
function rankRugbyExercises(priority,input){
 const menu=menus.links.find(m=>m.domain===priority.domain),rule=RULES[priority.domain];
 const base={version:1,domain:priority.domain,evidenceIds:[...(priority.evidenceIds||[])],coachApprovalRequired:true,trainingAuthorized:false,automaticDose:false,classification:'coach_review_hypothesis'};
 if(!menu||!rule||!['physical_capacity','movement_control'].includes(priority.priorityType))return {...base,fieldOrFurtherReviewRequired:true,candidates:[],exerciseFamilies:menu?.exerciseFamilies||[]};
 const equipment=new Set(['bodyweight',...input.equipment]),blocked=new Set(input.limitations.map(slug)),ceiling={beginner:1,intermediate:2,advanced:3}[input.experienceLevel];
 const candidates=exerciseService.list().flatMap(e=>{
  const c=e.classification,pattern=c.movementPattern,alias=pattern==='horizontal_push'?'push':pattern==='horizontal_pull'?'pull':pattern;
  if(e.deprecation.deprecated||!equipment.has(c.equipment)||!ceiling||c.difficultyScore>ceiling||blocked.has(pattern)||blocked.has(alias)||blocked.has(e.exerciseId)||e.contraindications.some(v=>blocked.has(slug(v))))return [];
  if(c.executionStyle==='explosive'&&priority.domain!=='power')return [];
  const pinned=menu.canonicalExerciseExamples.includes(e.exerciseId),patternMatch=rule.patterns.includes(pattern),muscleMatches=c.primaryMuscles.filter(m=>rule.muscles.includes(m));
  if(!pinned&&!patternMatch&&!muscleMatches.length)return [];
  const score=(pinned?4:0)+(patternMatch?3:0)+(muscleMatches.length?1:0)+(priority.domain==='power'&&c.executionStyle==='explosive'?1:0);
  return [{exerciseId:e.exerciseId,contentVersion:e.contentVersion,displayName:e.displayName,movementPattern:pattern,primaryMuscles:c.primaryMuscles,matchedMuscles:muscleMatches,relevance:pinned?'menu_candidate':patternMatch?'supporting_pattern':'supporting_muscle',score,rugbyApplication:rule.purpose,requiresTechniqueAndReadinessReview:true}];
 }).sort((a,b)=>b.score-a.score||a.exerciseId.localeCompare(b.exerciseId));
 return {...base,fieldOrFurtherReviewRequired:true,candidateCount:candidates.length,candidates:candidates.slice(0,20),exerciseFamilies:menu.exerciseFamilies,retest:menu.retest};
}
module.exports={rankRugbyExercises};
