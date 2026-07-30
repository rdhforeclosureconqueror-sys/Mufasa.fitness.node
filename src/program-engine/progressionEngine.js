"use strict";
function prescribe(base,{week,deload},history=[]){
  const prior=history.filter(h=>h.exerciseId===base.id).sort((a,b)=>b.completedAt-a.completedAt)[0];
  const eligible=prior?.status==="completed"&&Number(prior.completionPercent??100)>=90&&prior.painFlag!==true;
  const step=eligible?Math.floor((week-1)/2):0;
  if(deload)return{sets:Math.max(1,Math.floor(base.sets*.6)),reps:base.reps,intensityRpe:Math.max(3,base.intensity-2),tempo:"3-1-2",progression:"scheduled_deload"};
  return{sets:base.sets+(step>=2?1:0),reps:base.reps+(step%2),intensityRpe:Math.min(9,base.intensity+Math.floor(step/2)),tempo:step>=3?"3-1-1":"2-1-2",progression:eligible?"earned":"preserved"};
}
module.exports={prescribe};
