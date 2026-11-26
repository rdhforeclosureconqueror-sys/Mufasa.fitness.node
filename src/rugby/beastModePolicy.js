'use strict';
const seed=require('../../data/rugby/master-intelligence-v1/policies/beast-mode-stage-criteria-candidate.json');
const ids=seed.stages.map(s=>s.id);
const dimensions=new Set(seed.stages.flatMap(s=>s.proposedDimensions));
function validatePolicy(p){
 if(!p||!Array.isArray(p.stages)||p.stages.length!==7||p.stages.some((s,i)=>!s||s.id!==ids[i]))throw Error('Invalid stage sequence');
 for(const s of p.stages){
 if(!Number.isInteger(s.minimumScore)||s.minimumScore<4||s.minimumScore>5)throw Error('Invalid minimum score');
 if(!Number.isInteger(s.candidateMinimumDistinctDays)||s.candidateMinimumDistinctDays<2||s.candidateMinimumDistinctDays>365||!Number.isInteger(s.candidateMinimumSpanDays)||s.candidateMinimumSpanDays<1||s.candidateMinimumSpanDays>365)throw Error('Invalid observation window');
 if(!Array.isArray(s.proposedDimensions)||!s.proposedDimensions.length||new Set(s.proposedDimensions).size!==s.proposedDimensions.length||s.proposedDimensions.some(k=>!dimensions.has(k)))throw Error('Invalid competency dimensions');
 if(!Array.isArray(s.candidateContexts)||!s.candidateContexts.length||s.candidateContexts.some(k=>typeof k!=='string'||!k.trim()||k.length>100))throw Error('Invalid contexts');
 }
 return {stages:p.stages.map(s=>({id:s.id,minimumScore:s.minimumScore,candidateMinimumDistinctDays:s.candidateMinimumDistinctDays,candidateMinimumSpanDays:s.candidateMinimumSpanDays,proposedDimensions:[...s.proposedDimensions],candidateContexts:[...s.candidateContexts]})),automaticProgression:false,activation:false};
}
function defaultPolicy(){return validatePolicy({stages:seed.stages.map(s=>({...s,minimumScore:4}))});}
module.exports={validatePolicy,defaultPolicy};
