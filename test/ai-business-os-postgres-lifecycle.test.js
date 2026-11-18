"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createPostgresNotificationLifecycle}=require("../src/business-os/organization/postgres-notification-lifecycle");
function fixture(){
 const records=new Map(),work={organizationId:"org",version:1,state:"ASSIGNED"};
 const repository={
  async get(org,key){return records.get(org+":"+key)||null;},
  async insertIfAbsent(r){const k=r.organizationId+":"+r.idempotencyKey;if(records.has(k))return {inserted:false,entry:records.get(k)};const entry={record:r,version:1};records.set(k,entry);return {inserted:true,entry};},
  async transition({organizationId,key,expectedStatus,expectedVersion,nextStatus,patch={}}){const k=organizationId+":"+key,e=records.get(k);if(!e||e.version!==expectedVersion||e.record.status!==expectedStatus)throw new Error("notification_state_conflict");const next={record:{...e.record,...patch,status:nextStatus},version:e.version+1};records.set(k,next);return next;},
  async list(org){return [...records.entries()].filter(([k])=>k.startsWith(org+":")).map(([,v])=>v);}
 };
 const lifecycle=createPostgresNotificationLifecycle({repository,coordinator:{getWork:()=>work},verifyDelivery:async({proof})=>proof==="signed-provider-proof",verifyActor:async({identity})=>identity==="trusted-identity"?{actorId:"user-1",organizationId:"org",roleId:"MANAGER"}:null,clock:()=>new Date("2026-11-18T00:00:00Z")});
 const intent={organizationId:"org",idempotencyKey:"k",recipientRole:"MANAGER",workId:"w",workVersion:1,approvalGranted:false,deliveryStatus:"NOT_SENT"};
 return {lifecycle,work,intent};
}
test("enqueue idempotent and delivery requires verified evidence",async()=>{
 const {lifecycle,intent}=fixture();
 assert.equal((await lifecycle.enqueue(intent)).inserted,true);
 assert.equal((await lifecycle.enqueue(intent)).inserted,false);
 await assert.rejects(()=>lifecycle.markDelivered("org","k"),/notification_delivery_unverified/);
 await lifecycle.markDelivered("org","k",{proof:"signed-provider-proof"});
 await assert.rejects(()=>lifecycle.acknowledge("org","k",{identity:"untrusted"}),/notification_acknowledgment_denied/);
 await lifecycle.acknowledge("org","k",{identity:"trusted-identity"});
 assert.equal((await lifecycle.list("org"))[0].record.status,"ACKNOWLEDGED");
});
test("stale work superseded; stale delivery denied",async()=>{
 const {lifecycle,intent,work}=fixture();await lifecycle.enqueue(intent);work.version=2;
 await assert.rejects(()=>lifecycle.markDelivered("org","k",{proof:"signed-provider-proof"}),/notification_stale_or_missing/);
 const r=await lifecycle.reconcile("org");assert.equal(r[0].record.status,"SUPERSEDED");
});
