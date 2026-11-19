"use strict";
// Trusted recovery evidence lookup: read-only, no sends or lifecycle mutation.
// Host must supply an authenticated actor verifier and an approved provider lookup.
function createNotificationRecoveryEvidence({inspector,verifyActor,lookupProvider}={}){
 if(typeof inspector?.inspect!=="function"||typeof verifyActor!=="function"||typeof lookupProvider!=="function")throw Error("recovery_evidence_dependencies_required");
 async function inspect({organizationId,key,actor}={}){
  if(typeof organizationId!=="string"||!organizationId||typeof key!=="string"||!key)throw Error("recovery_evidence_scope_required");
  const identity=await verifyActor({actor,organizationId,action:"notification.reconcile"});
  if(identity?.authorized!==true||!identity.actorId)throw Error("recovery_evidence_unauthorized");
  const state=await inspector.inspect({organizationId,key});
  if(state.status!=="RECONCILIATION_REQUIRED")return Object.freeze({status:state.status,reason:state.reason||null});
  const results=[];
  for(const attemptId of state.attemptIds){
   if(typeof attemptId!=="string"||!attemptId)throw Error("recovery_evidence_attempt_invalid");
   let evidence;
   try{evidence=await lookupProvider({organizationId,key,attemptId})}
   catch(error){results.push(Object.freeze({attemptId,status:"UNKNOWN",reason:"provider_lookup_failed"}));continue}
   // A provider's self-reported delivery must still be independently verified
   // by the authorized reconciliation writer before changing persisted state.
   if(evidence?.status==="DELIVERED"&&typeof evidence.receipt==="string"&&evidence.receipt){
    results.push(Object.freeze({attemptId,status:"EVIDENCE_AVAILABLE",receipt:evidence.receipt}));
   }else{
    results.push(Object.freeze({attemptId,status:"UNKNOWN",reason:"no_verified_receipt"}));
   }
  }
  return Object.freeze({status:"RECONCILIATION_REQUIRED",reason:state.reason,attempts:Object.freeze(results)});
 }
 return Object.freeze({inspect});
}
module.exports={createNotificationRecoveryEvidence};
