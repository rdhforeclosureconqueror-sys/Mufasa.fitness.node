"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {run,EXISTING}=require("../scripts/marketing-bot-role-coverage-inventory");
test("implemented Economics is not mislabeled as acceptance pass",async()=>{
 const report=await run({canonical:async()=>({roles:[{role:"ECONOMICS",status:"BLOCKED",reason:"NO_REGISTERED_ROLE_ACCEPTANCE"},{role:"SALES",status:"INTERNAL_PASS"}],firstFailure:null})});
 assert.equal(report.roles[0].status,"BLOCKED");
 assert.equal(report.roles[0].implementationEvidence.scope,"IMPLEMENTATION_FOUND_ACCEPTANCE_NOT_WIRED");
 assert.equal(report.firstFailure.role,"ECONOMICS");
 assert.equal(report.platinumCertified,false);assert.equal(report.customerJourneyVerified,false);
});
test("all seven remaining roles have explicit evidence and limitations",()=>{
 assert.deepEqual(Object.keys(EXISTING),["EXPERIMENT_MANAGER","ECONOMICS","SALES","PRODUCTION","QA","LEARNING","MANAGER"]);
 for(const role of Object.values(EXISTING)){assert.ok(role.evidence);assert.ok(role.scope);}
});
