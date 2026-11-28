"use strict";
function timestamp(value){return typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)?Date.parse(value):NaN;}
function prescribe(base,{week,deload},history=[]){
  const records=history.filter(h=>h&&h.exerciseId===(base.exerciseId||base.id));
  const validDates=records.every(h=>Number.isFinite(timestamp(h.completedAt)));
  const sorted=validDates?records.slice().sort((a,b)=>timestamp(b.completedAt)-timestamp(a.completedAt)):[];
  const prior=sorted[0];
  const ambiguous=sorted.length>1&&timestamp(sorted[0].completedAt)===timestamp(sorted[1].completedAt);
  const eligible=!ambiguous&&prior?.status==="completed"&&Number.isFinite(prior.completionPercent)&&prior.completionPercent>=90&&prior.completionPercent<=100&&prior.painFlag===false;
  const step=eligible?Math.floor((week-1)/2):0;
  if(deload)return{sets:Math.max(1,Math.floor(base.sets*.6)),reps:base.reps,intensityRpe:Math.max(3,base.intensity-2),tempo:"3-1-2",progression:"scheduled_deload"};
  return{sets:base.sets+(step>=2?1:0),reps:base.reps+(step%2),intensityRpe:Math.min(9,base.intensity+Math.floor(step/2)),tempo:step>=3?"3-1-1":"2-1-2",progression:eligible?"earned":"preserved"};
}
module.exports={prescribe};
