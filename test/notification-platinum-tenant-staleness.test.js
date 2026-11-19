"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createPostgresNotificationLifecycle}=require("../src/business-os/organization/postgres-notification-lifecycle");
function harness(){
 const entries=new Map(),work={organizationId:"org-a",version:1,state:"ASSIGNED"};
 const repository={
  async get(org,key){return entries.get(org+":"+key)||null},
  async insertIfAbsent(record){const k=record.organizationId+":"+record.idempotencyKey;if(entries.has(k))return {inserted:false,entry:entries.get(k)};const entry={record,version:"1"};entries.set(k,entry);return {inserted:true,entry}},
  async transition({organizationId,key,expectedStatus,expectedVersion,nextStatus,patch={}}){const k=organizationId+":"+key,e=entries.get(k);if(!e||e.record.status!==expectedStatus||e.version!==expectedVersion)throw Error("notification_state_conflict");const next={record:{...e.record,...patch,status:nextStatus},version:String(Number(e.version)+1)};entries.set(k,next);return next},
  async list(org){return [...entries.values()].filter(e=>e.record.organizationId===org)}
 };
 const lifecycle=createPostgresNotificationLifecycle({repository,coordinator:{async getWork(){return work}},verifyDelivery:async({proof})=>proof==="valid-provider-proof",verifyActor:async({identity})=>identity==="valid-actor"?{actorId:"actor-1",organizationId:"org-a",roleId:"MANAGER"}:null});
 const intent={organizationId:"org-a",idempotencyKey:"shared-key",workId:"work-1",workVersion:1,recipientRole:"MANAGER",deliveryStatus:"NOT_SENT",approvalGranted:false};
 return {lifecycle,intent,work};
}
test("notification tenant scope cannot be crossed by delivery or acknowledgment",async()=>{
 const {lifecycle,intent}=harness();await lifecycle.enqueue(intent);
 await assert.rejects(()=>lifecycle.markDelivered("org-b","shared-key",{proof:"valid-provider-proof"}),/notification_stale_or_missing/);
 await assert.rejects(()=>lifecycle.acknowledge("org-b","shared-key",{identity:"valid-actor"}),/notification_acknowledgment_denied/);
 assert.equal((await lifecycle.list("org-a"))[0].record.status,"PENDING");
 await lifecycle.markDelivered("org-a","shared-key",{proof:"valid-provider-proof"});
 await assert.rejects(()=>lifecycle.acknowledge("org-a","shared-key",{identity:"wrong-actor"}),/notification_acknowledgment_denied/);
 assert.equal((await lifecycle.list("org-a"))[0].record.status,"DELIVERED");
});
test("stale work invalidates delivery and reconciliation supersedes it",async()=>{
 const {lifecycle,intent,work}=harness();await lifecycle.enqueue(intent);work.version=2;
 await assert.rejects(()=>lifecycle.markDelivered("org-a","shared-key",{proof:"valid-provider-proof"}),/notification_stale_or_missing/);
 const changes=await lifecycle.reconcile("org-a");assert.equal(changes.length,1);
 assert.equal((await lifecycle.list("org-a"))[0].record.status,"SUPERSEDED");
});
