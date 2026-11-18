"use strict";
// Trusted boundary for callers: proof verification is injected by the host.
// This is not a provider integration or authentication implementation.
function createVerifiedNotificationGateway({lifecycle,verifyDelivery,verifyActor}={}){
 if(!lifecycle||typeof lifecycle.markDelivered!=="function"||typeof lifecycle.acknowledge!=="function"||typeof lifecycle.list!=="function"||typeof verifyDelivery!=="function"||typeof verifyActor!=="function")throw new Error("verified_notification_dependencies_required");
 function find(key){return lifecycle.list().find(x=>x.idempotencyKey===key);}
 function confirmDelivery(key,proof){
  const r=find(key);
  if(!r||r.status!=="PENDING"||verifyDelivery({record:r,proof})!==true)throw new Error("delivery_proof_denied");
  return lifecycle.markDelivered(key);
 }
 function acknowledge(key,identity){
  const r=find(key);
  if(!r||r.status!=="DELIVERED")throw new Error("notification_not_delivered");
  const actor=verifyActor({record:r,identity});
  if(!actor||typeof actor!=="object"||!actor.actorId||actor.organizationId!==r.organizationId||actor.roleId!==r.recipientRole)throw new Error("notification_actor_denied");
  return lifecycle.acknowledge(key,{actorRole:actor.roleId});
 }
 return Object.freeze({confirmDelivery,acknowledge});
}
module.exports={createVerifiedNotificationGateway};
