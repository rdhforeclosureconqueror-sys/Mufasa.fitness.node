"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationDispatchGuard}=require("../src/business-os/organization/notification-dispatch-guard");
const record={organizationId:"org",idempotencyKey:"key",status:"PENDING",approvalGranted:false,deliveryStatus:"NOT_SENT"};
test("rejects unowned claim before any provider call",async()=>{
 let sends=0;const guard=createNotificationDispatchGuard({claims:{owns:async()=>false},verifyDelivery:async()=>true,provider:{send:async()=>{sends++;}}});
 await assert.rejects(()=>guard.dispatch({organizationId:"org",key:"key",token:"t",record}),/notification_claim_not_owned/);assert.equal(sends,0);
});
test("verified receipt requires still-owned lease and trusted verifier",async()=>{
 let checks=0;const guard=createNotificationDispatchGuard({claims:{owns:async()=>{checks++;return true;}},verifyDelivery:async({proof})=>proof==="trusted",provider:{send:async({idempotencyKey})=>{assert.equal(idempotencyKey,"org:key");return "trusted";}}});
 assert.equal((await guard.dispatch({organizationId:"org",key:"key",token:"t",record})).status,"VERIFIED");assert.equal(checks,3);
});
test("lease lost during send is unknown, not delivered",async()=>{
 let checks=0;const guard=createNotificationDispatchGuard({claims:{owns:async()=>++checks<3},verifyDelivery:async()=>true,provider:{send:async()=>({})}});
 assert.deepEqual(await guard.dispatch({organizationId:"org",key:"key",token:"t",record}),{status:"UNKNOWN",reason:"claim_expired_during_send"});
});
test("provider errors are ambiguous and not safe to retry blindly",async()=>{
 const guard=createNotificationDispatchGuard({claims:{owns:async()=>true},verifyDelivery:async()=>true,provider:{send:async()=>{throw new Error("timeout");}}});
 assert.deepEqual(await guard.dispatch({organizationId:"org",key:"key",token:"t",record}),{status:"UNKNOWN",reason:"provider_outcome_ambiguous"});
});
