"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationAttemptDispatchBridge}=require("../src/business-os/organization/notification-attempt-dispatch-bridge");
const request={organizationId:"org",key:"key",attemptId:"attempt-1",token:"claim-1",record:{organizationId:"org",idempotencyKey:"key",status:"PENDING"}};
function harness({start=true,result={status:"VERIFIED",receipt:"provider-receipt"},transitionFails=false}={}){
 const events=[];
 const bridge=createNotificationAttemptDispatchBridge({
  ledger:{async start(){events.push("start");return start?{attemptId:"attempt-1"}:null},async finish(args){events.push("finish:"+args.outcome)}},
  guard:{async dispatch(){events.push("dispatch");return result}},
  lifecycle:{async markDelivered(){events.push("delivered");if(transitionFails)throw Error("conflict")}}
 });return {bridge,events};
}
test("claimed and verified attempt is recorded before lifecycle delivery",async()=>{
 const {bridge,events}=harness();assert.equal((await bridge.dispatch(request)).status,"DELIVERED");assert.deepEqual(events,["start","dispatch","finish:VERIFIED","delivered"]);
});
test("unclaimed attempt never reaches provider",async()=>{
 const {bridge,events}=harness({start:false});assert.equal((await bridge.dispatch(request)).status,"BLOCKED");assert.deepEqual(events,["start"]);
});
test("ambiguous provider result stays UNKNOWN and is not marked delivered",async()=>{
 const {bridge,events}=harness({result:{status:"UNKNOWN",reason:"provider_outcome_ambiguous"}});assert.equal((await bridge.dispatch(request)).status,"UNKNOWN");assert.deepEqual(events,["start","dispatch","finish:UNKNOWN"]);
});
test("verified provider result with lifecycle conflict requires reconciliation, not resend",async()=>{
 const {bridge,events}=harness({transitionFails:true});assert.equal((await bridge.dispatch(request)).status,"RECONCILIATION_REQUIRED");assert.deepEqual(events,["start","dispatch","finish:VERIFIED","delivered"]);
});
test("cross-organization record cannot start an attempt",async()=>{
 const {bridge,events}=harness();await assert.rejects(()=>bridge.dispatch({...request,organizationId:"other"}),/notification_bridge_scope_invalid/);assert.deepEqual(events,[]);
});
