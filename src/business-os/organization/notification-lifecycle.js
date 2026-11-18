"use strict";
// Storage adapter contract: get(key), put(key, value), list(). Implement durable storage separately.
function createNotificationLifecycle({coordinator,store,clock=()=>new Date()}={}){
 if(!coordinator?.getWork||!store||!["get","put","list"].every(k=>typeof store[k]==="function"))throw new Error("notification_lifecycle_dependencies_required");
 const states=new Set(["PENDING","DELIVERED","ACKNOWLEDGED","SUPERSEDED"]);
 function current(record){
  const w=coordinator.getWork(record.workId);
  return !!w&&w.organizationId===record.organizationId&&w.version===record.workVersion&&w.state!=="COMPLETED"&&w.state!=="CANCELLED"&&w.state!=="FAILED";
 }
 function enqueue(intent){
  if(!intent||intent.deliveryStatus!=="NOT_SENT"||intent.approvalGranted!==false||!intent.idempotencyKey||!intent.recipientRole||!current(intent))throw new Error("notification_intent_invalid_or_stale");
  const old=store.get(intent.idempotencyKey);if(old)return old;
  const record=Object.freeze({...intent,status:"PENDING",attempts:0,createdAt:clock().toISOString(),lastAttemptAt:null,acknowledgedAt:null});
  store.put(record.idempotencyKey,record);return record;
 }
 function transition(key,expected,next,patch={}){
  const old=store.get(key);if(!old||old.status!==expected)throw new Error("notification_state_conflict");
  if(!states.has(next))throw new Error("notification_state_invalid");
  const record=Object.freeze({...old,...patch,status:next});
  store.put(key,record);return record;
 }
 function markDelivered(key){
  const r=store.get(key);if(!r||!current(r))throw new Error("notification_stale_or_missing");
  return transition(key,"PENDING","DELIVERED",{attempts:r.attempts+1,lastAttemptAt:clock().toISOString()});
 }
 function acknowledge(key,{actorRole}={}){
  const r=store.get(key);if(!r||actorRole!==r.recipientRole||!current(r))throw new Error("notification_acknowledgment_denied");
  return transition(key,"DELIVERED","ACKNOWLEDGED",{acknowledgedAt:clock().toISOString()});
 }
 function reconcile(){
  const updated=[];for(const r of store.list())if((r.status==="PENDING"||r.status==="DELIVERED")&&!current(r))updated.push(transition(r.idempotencyKey,r.status,"SUPERSEDED"));
  return Object.freeze(updated);
 }
 function list(){return Object.freeze(store.list());}
 return Object.freeze({enqueue,markDelivered,acknowledge,reconcile,list});
}
function createMemoryNotificationStore(){
 const data=new Map();return Object.freeze({get:key=>data.get(key)||null,put:(key,value)=>data.set(key,value),list:()=>[...data.values()]});
}
module.exports={createNotificationLifecycle,createMemoryNotificationStore};
