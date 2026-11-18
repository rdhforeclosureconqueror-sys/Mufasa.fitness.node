"use strict";
// Optional migration for an explicitly approved Business OS PostgreSQL database.
// An UNKNOWN attempt must be reconciled; it must not be blindly retried.
const attemptSchemaSQL=`
CREATE TABLE IF NOT EXISTS business_os_notification_attempts (
 organization_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 claim_token TEXT NOT NULL,
 outcome TEXT NOT NULL CHECK (outcome IN ('STARTED','VERIFIED','UNKNOWN','FAILED')),
 provider_reference TEXT,
 reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (organization_id,idempotency_key,attempt_id),
 FOREIGN KEY (organization_id,idempotency_key)
 REFERENCES business_os_notifications(organization_id,idempotency_key)
 ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS business_os_notification_one_unresolved_attempt
 ON business_os_notification_attempts(organization_id,idempotency_key)
 WHERE outcome IN ('STARTED','UNKNOWN');
`;
function createPostgresNotificationAttemptLedger({pool}={}){
 if(typeof pool?.query!=="function")throw new Error("notification_database_required");
 function scope(organizationId,key,attemptId){
  if(![organizationId,key,attemptId].every(v=>typeof v==="string"&&v.length>0))throw new Error("notification_attempt_scope_required");
 }
 async function start({organizationId,key,attemptId,claimToken}={}){
  scope(organizationId,key,attemptId);
  if(typeof claimToken!=="string"||!claimToken)throw new Error("notification_attempt_token_required");
  // A partial unique index prevents another STARTED/UNKNOWN attempt for this notification.
  const r=await pool.query(`INSERT INTO business_os_notification_attempts
   (organization_id,idempotency_key,attempt_id,claim_token,outcome)
   SELECT n.organization_id,n.idempotency_key,$3,$4,'STARTED'
   FROM business_os_notifications n
   JOIN business_os_notification_claims c
     ON c.organization_id=n.organization_id AND c.idempotency_key=n.idempotency_key
   WHERE n.organization_id=$1 AND n.idempotency_key=$2
     AND n.record->>'status'='PENDING' AND c.claim_token=$4 AND c.claimed_until>NOW()
   ON CONFLICT DO NOTHING RETURNING attempt_id,outcome`,[organizationId,key,attemptId,claimToken]);
  return r.rows[0]||null;
 }
 async function finish({organizationId,key,attemptId,claimToken,outcome,providerReference=null,reason=null}={}){
  scope(organizationId,key,attemptId);
  if(typeof claimToken!=="string"||!claimToken||!["VERIFIED","UNKNOWN","FAILED"].includes(outcome))throw new Error("notification_attempt_outcome_invalid");
  // FAILED is reserved for a positively confirmed non-delivery; callers must establish that separately.
  const r=await pool.query(`UPDATE business_os_notification_attempts
   SET outcome=$5,provider_reference=$6,reason=$7,updated_at=NOW()
   WHERE organization_id=$1 AND idempotency_key=$2 AND attempt_id=$3
     AND claim_token=$4 AND outcome='STARTED'
   RETURNING attempt_id,outcome,provider_reference,reason`,[organizationId,key,attemptId,claimToken,outcome,providerReference,reason]);
  if(r.rowCount!==1)throw new Error("notification_attempt_state_conflict");
  return r.rows[0];
 }
 async function list(organizationId,key){
  if(typeof organizationId!=="string"||!organizationId||typeof key!=="string"||!key)throw new Error("notification_attempt_scope_required");
  const r=await pool.query("SELECT attempt_id,outcome,provider_reference,reason,created_at,updated_at FROM business_os_notification_attempts WHERE organization_id=$1 AND idempotency_key=$2 ORDER BY created_at,attempt_id",[organizationId,key]);
  return r.rows;
 }
 return Object.freeze({start,finish,list});
}
module.exports={attemptSchemaSQL,createPostgresNotificationAttemptLedger};
