"use strict";
const { EXERCISES }=require("./programTemplates");
function substitute(exercise,constraints={}){const equipment=["bodyweight",...(constraints.equipment||[])],max=constraints.temporaryRegression?Math.max(1,exercise.difficulty-1):exercise.difficulty;const candidate=(EXERCISES[exercise.movementPattern]||[]).filter(x=>equipment.includes(x.equipment)&&x.difficulty<=max).at(-1);if(!candidate||candidate.id===exercise.id)return{...exercise,substitution:null};return{...exercise,...candidate,substitution:{from:exercise.id,reason:constraints.reason||"equipment_unavailable",preserved:["movement_pattern","training_intent","muscle_emphasis","difficulty_ceiling"]}};}
module.exports={substitute};
