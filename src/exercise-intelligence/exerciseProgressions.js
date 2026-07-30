"use strict";
const {relationships}=require("./exerciseRelationships");
const progressionNodes=Object.freeze(relationships.map(r=>Object.freeze({progressionId:`prog_${r.relationshipId}`,relationshipId:r.relationshipId,exerciseId:r.toExerciseId,prerequisites:Object.freeze([r.fromExerciseId]),minimumCompetency:.8,movementQualityRequirements:Object.freeze(["controlled_range","stable_alignment"]),equipment:Object.freeze([]),difficultyDelta:r.difficultyDelta,recommendedNextStep:r.toExerciseId})));
function nextSteps(exerciseId,{competency=0,movementQuality=[]}={}){return progressionNodes.filter(n=>n.prerequisites.includes(exerciseId)&&competency>=n.minimumCompetency&&n.movementQualityRequirements.every(x=>movementQuality.includes(x)));}
module.exports={progressionNodes,nextSteps};
