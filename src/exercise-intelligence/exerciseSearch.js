"use strict";
const {slug}=require("./exerciseClassification"); const {filterExercises}=require("./exerciseFilters");
function score(exercise,query){const q=slug(query);if(!q)return 1;if(exercise.exerciseId===q)return 100;if(exercise.aliases.some(x=>slug(x)===q))return 90;if(slug(exercise.displayName).startsWith(q))return 75;const fields=[exercise.displayName,...exercise.aliases,...exercise.searchKeywords,...exercise.classification.primaryMuscles,exercise.classification.equipment,exercise.classification.movementPattern].map(slug);return fields.some(x=>x.includes(q))?50:0;}
function search(exercises,query="",filters={}){return filterExercises(exercises,filters).map(exercise=>({exercise,score:score(exercise,query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.exercise.exerciseId.localeCompare(b.exercise.exerciseId)).map(x=>x.exercise);}
module.exports={score,search};
