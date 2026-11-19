"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationAttemptDispatchBridge}=require("../src/business-os/organization/notification-attempt-dispatch-bridge");
for(const [outcome,reason] of [["VERIFIED","verified_attempt_persistence_failed"],["UNKNOWN","unknown_attempt_persistence_failed"]]){
 test("ledger persistence failure after "+outcome+" dispatch requires reconciliation without delivery",async()=>{
  let sends=0,delivered=0;
  const bridge=createNotificationAttemptDispatchBridge({
   ledger:{async start(){return {attemptId:"attempt"}},async finish(){throw Error("database unavailable")}},
   guard:{async dispatch(){sends++;return outcome==="VERIFIED"?{status:"VERIFIED",receipt:"proof"}:{status:"UNKNOWN",reason:"timeout"}}},
   lifecycle:{async markDelivered(){delivered++}}
  });
  const result=await bridge.dispatch({organizationId:"org",key:"key",attemptId:"attempt",token:"token",record:{organizationId:"org",idempotencyKey:"key",status:"PENDING"}});
  assert.equal(result.status,"RECONCILIATION_REQUIRED");assert.equal(result.reason,reason);assert.equal(sends,1);assert.equal(delivered,0);
 });
}
