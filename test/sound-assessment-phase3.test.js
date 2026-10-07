"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const A=require("../src/sound-assessment/balance-auditor");
const dims=["GR","EF","AG","CO","EX","CL","SP"];
function balancedBank(){
 const bank=[];
 for(let q=0;q<7;q++)bank.push({id:`q${q}`,class:"ID",options:dims.map((d,i)=>({primary_dimension:d,secondary_dimension:dims[(i+q+1)%7],direction_value:1,activation_value:0}))});
 return bank;
}
test("balanced fixture passes structural and simulation gates",()=>{const r=A.auditBalance(balancedBank(),{randomRuns:64});assert.equal(r.ok,true);assert.equal(r.report.FIRST_FAILURE,"NONE");assert.equal(r.report.questionCount,7);});
test("zero-opportunity dimension fails closed",()=>{const b=balancedBank().map(q=>({...q,options:q.options.filter(o=>o.primary_dimension!=="SP"&&o.secondary_dimension!=="SP")}));const r=A.auditBalance(b);assert.equal(r.ok,false);assert.equal(r.diagnostic.FIRST_FAILURE,"SA_DIMENSION_ZERO_OPPORTUNITY");});
test("weighted opportunity dominance is detected",()=>{const b=balancedBank();for(const q of b)q.options.push({primary_dimension:"GR",secondary_dimension:"GR",direction_value:1});const r=A.auditBalance(b,{maxOpportunityRatio:1.2});assert.equal(r.ok,false);assert.equal(r.diagnostic.FIRST_FAILURE,"SA_WEIGHT_DOMINANCE");});
test("answer-position concentration is detected",()=>{const b=balancedBank();for(const q of b)q.options[0]={primary_dimension:"GR",secondary_dimension:"GR",direction_value:1};const r=A.auditBalance(b,{maxOpportunityRatio:10,maxPositionShare:.4});assert.equal(r.ok,false);assert.equal(r.diagnostic.FIRST_FAILURE,"SA_POSITION_BIAS");});
test("seeded random answers are deterministic",()=>{assert.deepEqual(A.seededRandomAnswers(balancedBank(),42),A.seededRandomAnswers(balancedBank(),42));});
test("positional simulations include every answer index",()=>{const r=A.simulate(balancedBank(),16);assert.equal(r.ok,true);assert.equal(Object.keys(r.value.positional).length,7);assert.equal(r.value.positionalCoverage,7);assert.equal(r.value.random.runs,16);});
test("mapping audit reports primary secondary and weighted opportunities",()=>{const m=A.mappingAudit(balancedBank());for(const d of dims){assert.ok(m.primary[d]>0);assert.ok(m.secondary[d]>0);assert.ok(m.weighted[d]>0);}});

test("mixed option counts only simulate positions shared by every question",()=>{
 const b=balancedBank();b[0]={...b[0],options:b[0].options.slice(0,4)};
 const r=A.simulate(b,8);assert.equal(r.ok,true);assert.equal(r.value.positionalCoverage,4);assert.equal(Object.keys(r.value.positional).length,4);assert.equal(A.positionalAnswers(b,4),null);
});
test("random tie wins are fractionally allocated and sum to run count",()=>{
 const r=A.simulate(balancedBank(),32);assert.equal(r.ok,true);
 const total=Object.values(r.value.random.wins).reduce((a,b)=>a+b,0);assert.ok(Math.abs(total-32)<1e-9);
});
test("invalid random run count fails closed",()=>{const r=A.simulate(balancedBank(),0);assert.equal(r.ok,false);assert.equal(r.diagnostic.FIRST_FAILURE,"SA_BANK_SCHEMA");});

test("seeded four-option simulations do not collapse to one modulo cycle",()=>{
 const seen=new Set();for(let seed=1;seed<=32;seed++){const a=A.seededRandomAnswers(balancedBank(),seed);seen.add(Object.values(a).join(","));}
 assert.ok(seen.size>4);
});
