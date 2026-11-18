"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createSimulationRunner}=require("../src/business-os/simulation/runner");
const {SCENARIOS}=require("../src/business-os/simulation/scenarios");
const {evaluateSimulationRun}=require("../src/business-os/simulation/academy-adapter");
test("governed organization action passes through real world and Academy adapter",async()=>{
 let decisions=0,performed=0;
 const brain={async decide(){return ++decisions===1?{actions:[{id:"market-1",type:"OBSERVE_MARKET",payload:{}}],evidenceRefs:["brain:market-observation"]}:{actions:[],evidenceRefs:["brain:stop"]}}};
 const organization={reference:"synthetic-governed-organization",async perform({proposal}){performed++;assert.equal(proposal.type,"OBSERVE_MARKET");return {workRef:"work:market-1",actorRef:"role:scout",authority:{allowed:true},evidenceRefs:["organization:governed-market"]}}};
 const report=await createSimulationRunner({brain,organization,id:(()=>{let i=0;return()=>`synthetic-${++i}`})()}).run({scenario:structuredClone(SCENARIOS.GOLDEN_CYCLE),maxCycles:3});
 assert.equal(report.gate,"PASS",JSON.stringify(report.diagnostics));
 assert.equal(performed,1);assert.equal(report.cycles[0].observations[0].type,"MARKET");
 const evaluation=evaluateSimulationRun(report);assert.equal(evaluation.verdict,"PASS",JSON.stringify(evaluation.assertions));
});
test("organization authority denial fails closed before world transition",async()=>{
 const brain={async decide(){return {actions:[{id:"blocked-1",type:"OBSERVE_MARKET",payload:{}}]}}};
 const organization={async perform(){return {workRef:"work:blocked",actorRef:"role:scout",authority:{allowed:false},evidenceRefs:["denied"]}}};
 const report=await createSimulationRunner({brain,organization}).run({scenario:structuredClone(SCENARIOS.GOLDEN_CYCLE),maxCycles:1});
 assert.equal(report.gate,"FAIL");assert.ok(report.diagnostics.simulationFirstFailure);
});
