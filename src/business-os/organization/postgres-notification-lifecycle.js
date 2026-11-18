"use strict";
// Async Postgres lifecycle. Intentionally not wired to production or a delivery provider.
function createPostgresNotificationLifecycle({coordinator,repository,verifyDelivery,verifyActor,clock=()=>new Date()}={}){
 if(typeof coordinator?.getWork!=="function"||typeof verifyDelivery!=="function"||typeof verifyActor!=="function"||!repository||!["get","insertIfAbsent","transition","list"].every(k=>typeof repository[k]==="function"))throw new Error("notification_lifecycle_dependencies_required");
 async function current(record){
  const w=await coordinator.getWork(record.workId);
  return !!w&&w.organizationId===record.organizationId&&w.version===record.workVersion&&!["COMPLETED","CANCELLED","FAILED"].includes(w.state);
 }
 async function enqueue(intent){
  if(!intent||intent.deliveryStatus!=="NOT_SENT"||intent.approvalGranted!==false||!intent.organizationId||!intent.idempotencyKey||!intent.recipientRole||!await current(intent))throw new Error("notification_intent_invalid_or_stale");
  const record={...intent,status:"PENDING",attempts:0,createdAt:clock().toISOString(),lastAttemptAt:null,acknowledgedAt:null};
  return repository.insertIfAbsent(record);
 }
 async function markDelivered(organizationId,key,{proof}={}){
  const entry=await repository.get(organizationId,key);
  if(!entry||!await current(entry.record))throw new Error("notification_stale_or_missing");
  if(await verifyDelivery({record:entry.record,proof})!==true)throw new Error("notification_delivery_unverified");
  return repository.transition({organizationId,key,expectedStatus:"PENDING",expectedVersion:entry.version,nextStatus:"DELIVERED",patch:{attempts:(entry.record.attempts||0)+1,lastAttemptAt:clock().toISOString()}});
 }
 async function acknowledge(organizationId,key,{identity}={}){
  const entry=await repository.get(organizationId,key);
  const actor=entry&&await verifyActor({record:entry.record,identity});
  if(!entry||!await current(entry.record)||!actor?.actorId||actor.organizationId!==organizationId||actor.roleId!==entry.record.recipientRole)throw new Error("notification_acknowledgment_denied");
  return repository.transition({organizationId,key,expectedStatus:"DELIVERED",expectedVersion:entry.version,nextStatus:"ACKNOWLEDGED",patch:{acknowledgedAt:clock().toISOString()}});
 }
 async function reconcile(organizationId){
  const changed=[];
  for(const entry of await repository.list(organizationId)){
   const r=entry.record;
   if(["PENDING","DELIVERED"].includes(r.status)&&!await current(r)){
    try{changed.push(await repository.transition({organizationId,key:r.idempotencyKey,expectedStatus:r.status,expectedVersion:entry.version,nextStatus:"SUPERSEDED"}));}
    catch(e){if(e.message!=="notification_state_conflict")throw e;}
   }
  }
  return changed;
 }
 return Object.freeze({enqueue,markDelivered,acknowledge,reconcile,list:organizationId=>repository.list(organizationId)});
}
module.exports={createPostgresNotificationLifecycle};
