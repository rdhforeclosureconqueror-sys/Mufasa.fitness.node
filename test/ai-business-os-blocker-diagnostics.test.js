"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {inspectOrganizationalBlockers}=require("../src/business-os/organization/blocker-diagnostics");
const fixture=work=>({listWork:()=>work,events:()=>[],data:{assignments:new Map()}});
test("diagnostics distinguish pending dependency from eligible unassigned work",()=>{
 const report=inspectOrganizationalBlockers(fixture([
  {id:"design",state:"COMPLETED",dependencyWorkRefs:[]},
  {id:"qa",state:"CREATED",dependencyWorkRefs:["economics"]},
  {id:"economics",state:"ELIGIBLE",dependencyWorkRefs:["design"]}
 ]));
 assert.equal(report.total,3);
 assert.equal(report.incomplete,2);
 assert.deepEqual(report.items[0].waitingOn,["economics"]);
 assert.equal(report.items[0].reason,"DEPENDENCY_BLOCKED");
 assert.equal(report.items[1].reason,"AWAITING_ASSIGNMENT");
 assert.ok(report.items.every(x=>x.notificationSent===false&&x.approvalGranted===false));
});
test("diagnostics preserve execution state without fabricating authorization",()=>{
 const coordinator=fixture([{id:"qa",state:"ASSIGNED",dependencyWorkRefs:[]}]);
 coordinator.data.assignments.set("a",{id:"a",workId:"qa",roleId:"INDEPENDENT_QA",status:"ACTIVE"});
 const item=inspectOrganizationalBlockers(coordinator).items[0];
 assert.equal(item.ownerRole,"INDEPENDENT_QA");
 assert.equal(item.reason,"AWAITING_EXECUTION");
 assert.equal(item.approvalGranted,false);
});

test("failure diagnostics link to canonical coordinator failure event",()=>{
 const coordinator=fixture([{id:"qa",state:"FAILED",dependencyWorkRefs:[]}]);
 coordinator.events=()=>[{type:"WORK_FAILED",subject:"qa",idempotencyKey:"WORK_FAILED:qa:1",payload:{reason:"test_error"}}];
 const item=inspectOrganizationalBlockers(coordinator).items[0];
 assert.equal(item.reason,"EXECUTION_FAILED");
 assert.equal(item.failureEventRef,"WORK_FAILED:qa:1");
});
