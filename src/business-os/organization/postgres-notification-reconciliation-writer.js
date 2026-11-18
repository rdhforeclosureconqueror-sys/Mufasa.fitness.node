"use strict";
// Explicit migration on an approved isolated Business OS PostgreSQL database only.
const reconciliationAuditSchemaSQL=`
CREATE TABLE IF NOT EXISTS business_os_notification_reconciliation_audit (
 organization_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 attempt_id TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 receipt TEXT NOT NULL,
 reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (organization_id,idempotency_key,attempt_id),
 FOREIGN KEY (organization_id,idempotency_key,attempt_id)
 REFERENCES business_os_notification_attempts(organization_id,idempotency_key,attempt_id)
 ON DELETE CASCADE
);
`;
function createPostgresReconciliationWriter({pool,verifyActor,verifyDelivery}={}){
 if(typeof pool?.connect!=="function"||typeof verifyActor!=="function"||typeof verifyDelivery!=="function")throw Error("reconciliation_writer_dependencies_required");
 async function confirmVerified({organizationId,key,attemptId,actor,receipt}={}){
  if(![organizationId,key,attemptId,receipt].every(x=>typeof x==="string"&&x.length>0))throw Error("reconciliation_scope_required");
  const identity=await verifyActor({actor,organizationId,action:"notification.reconcile"});
  if(identity?.authorized!==true||typeof identity.actorId!=="string"||!identity.actorId)throw Error("reconciliation_unauthorized");
  const proof=await verifyDelivery({organizationId,key,attemptId,receipt});
  if(proof?.verified!==true)throw Error("reconciliation_delivery_unverified");
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const result=await client.query(`UPDATE business_os_notification_attempts SET outcome='VERIFIED',
    provider_reference=$4,updated_at=NOW()
    WHERE organization_id=$1 AND idempotency_key=$2 AND attempt_id=$3
    AND outcome IN ('STARTED','UNKNOWN')
    RETURNING attempt_id,outcome`,[organizationId,key,attemptId,receipt]);
   if(result.rowCount!==1)throw Error("reconciliation_state_conflict");
   await client.query(`INSERT INTO business_os_notification_reconciliation_audit
    (organization_id,idempotency_key,attempt_id,actor_id,receipt)
    VALUES ($1,$2,$3,$4,$5)`,[organizationId,key,attemptId,identity.actorId,receipt]);
   await client.query("COMMIT");
   return Object.freeze({status:"VERIFIED",attemptId});
  }catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
 }
 return Object.freeze({confirmVerified});
}
module.exports={reconciliationAuditSchemaSQL,createPostgresReconciliationWriter};
