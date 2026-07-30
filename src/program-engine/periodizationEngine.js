"use strict";
function buildPeriodization(durationWeeks){
  const blockLength=4;
  return Array.from({length:Math.ceil(durationWeeks/blockLength)},(_,i)=>{const start=i*blockLength+1,end=Math.min(durationWeeks,start+blockLength-1);return{id:`mesocycle_${i+1}`,phase:i===0?"foundation":i===Math.ceil(durationWeeks/blockLength)-1?"realization":"development",startWeek:start,endWeek:end,weeks:Array.from({length:end-start+1},(_,j)=>({week:start+j,deload:(start+j)%4===0,volumeStep:(start+j-1)%4,intensityStep:Math.floor((start+j-1)/4)}))};});
}
module.exports={buildPeriodization};
