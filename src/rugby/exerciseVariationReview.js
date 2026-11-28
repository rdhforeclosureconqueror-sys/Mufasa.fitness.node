'use strict';
const {exerciseService}=require('../exercise-intelligence');
const {progressionNodes}=require('../exercise-intelligence/exerciseProgressions');
const {slug}=require('../exercise-intelligence/exerciseClassification');
function reviewExerciseVariations(ids,input){
 const equipment=new Set(['bodyweight',...input.equipment]),blocked=new Set(input.limitations.map(slug)),ceiling={beginner:1,intermediate:2,advanced:3}[input.experienceLevel];
 function compatible(e){if(!e)return false;const c=e.classification,p=c.movementPattern,alias=p==='horizontal_push'?'push':p==='horizontal_pull'?'pull':p;return !!ceiling&&equipment.has(c.equipment)&&c.difficultyScore<=ceiling&&!e.deprecation.deprecated&&!blocked.has(p)&&!blocked.has(alias)&&!blocked.has(e.exerciseId)&&!e.contraindications.some(v=>blocked.has(slug(v)))&&c.executionStyle==='controlled';}
 const rows=[...new Set(ids)].map(id=>{
  const source=exerciseService.get(id);if(!source)return {exerciseId:id,status:'unknown_catalog_identity',relationships:[],alternatives:[]};
  const links=exerciseService.related(id).filter(r=>r.type==='progression');
  const relationships=links.map(r=>{const forward=r.fromExerciseId===id,target=exerciseService.get(forward?r.toExerciseId:r.fromExerciseId);const node=progressionNodes.find(n=>n.relationshipId===r.relationshipId);return {relationshipId:r.relationshipId,exerciseId:forward?r.toExerciseId:r.fromExerciseId,direction:forward?'progression':'regression',compatible:compatible(target),competencyVerified:false,prerequisites:forward&&node?{minimumCompetency:node.minimumCompetency,movementQuality:[...node.movementQualityRequirements]}:null,coachReviewRequired:true};});
  const known=new Set(relationships.map(r=>r.exerciseId));
  const alternatives=exerciseService.substitutions(id,{equipment:[...equipment],experienceLevel:input.experienceLevel,programGoal:input.goal}).filter(x=>compatible(x.exercise)&&!known.has(x.exercise.exerciseId)).slice(0,10).map(x=>({exerciseId:x.exercise.exerciseId,contentVersion:x.exercise.contentVersion,displayName:x.exercise.displayName,classification:'same_pattern_alternative',difficultyScore:x.exercise.classification.difficultyScore,coachReviewRequired:true}));
  return {exerciseId:id,status:compatible(source)?'review_only':'source_requires_resolution',relationships,alternatives};
 });
 return {schemaVersion:1,contentVersion:exerciseService.contentVersion,rows,automaticProgression:false,automaticSubstitution:false,trainingAuthorized:false};
}
module.exports={reviewExerciseVariations};
