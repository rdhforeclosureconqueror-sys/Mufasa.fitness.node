"use strict";
const {EXERCISES}=require("./programTemplates");
const {exerciseService}=require("../exercise-intelligence");
const {slug}=require("../exercise-intelligence/exerciseClassification");
const {ApiError}=require("../lib/apiResponse");
const PATTERNS={squat:"squat",hinge:"hinge",push:"horizontal_push",pull:"horizontal_pull",core:"core"};
function selectExercises({equipment=[],experienceLevel,limitations=[],goal},rankedIds=[]){
 const ceiling={beginner:1,intermediate:2,advanced:3}[experienceLevel];
 const available=new Set(["bodyweight",...equipment]),blocked=new Set(limitations.map(slug));
 const catalog=exerciseService.list();
 const selected=[];
 const ranks=new Map(rankedIds.map((id,i)=>[id,rankedIds.length-i]));
 for(const [pattern,choices] of Object.entries(EXERCISES)){
  const canonicalPattern=PATTERNS[pattern];
  if(blocked.has(pattern)||blocked.has(canonicalPattern))continue;
  const candidates=catalog.filter(e=>{
   const c=e.classification;
   return c.movementPattern===canonicalPattern&&available.has(c.equipment)&&c.difficultyScore<=ceiling&&!e.deprecation.deprecated&&!blocked.has(e.exerciseId)&&!e.contraindications.some(v=>blocked.has(slug(v)))&&c.executionStyle==="controlled"&&c.trainingGoals.some(g=>["strength","general_fitness","muscle_gain"].includes(g));
  });
  const preferred=new Map(choices.map((x,i)=>[x.id,i+1]));
  candidates.sort((a,b)=>(ranks.get(b.exerciseId)||0)-(ranks.get(a.exerciseId)||0)||(preferred.get(b.exerciseId)||0)-(preferred.get(a.exerciseId)||0)||Number(b.classification.trainingGoals.includes(goal))-Number(a.classification.trainingGoals.includes(goal))||a.classification.difficultyScore-b.classification.difficultyScore||a.exerciseId.localeCompare(b.exerciseId));
  const e=candidates[0];if(!e)continue;
  selected.push({id:e.exerciseId,exerciseId:e.exerciseId,equipment:e.classification.equipment,difficulty:e.classification.difficultyScore,movementPattern:pattern,muscleEmphasis:pattern,trainingIntent:"primary",exerciseContentVersion:e.contentVersion});
 }
 if(!selected.length)throw new ApiError("NO_COMPATIBLE_EXERCISES","No compatible exercise candidates for the requested constraints; coach review required.",400);
 return selected;
}
module.exports={selectExercises};
