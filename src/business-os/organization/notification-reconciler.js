"use strict";
// Read-only reconciliation classification: never resend on missing/ambiguous evidence.
function createNotificationReconciler({ledger,verifyProviderOutcome}={}){
 if(typeof ledger?.list!=="function"||typeof verifyProviderOutcome!=="function")throw new Error("notification_reconciler_dependencies_required");
 async function inspect({organizationId,key}={}){
  if(typeof organizationId!=="string"||!organizationId||typeof key!=="string"||!key)throw new Error("notification_reconciliation_scope_required");
  const attempts=await ledger.list(organizationId,key);
  if(!Array.isArray(attempts))throw new Error("notification_attempts_invalid");
  const decisions=[];
  for(const attempt of attempts){
   if(!attempt||typeof attempt.attempt_id!=="string"||!["STARTED","UNKNOWN","VERIFIED","FAILED"].includes(attempt.outcome))throw new Error("notification_attempt_invalid");
   if(attempt.outcome==="VERIFIED"){decisions.push({attemptId:attempt.attempt_id,decision:"ALREADY_VERIFIED"});continue;}
   if(attempt.outcome==="FAILED"){decisions.push({attemptId:attempt.attempt_id,decision:"CONFIRMED_FAILED_REVIEW"});continue;}
   // Provider verifier is injected by trusted server code; no client-provided proof.
   let evidence;
   try{evidence=await verifyProviderOutcome({organizationId,key,attemptId:attempt.attempt_id,providerReference:attempt.provider_reference||null});}
   catch{decisions.push({attemptId:attempt.attempt_id,decision:"MANUAL_REVIEW",reason:"verification_unavailable"});continue;}
   if(evidence?.verified===true&&typeof evidence.receipt==="string"&&evidence.receipt.length>0){
    decisions.push({attemptId:attempt.attempt_id,decision:"VERIFY_DELIVERY",receipt:evidence.receipt});
   }else{
    decisions.push({attemptId:attempt.attempt_id,decision:"MANUAL_REVIEW",reason:"delivery_not_verified"});
   }
  }
  return Object.freeze({organizationId,key,decisions});
 }
 return Object.freeze({inspect});
}
module.exports={createNotificationReconciler};
