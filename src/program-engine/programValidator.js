"use strict";
const { ApiError } = require("../lib/apiResponse");
const { GOALS, DIFFICULTIES } = require("./programTemplates");

function validateInputs(input={}) {
  const goal=String(input.goal||"general_fitness").toLowerCase().replaceAll(" ","_");
  const experienceLevel=String(input.experienceLevel||input.difficulty||"beginner").toLowerCase();
  if(!GOALS.includes(goal)) throw new ApiError("INVALID_PROGRAM_GOAL",`Unsupported goal '${goal}'`,400);
  if(!DIFFICULTIES.includes(experienceLevel)) throw new ApiError("INVALID_EXPERIENCE_LEVEL",`Unsupported experience '${experienceLevel}'`,400);
  const trainingDays=Number(input.trainingDays||input.daysPerWeek||3), durationWeeks=Number(input.durationWeeks||8), sessionDuration=Number(input.sessionDuration||45);
  if(!Number.isInteger(trainingDays)||trainingDays<1||trainingDays>6) throw new ApiError("INVALID_TRAINING_DAYS","trainingDays must be 1-6",400);
  if(!Number.isInteger(durationWeeks)||durationWeeks<4||durationWeeks>52) throw new ApiError("INVALID_PROGRAM_DURATION","durationWeeks must be 4-52",400);
  if(!Number.isFinite(sessionDuration)||sessionDuration<15||sessionDuration>120) throw new ApiError("INVALID_SESSION_DURATION","sessionDuration must be 15-120",400);
  const availableDays=Array.isArray(input.availableDays)&&input.availableDays.length ? [...new Set(input.availableDays.map(Number))] : [1,3,5,6,2,4].slice(0,trainingDays);
  if(availableDays.some(d=>!Number.isInteger(d)||d<0||d>6)||availableDays.length<trainingDays) throw new ApiError("INVALID_AVAILABLE_DAYS","availableDays must contain enough unique weekdays (0-6)",400);
  return Object.freeze({ goal, experienceLevel, trainingDays, durationWeeks, sessionDuration, availableDays:availableDays.slice(0,trainingDays).sort(), equipment:[...new Set(["bodyweight",...(input.equipment||[])])].sort(), limitations:(input.limitations||[]).map(String).sort(), preferredSplit:String(input.preferredSplit||"full_body") });
}
function validateProgram(program){if(!program||program.schemaVersion!==1||!program.programId||!Array.isArray(program.microcycles))throw new ApiError("INVALID_PROGRAM","Program schema is invalid",500);return program;}
module.exports={validateInputs,validateProgram};
