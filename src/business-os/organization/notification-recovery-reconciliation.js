"use strict";
// Bounded evidence-to-audit bridge. Never sends or transitions the notification lifecycle.
// Only STARTED/UNKNOWN attempts may enter the existing trusted reconciliation writer.
function createNotificationRecoveryReconciliation({evidence,writer}={}){
 if(typeof evidence?.inspect!=="function"||typeof writer?.confirmVerified!=="function")throw Error("recovery_reconciliation_dependencies_required");
 async function reconcile({organizationId,key,attemptId,actor}={}){
  if(![organizationId,key,attemptId].every(v=>typeof v==="string"&&v))throw Error("recovery_reconciliation_scope_required");
  const state=await evidence.inspect({organizationId,key,actor});
  if(state.status!=="RECONCILIATION_REQUIRED"||state.reason!=="unresolved_attempt")return Object.freeze({status:"BLOCKED",reason:"no_unresolved_attempt"});
  const matches=state.attempts?.filter(a=>a?.attemptId===attemptId);
  if(matches?.length!==1||matches[0].status!=="EVIDENCE_AVAILABLE"||typeof matches[0].receipt!=="string"||!matches[0].receipt)return Object.freeze({status:"BLOCKED",reason:"verified_evidence_unavailable"});
  // Writer independently verifies actor and receipt and atomically persists the audit.
  const result=await writer.confirmVerified({organizationId,key,attemptId,actor,receipt:matches[0].receipt});
  if(result?.status!=="VERIFIED"||result.attemptId!==attemptId)throw Error("recovery_reconciliation_writer_invalid");
  return Object.freeze({status:"ATTEMPT_VERIFIED",attemptId,lifecycleUpdated:false});
 }
 return Object.freeze({reconcile});
}
module.exports={createNotificationRecoveryReconciliation};
