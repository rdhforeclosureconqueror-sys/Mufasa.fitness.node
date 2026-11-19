"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationRecoveryEvidence}=require("../src/business-os/organization/notification-recovery-evidence");
function make({authorized=true,state={status:"RECONCILIATION_REQUIRED",reason:"unresolved_attempt",attemptIds:["a1"]},lookup=async()=>({status:"DELIVERED",receipt:"provider-ref"})}={}){
 let lookups=0;
 const api=createNotificationRecoveryEvidence({inspector:{async inspect(){return state}},verifyActor:async()=>({authorized,actorId:"admin"}),lookupProvider:async args=>{lookups++;return lookup(args)}});
 return {api,lookups:()=>lookups};
}
const args={organizationId:"org-a",key:"key-a",actor:{id:"admin"}};
test("unauthorized actor cannot query provider",async()=>{const f=make({authorized:false});await assert.rejects(()=>f.api.inspect(args),/unauthorized/);assert.equal(f.lookups(),0)});
test("scoped evidence is available but never automatically confirmed",async()=>{const f=make();const result=await f.api.inspect(args);assert.equal(result.status,"RECONCILIATION_REQUIRED");assert.deepEqual(result.attempts,[{attemptId:"a1",status:"EVIDENCE_AVAILABLE",receipt:"provider-ref"}]);assert.equal(f.lookups(),1)});
test("provider failure remains unknown without retry",async()=>{const f=make({lookup:async()=>{throw Error("network")}});const result=await f.api.inspect(args);assert.equal(result.attempts[0].status,"UNKNOWN");assert.equal(result.attempts[0].reason,"provider_lookup_failed")});
test("missing receipt cannot be accepted as evidence",async()=>{const f=make({lookup:async()=>({status:"DELIVERED"})});const result=await f.api.inspect(args);assert.equal(result.attempts[0].status,"UNKNOWN")});
test("no unresolved attempt avoids provider calls",async()=>{const f=make({state:{status:"NO_UNRESOLVED_ATTEMPT"}});assert.equal((await f.api.inspect(args)).status,"NO_UNRESOLVED_ATTEMPT");assert.equal(f.lookups(),0)});
