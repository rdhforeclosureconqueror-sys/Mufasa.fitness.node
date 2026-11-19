"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationRecoveryInspector}=require("../src/business-os/organization/notification-recovery-inspector");
const record={organizationId:"org-a",idempotencyKey:"key",status:"PENDING"};
function fixture(attempts,notification=record){
 let sends=0;
 const inspector=createNotificationRecoveryInspector({
  ledger:{async list(org,key){assert.equal(org,"org-a");assert.equal(key,"key");return attempts}},
  lifecycle:{async list(org){assert.equal(org,"org-a");return notification?[{record:notification}]:[]}}
 });
 return {inspector,sendCount:()=>sends};
}
for(const outcome of ["STARTED","UNKNOWN"]){
 test("restart with "+outcome+" attempt requires reconciliation, never resend",async()=>{
  const f=fixture([{attempt_id:"a1",outcome}]);const r=await f.inspector.inspect({organizationId:"org-a",key:"key"});
  assert.equal(r.status,"RECONCILIATION_REQUIRED");assert.equal(r.reason,"unresolved_attempt");assert.deepEqual(r.attemptIds,["a1"]);assert.equal(f.sendCount(),0);
 });
}
test("verified receipt with pending lifecycle requires reconciliation",async()=>{
 const f=fixture([{attempt_id:"a1",outcome:"VERIFIED"}]);const r=await f.inspector.inspect({organizationId:"org-a",key:"key"});
 assert.equal(r.status,"RECONCILIATION_REQUIRED");assert.equal(r.reason,"verified_attempt_pending_lifecycle");
});
test("no attempts does not authorize dispatch",async()=>{
 const f=fixture([]);const r=await f.inspector.inspect({organizationId:"org-a",key:"key"});
 assert.equal(r.status,"NO_UNRESOLVED_ATTEMPT");assert.equal(r.dispatchAuthorized,false);
});
test("missing scoped notification is not exposed",async()=>{
 const f=fixture([],null);assert.equal((await f.inspector.inspect({organizationId:"org-a",key:"key"})).status,"NOT_FOUND");
});
test("malformed ledger fails closed",async()=>{
 const f=fixture([{attempt_id:"a1",outcome:"UNRECOGNIZED"}]);await assert.rejects(()=>f.inspector.inspect({organizationId:"org-a",key:"key"}),/notification_recovery_ledger_invalid/);
});
