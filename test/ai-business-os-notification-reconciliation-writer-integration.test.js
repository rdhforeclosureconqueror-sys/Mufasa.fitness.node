"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {schemaSQL}=require("../src/business-os/organization/postgres-notification-repository");
const {claimSchemaSQL}=require("../src/business-os/organization/postgres-notification-claims");
const {attemptSchemaSQL}=require("../src/business-os/organization/postgres-notification-attempt-ledger");
const {reconciliationAuditSchemaSQL,createPostgresReconciliationWriter}=require("../src/business-os/organization/postgres-notification-reconciliation-writer");
test("PostgreSQL verified reconciliation is durable, audited and cannot be repeated",async t=>{
 if(!process.env.NOTIFICATION_TEST_DATABASE_URL)return t.skip("ephemeral PostgreSQL required");
 const {Pool}=require("pg"),pool=new Pool({connectionString:process.env.NOTIFICATION_TEST_DATABASE_URL});
 const org="reconcile-ci-"+process.pid+"-"+Date.now(),key="notice",attempt="attempt-1";
 try{
  for(const sql of [schemaSQL,claimSchemaSQL,attemptSchemaSQL,reconciliationAuditSchemaSQL])await pool.query(sql);
  await pool.query("INSERT INTO business_os_notifications (organization_id,idempotency_key,record) VALUES ($1,$2,$3::jsonb)",[org,key,JSON.stringify({status:"PENDING"})]);
  await pool.query("INSERT INTO business_os_notification_attempts (organization_id,idempotency_key,attempt_id,claim_token,outcome) VALUES ($1,$2,$3,'worker','UNKNOWN')",[org,key,attempt]);
  const writer=createPostgresReconciliationWriter({pool,verifyActor:async()=>({authorized:true,actorId:"reviewer"}),verifyDelivery:async()=>({verified:true})});
  assert.equal((await writer.confirmVerified({organizationId:org,key,attemptId:attempt,actor:{},receipt:"verified-receipt"})).status,"VERIFIED");
  const state=await pool.query("SELECT outcome,provider_reference FROM business_os_notification_attempts WHERE organization_id=$1 AND idempotency_key=$2",[org,key]);
  assert.deepEqual([state.rows[0].outcome,state.rows[0].provider_reference],["VERIFIED","verified-receipt"]);
  const audit=await pool.query("SELECT actor_id,receipt FROM business_os_notification_reconciliation_audit WHERE organization_id=$1 AND idempotency_key=$2",[org,key]);
  assert.deepEqual([audit.rows[0].actor_id,audit.rows[0].receipt],["reviewer","verified-receipt"]);
  await assert.rejects(()=>writer.confirmVerified({organizationId:org,key,attemptId:attempt,actor:{},receipt:"other"}),/reconciliation_state_conflict/);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM business_os_notification_reconciliation_audit WHERE organization_id=$1",[org])).rows[0].count,1);
 }finally{await pool.query("DELETE FROM business_os_notifications WHERE organization_id=$1",[org]).catch(()=>{});await pool.end();}
});
