"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {diagnoseOrganizationalWork}=require("../src/business-os/organization/work-diagnostics");
test("reports precise dependency blocker and next eligible role without authorizing or notifying",()=>{
 const coordinator={listWork:()=>[
  {id:"a",missionType:"DESIGN_EXPERIMENT",state:"COMPLETED",dependencyWorkRefs:[]},
  {id:"b",missionType:"ASSESS_ACCEPTANCE",state:"CREATED",dependencyWorkRefs:["a","c"],eligibleRoleIds:["INDEPENDENT_QA"]},
  {id:"c",missionType:"ASSESS_ECONOMICS",state:"ELIGIBLE",dependencyWorkRefs:[],eligibleRoleIds:["ECONOMICS"]}
 ],events:()=>[{subject:"b",type:"WORK_CREATED",at:"2035-01-01T00:00:00Z"}]};
 const result=diagnoseOrganizationalWork(coordinator);
 assert.equal(result[1].reason,"WAITING_FOR_DEPENDENCIES");
 assert.deepEqual(result[1].dependencyWorkRefs,["c"]);
 assert.equal(result[2].ownerRole,"ECONOMICS");
 assert.equal(result[2].reason,"AWAITING_ASSIGNMENT");
 assert.equal(result[1].notificationSent,false);
 assert.equal(result[2].approvalAuthorized,false);
});
test("failed work preserves first-failure reason",()=>{
 const report=diagnoseOrganizationalWork({listWork:()=>[{id:"f",missionType:"ASSESS_ACCEPTANCE",state:"FAILED"}],events:()=>[{subject:"f",type:"WORK_FAILED",at:"2035-01-01T00:00:00Z",payload:{reason:"qa_evidence_missing"}}]});
 assert.equal(report[0].failureReason,"qa_evidence_missing");
 assert.equal(report[0].requiresAttention,false);
});
