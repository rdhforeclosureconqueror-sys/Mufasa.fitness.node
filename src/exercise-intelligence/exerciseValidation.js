"use strict";
const {validateExercise}=require("./exerciseSchema"); const {validateRelationships}=require("./exerciseRelationships");
function validatePlatform(exercises,relationships){const errors=exercises.flatMap(x=>validateExercise(x).errors.map(e=>`${x.exerciseId}: ${e}`));errors.push(...validateRelationships(relationships).errors);const ids=new Set();for(const x of exercises){if(ids.has(x.exerciseId))errors.push(`duplicate exerciseId ${x.exerciseId}`);ids.add(x.exerciseId);}return{valid:!errors.length,errors};}
module.exports={validatePlatform};
