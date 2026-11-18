"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {run}=require("../scripts/marketing-bot-canonical-role-evidence");
const baseline=()=>({roles:["SCOUT","ANALYST","EXPERIMENT_MANAGER","SALES"].map(role=>({role,status:"BLOCKED",reason:"NO_REGISTERED_ROLE_ACCEPTANCE"}))});
test("reuses canonical architecture while withholding Platinum",async()=>{
 const r=await run({baseline,scout:async()=>({architecture:{scenarioCount:24,failed:[]},certified:false}),analyst:async()=>({architecture:{scenarioCount:42,failed:[]},architectureReady:true,certified:false})});
 assert.equal(r.roles[0].status,"INTERNAL_PASS");assert.equal(r.roles[1].status,"INTERNAL_PASS");assert.equal(r.roles[2].status,"BLOCKED");assert.equal(r.platinumCertified,false);assert.equal(r.liveEnabled,false);
});
test("surfaces first actual architecture failure",async()=>{
 const r=await run({baseline,scout:async()=>({architecture:{scenarioCount:24,failed:[{scenarioId:"scout-1",firstFailure:"source_conflict"}]},certified:false}),analyst:async()=>({architecture:{scenarioCount:42,failed:[]},architectureReady:true,certified:false})});
 assert.equal(r.firstFailure.role,"SCOUT");assert.equal(r.firstFailure.firstFailure.firstFailure,"source_conflict");
});
