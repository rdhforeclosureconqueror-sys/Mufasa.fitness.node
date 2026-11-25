'use strict';
function validateCheckin(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid check-in');
 const {date,readiness,teamHighLoad=false,injuryConcern=false,week=1}=input;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid date');
 if(!['fresh','normal','fatigued','pain'].includes(readiness))throw Error('Invalid readiness');
 if(typeof teamHighLoad!=='boolean'||typeof injuryConcern!=='boolean')throw Error('Invalid readiness flags');
 if(!Number.isInteger(week)||week<1||week>8)throw Error('Invalid program week');
 const result={date,readiness,teamHighLoad,injuryConcern,week};
 if(input.recovery!==undefined){
  const r=input.recovery,keys=['sleepQuality','physicalFatigue','mentalFatigue','soreness','stress','wellbeing'];
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['sleepHours','hydration',...keys].includes(k))||!Number.isFinite(r.sleepHours)||r.sleepHours<0||r.sleepHours>24||!keys.every(k=>Number.isInteger(r[k])&&r[k]>=1&&r[k]<=5)||!['good','unsure','poor'].includes(r.hydration))throw Error('Invalid recovery measurements');
  result.recovery={scaleVersion:'v1',sleepHours:r.sleepHours,hydration:r.hydration,...Object.fromEntries(keys.map(k=>[k,r[k]]))};
 }
 return result;
}
module.exports={validateCheckin};
