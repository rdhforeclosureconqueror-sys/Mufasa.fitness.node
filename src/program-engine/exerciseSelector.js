"use strict";
const { EXERCISES }=require("./programTemplates");
function selectExercises({equipment,experienceLevel,limitations=[]}){
  const ceiling={beginner:1,intermediate:2,advanced:3}[experienceLevel];
  return Object.entries(EXERCISES).map(([pattern,choices])=>{
    const candidates=choices.filter(x=>equipment.includes(x.equipment)&&x.difficulty<=ceiling&&!limitations.includes(pattern));
    const chosen=candidates.at(-1)||choices[0]; return {...chosen,movementPattern:pattern,muscleEmphasis:pattern,trainingIntent:"primary"};
  });
}
module.exports={selectExercises};
