"use strict";
const { EXERCISES }=require("./programTemplates");
const {exerciseService}=require("../exercise-intelligence");
function selectExercises({equipment,experienceLevel,limitations=[]}){
  const ceiling={beginner:1,intermediate:2,advanced:3}[experienceLevel];
  return Object.entries(EXERCISES).map(([pattern,choices])=>{
    const candidates=choices.filter(x=>equipment.includes(x.equipment)&&x.difficulty<=ceiling&&!limitations.includes(pattern));
    const chosen=candidates.at(-1)||choices[0],canonical=exerciseService.get(chosen.id); return {...chosen,exerciseId:canonical.exerciseId,movementPattern:pattern,muscleEmphasis:pattern,trainingIntent:"primary",exerciseContentVersion:canonical.contentVersion};
  });
}
module.exports={selectExercises};
