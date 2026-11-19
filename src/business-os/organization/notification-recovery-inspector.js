"use strict";
// Read-only recovery classifier. Never sends, retries, or marks delivery without trusted proof.
// The host is responsible for authenticated, organization-scoped invocation and reconciliation.
function createNotificationRecoveryInspector({ledger,lifecycle}={}){
 if(typeof ledger?.list!=="function"||typeof lifecycle?.list!=="function")throw Error("notification_recovery_dependencies_required");
 async function inspect({organizationId,key}={}){
  if(typeof organizationId!=="string"||!organizationId||typeof key!=="string"||!key)throw Error("notification_recovery_scope_required");
  const entries=await lifecycle.list(organizationId);
  const notification=entries.find(e=>e?.record?.organizationId===organizationId&&e.record.idempotencyKey===key)?.record;
  if(!notification)return Object.freeze({status:"NOT_FOUND"});
  const attempts=await ledger.list(organizationId,key);
  if(!Array.isArray(attempts))throw Error("notification_recovery_ledger_invalid");
  if(attempts.some(a=>!a||typeof a.attempt_id!=="string"||!["STARTED","UNKNOWN","VERIFIED","FAILED"].includes(a.outcome)))throw Error("notification_recovery_ledger_invalid");
  const unresolved=attempts.filter(a=>a.outcome==="STARTED"||a.outcome==="UNKNOWN");
  if(unresolved.length)return Object.freeze({status:"RECONCILIATION_REQUIRED",reason:"unresolved_attempt",attemptIds:unresolved.map(a=>a.attempt_id)});
  if(notification.status==="PENDING"&&attempts.some(a=>a.outcome==="VERIFIED"))return Object.freeze({status:"RECONCILIATION_REQUIRED",reason:"verified_attempt_pending_lifecycle",attemptIds:attempts.filter(a=>a.outcome==="VERIFIED").map(a=>a.attempt_id)});
  if(notification.status==="DELIVERED"||notification.status==="ACKNOWLEDGED"||notification.status==="SUPERSEDED")return Object.freeze({status:"TERMINAL_OR_DELIVERED",notificationStatus:notification.status});
  // No attempt is not proof that a future send is authorized. Claims and policy still govern dispatch.
  return Object.freeze({status:"NO_UNRESOLVED_ATTEMPT",dispatchAuthorized:false});
 }
 return Object.freeze({inspect});
}
module.exports={createNotificationRecoveryInspector};
