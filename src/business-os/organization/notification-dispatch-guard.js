"use strict";
// A claim ownership check is NOT an exactly-once delivery guarantee.
// The provider must support stable idempotency keys, and ambiguous outcomes require reconciliation.
function createNotificationDispatchGuard({claims,verifyDelivery,provider}={}){
 if(!claims||typeof claims.owns!=="function"||typeof verifyDelivery!=="function"||typeof provider?.send!=="function")throw new Error("notification_dispatch_dependencies_required");
 async function dispatch({organizationId,key,token,record}={}){
  if(!record||record.organizationId!==organizationId||record.idempotencyKey!==key||record.status!=="PENDING"||record.approvalGranted!==false||record.deliveryStatus!=="NOT_SENT")throw new Error("notification_dispatch_invalid");
  if(!await claims.owns({organizationId,key,token}))throw new Error("notification_claim_not_owned");
  // Recheck immediately before provider call; lease may still expire during the network request.
  if(!await claims.owns({organizationId,key,token}))throw new Error("notification_claim_expired");
  const providerKey=organizationId+":"+key;
  try{
   const receipt=await provider.send({record,idempotencyKey:providerKey});
   if(!await claims.owns({organizationId,key,token}))return Object.freeze({status:"UNKNOWN",reason:"claim_expired_during_send"});
   if(await verifyDelivery({record,proof:receipt})!==true)return Object.freeze({status:"UNKNOWN",reason:"unverified_provider_receipt"});
   return Object.freeze({status:"VERIFIED",receipt});
  }catch(error){
   // Network errors cannot prove the provider did not accept the request.
   return Object.freeze({status:"UNKNOWN",reason:"provider_outcome_ambiguous"});
  }
 }
 return Object.freeze({dispatch});
}
module.exports={createNotificationDispatchGuard};
