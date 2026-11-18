"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createNotificationLifecycle,createMemoryNotificationStore}=require("../src/business-os/organization/notification-lifecycle");
const {createVerifiedNotificationGateway}=require("../src/business-os/organization/verified-notification-gateway");
function fixture(){
 const work={id:"qa",organizationId:"org",version:1,state:"ASSIGNED"};
 const lifecycle=createNotificationLifecycle({coordinator:{getWork:()=>({...work})},store:createMemoryNotificationStore()});
 const key="org:qa:1:AWAITING_EXECUTION:INDEPENDENT_QA";
 lifecycle.enqueue({idempotencyKey:key,organizationId:"org",workId:"qa",workVersion:1,recipientRole:"INDEPENDENT_QA",deliveryStatus:"NOT_SENT",approvalGranted:false});
 const gateway=createVerifiedNotificationGateway({lifecycle,verifyDelivery:({proof})=>proof?.providerId==="confirmed",verifyActor:({identity})=>identity?.verified?identity:null});
 return {gateway,lifecycle,key,work};
}
test("rejects unverified delivery, unverified actor, cross-org and wrong-role acknowledgment",()=>{
 const f=fixture();
 assert.throws(()=>f.gateway.confirmDelivery(f.key,{}),/delivery_proof_denied/);
 assert.equal(f.gateway.confirmDelivery(f.key,{providerId:"confirmed"}).status,"DELIVERED");
 assert.throws(()=>f.gateway.acknowledge(f.key,{actorId:"a",organizationId:"org",roleId:"INDEPENDENT_QA"}),/notification_actor_denied/);
 assert.throws(()=>f.gateway.acknowledge(f.key,{verified:true,actorId:"a",organizationId:"other",roleId:"INDEPENDENT_QA"}),/notification_actor_denied/);
 assert.throws(()=>f.gateway.acknowledge(f.key,{verified:true,actorId:"a",organizationId:"org",roleId:"EXPERIMENT_MANAGER"}),/notification_actor_denied/);
 const a=f.gateway.acknowledge(f.key,{verified:true,actorId:"a",organizationId:"org",roleId:"INDEPENDENT_QA"});
 assert.equal(a.status,"ACKNOWLEDGED");assert.equal(a.approvalGranted,false);
});
test("stale work cannot be marked delivered even with valid proof",()=>{
 const f=fixture();f.work.version=2;
 assert.throws(()=>f.gateway.confirmDelivery(f.key,{providerId:"confirmed"}),/notification_stale_or_missing/);
});
test("gateway fails closed without verification dependencies",()=>{
 assert.throws(()=>createVerifiedNotificationGateway({}),/verified_notification_dependencies_required/);
});
