"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationReconciler}=require("../src/business-os/organization/notification-reconciler");
test("unverified ambiguous delivery requires manual review and never resends",async()=>{
 let calls=0;
 const r=createNotificationReconciler({ledger:{list:async()=>[{attempt_id:"a",outcome:"UNKNOWN"}]},verifyProviderOutcome:async()=>{calls++;return {verified:false};}});
 const result=await r.inspect({organizationId:"org",key:"key"});
 assert.equal(calls,1);assert.equal(result.decisions[0].decision,"MANUAL_REVIEW");
 assert.equal(typeof r.send,"undefined");
});
test("trusted receipt can classify unresolved attempt for separate guarded transition",async()=>{
 const r=createNotificationReconciler({ledger:{list:async()=>[{attempt_id:"a",outcome:"STARTED"}]},verifyProviderOutcome:async()=>({verified:true,receipt:"provider-receipt"})});
 assert.deepEqual((await r.inspect({organizationId:"org",key:"key"})).decisions,[{attemptId:"a",decision:"VERIFY_DELIVERY",receipt:"provider-receipt"}]);
});
test("provider exceptions fail closed",async()=>{
 const r=createNotificationReconciler({ledger:{list:async()=>[{attempt_id:"a",outcome:"UNKNOWN"}]},verifyProviderOutcome:async()=>{throw Error("timeout");}});
 assert.equal((await r.inspect({organizationId:"org",key:"key"})).decisions[0].decision,"MANUAL_REVIEW");
});
test("verified and failed attempts do not trigger provider calls",async()=>{
 const r=createNotificationReconciler({ledger:{list:async()=>[{attempt_id:"a",outcome:"VERIFIED"},{attempt_id:"b",outcome:"FAILED"}]},verifyProviderOutcome:async()=>{throw Error("must not run");}});
 assert.deepEqual((await r.inspect({organizationId:"org",key:"key"})).decisions.map(d=>d.decision),["ALREADY_VERIFIED","CONFIRMED_FAILED_REVIEW"]);
});
