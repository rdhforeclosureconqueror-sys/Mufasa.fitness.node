"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationRecoveryReconciliation}=require("../src/business-os/organization/notification-recovery-reconciliation");
const args={organizationId:"org",key:"key",attemptId:"a1",actor:{id:"admin"}};
function make(state){
 let calls=0;
 const api=createNotificationRecoveryReconciliation({
  evidence:{async inspect(){return state}},
  writer:{async confirmVerified(input){calls++;assert.equal(input.organizationId,"org");assert.equal(input.attemptId,"a1");return {status:"VERIFIED",attemptId:"a1"}}}
 });
 return {api,calls:()=>calls};
}
test("reconciles a single scoped receipt through trusted writer",async()=>{
 const f=make({status:"RECONCILIATION_REQUIRED",reason:"unresolved_attempt",attempts:[{attemptId:"a1",status:"EVIDENCE_AVAILABLE",receipt:"ref"}]});
 assert.deepEqual(await f.api.reconcile(args),{status:"ATTEMPT_VERIFIED",attemptId:"a1",lifecycleUpdated:false});assert.equal(f.calls(),1);
});
for(const [name,state] of [
 ["no unresolved",{status:"NO_UNRESOLVED_ATTEMPT"}],
 ["already verified lifecycle",{status:"RECONCILIATION_REQUIRED",reason:"verified_attempt_pending_lifecycle",attempts:[{attemptId:"a1",status:"EVIDENCE_AVAILABLE",receipt:"ref"}]}],
 ["unknown evidence",{status:"RECONCILIATION_REQUIRED",reason:"unresolved_attempt",attempts:[{attemptId:"a1",status:"UNKNOWN"}]}],
 ["cross attempt",{status:"RECONCILIATION_REQUIRED",reason:"unresolved_attempt",attempts:[{attemptId:"other",status:"EVIDENCE_AVAILABLE",receipt:"ref"}]}],
 ["duplicate attempt",{status:"RECONCILIATION_REQUIRED",reason:"unresolved_attempt",attempts:[{attemptId:"a1",status:"EVIDENCE_AVAILABLE",receipt:"ref"},{attemptId:"a1",status:"EVIDENCE_AVAILABLE",receipt:"ref"}]}]
]){
 test(name+" is blocked without writer invocation",async()=>{
  const f=make(state);assert.equal((await f.api.reconcile(args)).status,"BLOCKED");assert.equal(f.calls(),0);
 });
}
test("invalid scope is rejected",async()=>{const f=make({});await assert.rejects(()=>f.api.reconcile({...args,organizationId:""}),/scope_required/)});
