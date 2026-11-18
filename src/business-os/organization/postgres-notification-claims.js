"use strict";
// Explicit migration: apply only to an approved, isolated Business OS database.
const claimSchemaSQL=`
CREATE TABLE IF NOT EXISTS business_os_notification_claims (
 organization_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 claim_token TEXT NOT NULL,
 claimed_until TIMESTAMPTZ NOT NULL,
 attempt BIGINT NOT NULL DEFAULT 1,
 PRIMARY KEY (organization_id,idempotency_key),
 FOREIGN KEY (organization_id,idempotency_key)
 REFERENCES business_os_notifications(organization_id,idempotency_key)
 ON DELETE CASCADE
);
`;
function createPostgresNotificationClaims({pool}={}){
 if(typeof pool?.query!=="function")throw new Error("notification_database_required");
 function valid(org,key){if(typeof org!=="string"||!org||typeof key!=="string"||!key)throw new Error("notification_scope_required");}
 async function claim({organizationId,key,token,leaseSeconds=60}={}){
  valid(organizationId,key);
  if(typeof token!=="string"||!token||!Number.isSafeInteger(leaseSeconds)||leaseSeconds<1||leaseSeconds>3600)throw new Error("notification_claim_invalid");
  // Atomically take a new or expired lease, but only for a pending notification.
  // PostgreSQL row-level locks serialize competing claims for the same key.
  const q=`INSERT INTO business_os_notification_claims AS c
   (organization_id,idempotency_key,claim_token,claimed_until,attempt)
   SELECT n.organization_id,n.idempotency_key,$3,NOW()+($4::integer*INTERVAL '1 second'),1
   FROM business_os_notifications n
   WHERE n.organization_id=$1 AND n.idempotency_key=$2 AND n.record->>'status'='PENDING'
   ON CONFLICT (organization_id,idempotency_key) DO UPDATE
   SET claim_token=EXCLUDED.claim_token,
       claimed_until=EXCLUDED.claimed_until,
       attempt=c.attempt+1
   WHERE c.claimed_until<NOW()
   RETURNING claim_token,claimed_until,attempt`;
  const r=await pool.query(q,[organizationId,key,token,leaseSeconds]);
  return r.rows[0]||null;
 }
 async function release({organizationId,key,token}={}){
  valid(organizationId,key);
  if(typeof token!=="string"||!token)throw new Error("notification_claim_invalid");
  const r=await pool.query("DELETE FROM business_os_notification_claims WHERE organization_id=$1 AND idempotency_key=$2 AND claim_token=$3",[organizationId,key,token]);
  return r.rowCount===1;
 }
 async function owns({organizationId,key,token}={}){
  valid(organizationId,key);
  if(typeof token!=="string"||!token)return false;
  const r=await pool.query("SELECT 1 FROM business_os_notification_claims WHERE organization_id=$1 AND idempotency_key=$2 AND claim_token=$3 AND claimed_until>NOW()",[organizationId,key,token]);
  return r.rowCount===1;
 }
 return Object.freeze({claim,release,owns});
}
module.exports={claimSchemaSQL,createPostgresNotificationClaims};
