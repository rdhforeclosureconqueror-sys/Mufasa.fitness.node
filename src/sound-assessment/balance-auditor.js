"use strict";

const { normalizeBank, computeMaxPossible, scoreAssessment, QUESTION_CLASS_MULTIPLIERS, PRIMARY_WEIGHT, SECONDARY_WEIGHT } = require("./scoring");
const { DIMENSIONS } = require("./domain");
const DIMENSION_KEYS=Object.freeze(Object.keys(DIMENSIONS));

function blank(){return Object.fromEntries(DIMENSION_KEYS.map(d=>[d,0]));}
function spread(values){const xs=Object.values(values);return Math.max(...xs)-Math.min(...xs);}
function optionPositionAudit(bank){
 const positions={};
 for(const q of bank) q.options.forEach((o,i)=>{
  const key=String(i); positions[key] ||= blank();
  if(o.primary_dimension) positions[key][o.primary_dimension]+=PRIMARY_WEIGHT*QUESTION_CLASS_MULTIPLIERS[q.class];
  if(o.secondary_dimension) positions[key][o.secondary_dimension]+=SECONDARY_WEIGHT*QUESTION_CLASS_MULTIPLIERS[q.class];
 });
 return positions;
}
function mappingAudit(bank){
 const primary=blank(),secondary=blank(),weighted=blank();
 for(const q of bank) for(const o of q.options){
  const m=QUESTION_CLASS_MULTIPLIERS[q.class];
  if(o.primary_dimension){primary[o.primary_dimension]++;weighted[o.primary_dimension]+=PRIMARY_WEIGHT*m;}
  if(o.secondary_dimension){secondary[o.secondary_dimension]++;weighted[o.secondary_dimension]+=SECONDARY_WEIGHT*m;}
 }
 return {primary,secondary,weighted};
}
function positionalAnswers(bank,index){
 if(!Number.isInteger(index)||index<0||bank.some(q=>index>=q.options.length)) return null;
 return Object.fromEntries(bank.map(q=>[q.id,index]));
}
function seededRandomAnswers(bank,seed){
 let x=(seed>>>0)||1;const out={};
 for(const q of bank){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);const u=((t^(t>>>14))>>>0)/0x100000000;out[q.id]=Math.floor(u*q.options.length);}
 return out;
}
function winners(normalized){
 const max=Math.max(...Object.values(normalized));return DIMENSION_KEYS.filter(d=>Math.abs(normalized[d]-max)<1e-9);
}
function simulate(bank,randomRuns=128){
 if(!Number.isInteger(randomRuns)||randomRuns<1)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_BANK_SCHEMA",STAGE:"BANK_SCHEMA",DETAIL:"randomRuns must be a positive integer."}};
 const positional={};
 const minOptions=Math.min(...bank.map(q=>q.options.length));
 for(let i=0;i<minOptions;i++){const answers=positionalAnswers(bank,i);const r=scoreAssessment(bank,answers);if(!r.ok)return r;positional[String(i)]={scores:r.result.dimension_normalized,winners:winners(r.result.dimension_normalized)};}
 const randomWins=blank(),randomMean=blank();
 for(let seed=1;seed<=randomRuns;seed++){const r=scoreAssessment(bank,seededRandomAnswers(bank,seed));if(!r.ok)return r;for(const d of DIMENSION_KEYS)randomMean[d]+=r.result.dimension_normalized[d]/randomRuns;const ws=winners(r.result.dimension_normalized);for(const d of ws)randomWins[d]+=1/ws.length;}
 return {ok:true,value:{positional,positionalCoverage:minOptions,random:{runs:randomRuns,wins:randomWins,mean:randomMean}}};
}
function auditBalance(bankInput,{randomRuns=128,maxOpportunityRatio=2,maxPositionShare=.5,maxRandomWinShare=.45}={}){
 const n=normalizeBank(bankInput);if(!n.ok)return n;const bank=n.value;
 const opportunity=computeMaxPossible(bank);
 if(Object.values(opportunity).some(v=>!(v>0)))return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_DIMENSION_ZERO_OPPORTUNITY",STAGE:"MAX_OPPORTUNITY",DETAIL:"Every dimension requires positive scoring opportunity.",dimensionOpportunity:opportunity}};
 const min=Math.min(...Object.values(opportunity)),max=Math.max(...Object.values(opportunity));
 if(max/min>maxOpportunityRatio)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_WEIGHT_DOMINANCE",STAGE:"MAX_OPPORTUNITY",DETAIL:`Weighted opportunity ratio ${(max/min).toFixed(2)} exceeds ${maxOpportunityRatio}.`,dimensionOpportunity:opportunity}};
 const position=optionPositionAudit(bank),mapping=mappingAudit(bank);
 for(const [pos,counts] of Object.entries(position)){const total=Object.values(counts).reduce((a,b)=>a+b,0);if(total&&Math.max(...Object.values(counts))/total>maxPositionShare)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_POSITION_BIAS",STAGE:"BANK_SCHEMA",DETAIL:`Answer position ${pos} is overly concentrated in one dimension.`,positionAudit:position}};}
 const sims=simulate(bank,randomRuns);if(!sims.ok)return sims;
 const randomShare=Object.fromEntries(DIMENSION_KEYS.map(d=>[d,sims.value.random.wins[d]/randomRuns]));
 if(Math.max(...Object.values(randomShare))>maxRandomWinShare)return {ok:false,diagnostic:{STATUS:"FAIL",FIRST_FAILURE:"SA_WEIGHT_DOMINANCE",STAGE:"NORMALIZE",DETAIL:"Random-response simulation shows excessive winner concentration.",randomWinShare:randomShare}};
 return {ok:true,report:{STATUS:"PASS",FIRST_FAILURE:"NONE",STAGE:"NORMALIZE",DETAIL:"Balance audit passed configured structural gates.",questionCount:bank.length,dimensionOpportunity:opportunity,opportunityRatio:max/min,mapping,positionAudit:position,simulations:sims.value,randomWinShare:randomShare}};
}
module.exports={optionPositionAudit,mappingAudit,positionalAnswers,seededRandomAnswers,winners,simulate,auditBalance,spread};
