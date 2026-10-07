"use strict";

const { DIMENSIONS, ACTIVATION_STATES } = require("./domain");

const DIMENSION_KEYS=Object.freeze(Object.keys(DIMENSIONS));
const QUESTION_CLASS_MULTIPLIERS=Object.freeze({ID:1,BH:1,SC:1.25,ST:1.5,DS:1});
const PRIMARY_WEIGHT=2;
const SECONDARY_WEIGHT=1;

function fail(code,stage,detail,extra={}){return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:code,STAGE:stage,DETAIL:detail,...extra}};}
function pass(stage,detail,extra={}){return {STATUS:"PASS",FIRST_FAILURE:"NONE",STAGE:stage,DETAIL:detail,...extra};}
function validDimension(x){return x==null||DIMENSION_KEYS.includes(x);}

function normalizeQuestion(q){
 if(!q||typeof q!=="object"||!q.id||!QUESTION_CLASS_MULTIPLIERS[q.class]||!Array.isArray(q.options)||q.options.length<2)
  return fail("SA_BANK_SCHEMA","BANK_SCHEMA","Question is missing id, supported class, or options.");
 const options=[];
 for(const o of q.options){
  if(!o||typeof o!=="object"||!validDimension(o.primary_dimension)||!validDimension(o.secondary_dimension))
   return fail("SA_MAPPING_MISSING","BANK_SCHEMA",`Question ${q.id} contains an unknown dimension mapping.`);
  const direction=Number(o.direction_value??0);
  const activation=Number(o.activation_value??0);
  if(!Number.isFinite(direction)||!Number.isFinite(activation))
   return fail("SA_BANK_SCHEMA","BANK_SCHEMA",`Question ${q.id} contains a non-numeric direction or activation value.`);
  options.push({...o,direction_value:direction,activation_value:activation});
 }
 return {ok:true,value:{...q,options}};
}

function normalizeBank(bank){
 if(!Array.isArray(bank)||bank.length===0) return fail("SA_BANK_LOAD","BANK_LOAD","Question bank must be a non-empty array.");
 const ids=new Set(),out=[];
 for(const q of bank){const n=normalizeQuestion(q);if(!n.ok)return n;if(ids.has(n.value.id))return fail("SA_BANK_SCHEMA","BANK_SCHEMA",`Duplicate question id: ${n.value.id}`);ids.add(n.value.id);out.push(n.value);}
 return {ok:true,value:out,diagnostic:pass("BANK_SCHEMA","Question bank schema is valid.",{questionCount:out.length})};
}

function contribution(option,qClass){
 const m=QUESTION_CLASS_MULTIPLIERS[qClass], result={};
 if(option.primary_dimension) result[option.primary_dimension]=(result[option.primary_dimension]||0)+option.direction_value*PRIMARY_WEIGHT*m;
 if(option.secondary_dimension) result[option.secondary_dimension]=(result[option.secondary_dimension]||0)+option.direction_value*SECONDARY_WEIGHT*m;
 return result;
}
function scoreRaw(bank,answers){
 const raw=Object.fromEntries(DIMENSION_KEYS.map(k=>[k,0]));let activationRaw=0,answeredCount=0;
 for(const q of bank){const idx=answers?.[q.id];if(!Number.isInteger(idx)||idx<0||idx>=q.options.length)continue;answeredCount++;const o=q.options[idx];for(const [k,v] of Object.entries(contribution(o,q.class)))raw[k]+=v;activationRaw+=o.activation_value*QUESTION_CLASS_MULTIPLIERS[q.class];}
 return {raw,activationRaw,answeredCount};
}
function computeMaxPossible(bank){
 const max=Object.fromEntries(DIMENSION_KEYS.map(k=>[k,0]));
 for(const q of bank) for(const d of DIMENSION_KEYS){let best=0;for(const o of q.options)best=Math.max(best,contribution(o,q.class)[d]||0);max[d]+=best;}
 return max;
}
function normalizeByMax(raw,max){
 const normalized={};
 for(const d of DIMENSION_KEYS){if(!(max[d]>0))return fail("SA_DIMENSION_ZERO_OPPORTUNITY","MAX_OPPORTUNITY",`Dimension ${d} has zero positive scoring opportunity.`,{dimensionOpportunity:max});normalized[d]=Math.max(0,Math.min(100,(raw[d]/max[d])*100));}
 return {ok:true,value:normalized};
}
function contradictionConsistency(bank,answers){
 const pairs=new Map();
 for(const q of bank) if(q.reverse_pair_id){const a=answers?.[q.id];if(Number.isInteger(a)){const arr=pairs.get(q.reverse_pair_id)||[];arr.push({q,index:a});pairs.set(q.reverse_pair_id,arr);}}
 let checked=0,contradictions=0;
 for(const arr of pairs.values()) if(arr.length===2){checked++;const [a,b]=arr;const maxA=a.q.options.length-1,maxB=b.q.options.length-1;const pa=maxA? a.index/maxA:0,pb=maxB? b.index/maxB:0;if(Math.abs(pa-(1-pb))>0.5)contradictions++;}
 const consistency=checked?100-(contradictions/checked*100):100;
 return {consistency,checkedPairs:checked,contradictions};
}
function completionQuality(answered,total){return total?Math.max(0,Math.min(100,answered/total*100)):0;}
function confidenceScore(completion,consistency){return Math.round((completion*.6+consistency*.4)*100)/100;}
function activationState(raw,answered){
 if(!answered)return {state:"REGULATED",score:0};
 const avg=raw/answered;
 return {state:avg>0.5?"OVERACTIVATED":avg<-.5?"UNDERACTIVATED":"REGULATED",score:avg};
}

function scoreAssessment(bankInput,answers={}){
 const n=normalizeBank(bankInput);if(!n.ok)return n;const bank=n.value;
 const scored=scoreRaw(bank,answers),max=computeMaxPossible(bank),norm=normalizeByMax(scored.raw,max);if(!norm.ok)return norm;
 const contradiction=contradictionConsistency(bank,answers),completion=completionQuality(scored.answeredCount,bank.length),confidence=confidenceScore(completion,contradiction.consistency),activation=activationState(scored.activationRaw,scored.answeredCount);
 return {ok:true,result:{dimension_raw:scored.raw,dimension_max_possible:max,dimension_normalized:norm.value,activation,contradiction,consistency:contradiction.consistency,completion,confidence,answeredCount:scored.answeredCount,questionCount:bank.length},diagnostic:pass("NORMALIZE","Scoring kernel completed through normalized state outputs.",{questionCount:bank.length,answeredCount:scored.answeredCount,dimensionOpportunity:max,confidenceInputs:{completion,consistency:contradiction.consistency}})};
}
module.exports={QUESTION_CLASS_MULTIPLIERS,PRIMARY_WEIGHT,SECONDARY_WEIGHT,normalizeQuestion,normalizeBank,scoreRaw,computeMaxPossible,normalizeByMax,contradictionConsistency,completionQuality,confidenceScore,activationState,scoreAssessment};
