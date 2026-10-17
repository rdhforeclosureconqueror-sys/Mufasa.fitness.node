"use strict";
// Read-only validator. User-supplied assertions are never proof of operational controls.
const {REQUIRED}=require("./liveJourneySafetyContract");
const ALLOWED_KINDS=Object.freeze({
 adminAuthorized:"verified_admin_session",
 explicitRunConfirmation:"one_run_operator_approval",
 testIdentityIsolated:"isolated_identity_receipt",
 testEventIsolated:"isolated_event_receipt",
 notificationsSuppressed:"provider_notification_suppression",
 paymentsDisabled:"provider_payment_block",
 cleanupVerified:"test_record_cleanup_readback",
 rollbackCommitRecorded:"deployed_commit_rollback_plan"
});
function evaluateSafeguardEvidence(input={},trusted={}){
 const checks=REQUIRED.map(id=>{
  const record=input?.[id];
  const attested=trusted?.[id];
  const valid=Boolean(record&&typeof record==="object"&&!Array.isArray(record)&&record.kind===ALLOWED_KINDS[id]&&
   typeof record.reference==="string"&&record.reference.length>=8&&record.reference.length<=256&&
   attested&&attested.kind===record.kind&&attested.reference===record.reference&&attested.verified===true);
  return {id,status:valid?"VERIFIED":"UNVERIFIED",reason:valid?null:"MISSING_INDEPENDENT_ATTESTATION"};
 });
 const firstFailure=checks.find(x=>x.status!=="VERIFIED")?.id||null;
 return {mode:"PRODUCTION_SAFEGUARD_EVIDENCE_VALIDATION_ONLY",executionPerformed:false,authorized:false,firstFailure,checks};
}
module.exports={evaluateSafeguardEvidence,ALLOWED_KINDS};
