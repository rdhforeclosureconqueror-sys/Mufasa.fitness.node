"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {scenarios,runScenario}=require("../scripts/business-os-acceptance-lab");
test("rejection scenarios fail only at their intended boundary",()=>{for(const s of scenarios.filter(x=>x.expected==="REJECT")){const result=runScenario(s);assert.equal(result.firstFailure,s.expectedFailure);assert.equal(result.passed,true)}});
test("wrong rejection reason does not pass acceptance",()=>{const result=runScenario({id:"wrong-boundary",expected:"REJECT",expectedFailure:"denied:authority",run(){throw Error("invalid_input")}});assert.equal(result.passed,false)});
test("mobile diagnostics allow wrapping long commit hashes",()=>{const html=fs.readFileSync("public/admin-acceptance-lab.html","utf8");assert.match(html,/#summary\{overflow-wrap:anywhere/);assert.match(html,/#report\{max-width:100%/)});
