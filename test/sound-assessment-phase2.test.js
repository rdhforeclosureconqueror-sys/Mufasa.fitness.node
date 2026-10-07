"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const S=require("../src/sound-assessment/scoring");
const bank=[
 {id:"q1",class:"ID",options:[
  {primary_dimension:"GR",secondary_dimension:"EF",direction_value:0,activation_value:-1},
  {primary_dimension:"GR",secondary_dimension:"EF",direction_value:1,activation_value:1}]},
 {id:"q2",class:"ST",reverse_pair_id:"r1",options:[
  {primary_dimension:"EF",secondary_dimension:"GR",direction_value:0,activation_value:-1},
  {primary_dimension:"EF",secondary_dimension:"GR",direction_value:1,activation_value:1}]},
 {id:"q3",class:"ST",reverse_pair_id:"r1",options:[
  {primary_dimension:"AG",secondary_dimension:"CO",direction_value:0,activation_value:-1},
  {primary_dimension:"AG",secondary_dimension:"CO",direction_value:1,activation_value:1}]},
 {id:"q4",class:"SC",options:[{primary_dimension:"EX",secondary_dimension:"CL",direction_value:0},{primary_dimension:"EX",secondary_dimension:"CL",direction_value:1}]},
 {id:"q5",class:"DS",options:[{primary_dimension:"SP",direction_value:0},{primary_dimension:"SP",direction_value:1}]},
];
test("Garvey-derived starting weights are explicit",()=>{assert.deepEqual(S.QUESTION_CLASS_MULTIPLIERS,{ID:1,BH:1,SC:1.25,ST:1.5,DS:1});assert.equal(S.PRIMARY_WEIGHT,2);assert.equal(S.SECONDARY_WEIGHT,1);});
test("max opportunity is calculated per dimension from actual mappings",()=>{const n=S.normalizeBank(bank);assert.equal(n.ok,true);const m=S.computeMaxPossible(n.value);assert.deepEqual(m,{GR:3.5,EF:4,AG:3,CO:1.5,EX:2.5,CL:1.25,SP:2});});
test("scoring normalizes against each dimension's own opportunity",()=>{const r=S.scoreAssessment(bank,{q1:1,q2:1,q3:1,q4:1,q5:1});assert.equal(r.ok,true);for(const v of Object.values(r.result.dimension_normalized))assert.equal(v,100);assert.equal(r.result.completion,100);});
test("zero-opportunity dimensions fail closed",()=>{const tiny=[{id:"x",class:"ID",options:[{primary_dimension:"GR",direction_value:0},{primary_dimension:"GR",direction_value:1}]}];const r=S.scoreAssessment(tiny,{x:1});assert.equal(r.ok,false);assert.equal(r.diagnostic.FIRST_FAILURE,"SA_DIMENSION_ZERO_OPPORTUNITY");});
test("unknown mappings and malformed banks fail closed",()=>{assert.equal(S.scoreAssessment(null,{}).diagnostic.FIRST_FAILURE,"SA_BANK_LOAD");const bad=[{id:"x",class:"ID",options:[{primary_dimension:"NOPE"},{primary_dimension:"GR"}]}];assert.equal(S.scoreAssessment(bad,{}).diagnostic.FIRST_FAILURE,"SA_MAPPING_MISSING");});
test("reverse pairs affect consistency and confidence",()=>{const consistent=S.scoreAssessment(bank,{q1:1,q2:0,q3:1,q4:1,q5:1});const contradictory=S.scoreAssessment(bank,{q1:1,q2:1,q3:1,q4:1,q5:1});assert.equal(consistent.result.consistency,100);assert.equal(contradictory.result.consistency,0);assert.ok(consistent.result.confidence>contradictory.result.confidence);});
test("activation is directional rather than a chakra dimension",()=>{assert.equal(S.activationState(5,5).state,"OVERACTIVATED");assert.equal(S.activationState(-5,5).state,"UNDERACTIVATED");assert.equal(S.activationState(0,5).state,"REGULATED");});
test("no reverse-pair evidence does not manufacture perfect consistency",()=>{const noPairs=[{id:"a",class:"ID",options:[{primary_dimension:"GR",direction_value:0},{primary_dimension:"GR",direction_value:1}]}];const x=S.contradictionConsistency(noPairs,{a:1});assert.equal(x.consistency,null);assert.equal(S.confidenceScore(40,x.consistency),40);});
test("class weighting does not distort activation average",()=>{assert.equal(S.activationState(1.5,1.5).state,"OVERACTIVATED");assert.equal(S.activationState(-1.5,1.5).state,"UNDERACTIVATED");});
test("partial completion lowers confidence",()=>{const full=S.scoreAssessment(bank,{q1:1,q2:0,q3:1,q4:1,q5:1});const partial=S.scoreAssessment(bank,{q1:1,q2:0,q3:1,q4:1});assert.ok(full.result.confidence>partial.result.confidence);});
