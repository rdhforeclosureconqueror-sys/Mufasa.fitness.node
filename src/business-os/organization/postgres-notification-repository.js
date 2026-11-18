"use strict";
// Transactional, organization-scoped notification state repository.
// Requires a trusted, configured pg Pool; does not create a database or send notifications.
const schemaSQL=`
CREATE TABLE IF NOT EXISTS business_os_notifications (
 organization_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 record JSONB NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (organization_id,idempotency_key)
);
`;
function createPostgresNotificationRepository({pool}={}){
 if(!pool||typeof pool.query!=="function")throw new Error("notification_database_required");
 function validate(organizationId,key){
  if(typeof organizationId!=="string"||!organizationId||typeof key!=="string"||!key)throw new Error("notification_scope_required");
 }
 async function get(organizationId,key){
  validate(organizationId,key);
  const r=await pool.query("SELECT record, version FROM business_os_notifications WHERE organization_id=$1 AND idempotency_key=$2",[organizationId,key]);
  return r.rows[0]||null;
 }
 async function insertIfAbsent(record){
  validate(record?.organizationId,record?.idempotencyKey);
  if(record.approvalGranted!==false||record.deliveryStatus!=="NOT_SENT"||record.status!=="PENDING")throw new Error("notification_initial_state_invalid");
  const r=await pool.query("INSERT INTO business_os_notifications (organization_id,idempotency_key,record) VALUES ($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING record,version",[record.organizationId,record.idempotencyKey,JSON.stringify(record)]);
  return {inserted:r.rowCount===1,entry:r.rows[0]||await get(record.organizationId,record.idempotencyKey)};
 }
 async function transition({organizationId,key,expectedStatus,expectedVersion,nextStatus,patch={}}){
  validate(organizationId,key);
  const allowed={PENDING:["DELIVERED","SUPERSEDED"],DELIVERED:["ACKNOWLEDGED","SUPERSEDED"]};
  if(!allowed[expectedStatus]?.includes(nextStatus)||!((typeof expectedVersion==="number"&&Number.isSafeInteger(expectedVersion)&&expectedVersion>=1)||(typeof expectedVersion==="string"&&/^[1-9][0-9]*$/.test(expectedVersion)&&BigInt(expectedVersion)<=9223372036854775807n))||!patch||typeof patch!=="object"||Array.isArray(patch))throw new Error("notification_transition_invalid");
  if(["organizationId","idempotencyKey","status","approvalGranted","authorizationRequested","workId","workVersion","recipientRole"].some(k=>Object.hasOwn(patch,k)))throw new Error("notification_patch_forbidden");
  const r=await pool.query(`UPDATE business_os_notifications SET record=jsonb_set(record || $5::jsonb,'{status}',to_jsonb($6::text)),version=version+1,updated_at=NOW() WHERE organization_id=$1 AND idempotency_key=$2 AND record->>'status'=$3 AND version=$4 RETURNING record,version`,[organizationId,key,expectedStatus,expectedVersion,JSON.stringify(patch),nextStatus]);
  if(r.rowCount!==1)throw new Error("notification_state_conflict");
  return r.rows[0];
 }
 async function list(organizationId){
  if(typeof organizationId!=="string"||!organizationId)throw new Error("notification_scope_required");
  const r=await pool.query("SELECT record,version FROM business_os_notifications WHERE organization_id=$1 ORDER BY updated_at,idempotency_key",[organizationId]);
  return r.rows;
 }
 return Object.freeze({get,insertIfAbsent,transition,list});
}
module.exports={schemaSQL,createPostgresNotificationRepository};
