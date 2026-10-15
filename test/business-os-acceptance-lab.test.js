"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {scenarios,runScenario,report}=require("../scripts/business-os-acceptance-lab");
test("acceptance lab: all synthetic scenarios meet expected outcome",()=>{assert.equal(report.mode,"SIMULATED_NO_SIDE_EFFECTS");assert.equal(report.passed,true,JSON.stringify(report.results));assert.equal(report.total,3)});
test("acceptance lab: first failure is observable and does not stop subsequent scenarios",()=>{const results=scenarios.map(runScenario);assert.equal(results.length,3);assert(results.every(x=>x.passed));assert(results.filter(x=>x.actual==="REJECT").every(x=>typeof x.firstFailure==="string"&&x.firstFailure.length>0))});
test("acceptance lab: unexpected rejection fails scenario",()=>{const result=runScenario({id:"bad",expected:"PASS",run(){throw Error("first-boundary:authorization")}});assert.equal(result.passed,false);assert.equal(result.firstFailure,"first-boundary:authorization")});
