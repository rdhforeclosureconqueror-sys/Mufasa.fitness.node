"use strict";
// Bounded internal adapter; host must supply trusted provider, claim, identity and proof verification.
function createNotificationAttemptDispatchBridge({ledger,guard,lifecycle}={}){
 if(typeof ledger?.start!=="function"||typeof ledger?.finish!=="function"||typeof guard?.dispatch!=="function"||typeof lifecycle?.markDelivered!=="function")throw Error("notification_bridge_dependencies_required");
 async function dispatch({organizationId,key,attemptId,token,record}={}){
  if(![organizationId,key,attemptId,token].every(v=>typeof v==="string"&&v)||record?.organizationId!==organizationId||record?.idempotencyKey!==key||record.status!=="PENDING")throw Error("notification_bridge_scope_invalid");
  const started=await ledger.start({organizationId,key,attemptId,claimToken:token});
  if(!started)return Object.freeze({status:"BLOCKED",reason:"attempt_not_claimed_or_unresolved"});
  let outcome;
  try{outcome=await guard.dispatch({organizationId,key,token,record})}
  catch(error){outcome={status:"UNKNOWN",reason:"dispatch_exception"}}
  if(outcome?.status!=="VERIFIED"){
   await ledger.finish({organizationId,key,attemptId,claimToken:token,outcome:"UNKNOWN",reason:outcome?.reason||"unverified_delivery"});
   return Object.freeze({status:"UNKNOWN",reason:outcome?.reason||"unverified_delivery"});
  }
  // Record provider verification before transitioning lifecycle; failures must not retry send.
  await ledger.finish({organizationId,key,attemptId,claimToken:token,outcome:"VERIFIED",providerReference:typeof outcome.receipt==="string"?outcome.receipt:JSON.stringify(outcome.receipt)});
  try{
   await lifecycle.markDelivered(organizationId,key,{proof:outcome.receipt});
   return Object.freeze({status:"DELIVERED",attemptId});
  }catch(error){
   return Object.freeze({status:"RECONCILIATION_REQUIRED",reason:"verified_attempt_lifecycle_transition_failed",attemptId});
  }
 }
 return Object.freeze({dispatch});
}
module.exports={createNotificationAttemptDispatchBridge};
