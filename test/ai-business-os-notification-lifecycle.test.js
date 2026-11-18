"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationLifecycle,createMemoryNotificationStore}=require("../src/business-os/organization/notification-lifecycle");
function fixture(){
 const work={id:"qa",organizationId:"org",version:1,state:"ASSIGNED"};
 const coordinator={getWork:id=>id===work.id?{...work}:null};
 const store=createMemoryNotificationStore();
 const lifecycle=createNotificationLifecycle({coordinator,store,clock:()=>new Date("2026-11-18T15:00:00Z")});
 const intent={idempotencyKey:"org:qa:1:AWAITING_EXECUTION:INDEPENDENT_QA",organizationId:"org",workId:"qa",workVersion:1,recipientRole:"INDEPENDENT_QA",deliveryStatus:"NOT_SENT",approvalGranted:false};
 return {work,lifecycle,intent,store,coordinator};
}
test("idempotent enqueue, delivered and role-bound acknowledgment do not authorize approval",()=>{
 const f=fixture();const r=f.lifecycle.enqueue(f.intent);
 assert.deepEqual(f.lifecycle.enqueue(f.intent),r);
 assert.equal(f.lifecycle.list().length,1);
 assert.throws(()=>f.lifecycle.acknowledge(r.idempotencyKey,{actorRole:"INDEPENDENT_QA"}),/notification_state_conflict/);
 assert.equal(f.lifecycle.markDelivered(r.idempotencyKey).status,"DELIVERED");
 assert.throws(()=>f.lifecycle.acknowledge(r.idempotencyKey,{actorRole:"EXPERIMENT_MANAGER"}),/notification_acknowledgment_denied/);
 const a=f.lifecycle.acknowledge(r.idempotencyKey,{actorRole:"INDEPENDENT_QA"});
 assert.equal(a.status,"ACKNOWLEDGED");
 assert.equal(a.approvalGranted,false);
 assert.throws(()=>f.lifecycle.markDelivered(r.idempotencyKey),/notification_state_conflict/);
});
test("changed work version supersedes pending intent and blocks stale delivery",()=>{
 const f=fixture();f.lifecycle.enqueue(f.intent);f.work.version=2;
 assert.throws(()=>f.lifecycle.markDelivered(f.intent.idempotencyKey),/notification_stale_or_missing/);
 assert.equal(f.lifecycle.reconcile()[0].status,"SUPERSEDED");
 assert.throws(()=>f.lifecycle.enqueue(f.intent),/notification_intent_invalid_or_stale/);
});
test("cross organization and completed work cannot enter lifecycle",()=>{
 const f=fixture();assert.throws(()=>f.lifecycle.enqueue({...f.intent,organizationId:"other"}),/notification_intent_invalid_or_stale/);
 f.work.state="COMPLETED";assert.throws(()=>f.lifecycle.enqueue(f.intent),/notification_intent_invalid_or_stale/);
});
