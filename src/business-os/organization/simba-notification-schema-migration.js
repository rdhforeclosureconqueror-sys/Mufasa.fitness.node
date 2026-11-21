"use strict";
// Explicit, opt-in migration for the approved shared Simba PostgreSQL instance.
// No production invocation or credentials in this module.
const {schemaSQL}=require("./postgres-notification-repository");
const {claimSchemaSQL}=require("./postgres-notification-claims");
const {attemptSchemaSQL}=require("./postgres-notification-attempt-ledger");
const {reconciliationAuditSchemaSQL}=require("./postgres-notification-reconciliation-writer");
const SCHEMA="business_os_notifications";
function createSimbaNotificationSchemaMigration({pool}={}){
 if(typeof pool?.connect!=="function")throw Error("notification_migration_database_required");
 async function migrate({approved=false}={}){
  if(approved!==true)throw Error("notification_migration_explicit_approval_required");
  const client=await pool.connect();
  let begun=false;
  try{
   await client.query("BEGIN");begun=true;
   await client.query("CREATE SCHEMA IF NOT EXISTS business_os_notifications");
   // Transaction-local search path ensures all tables, foreign keys and indexes stay isolated.
   await client.query("SET LOCAL search_path TO business_os_notifications, pg_catalog");
   for(const sql of [schemaSQL,claimSchemaSQL,attemptSchemaSQL,reconciliationAuditSchemaSQL])await client.query(sql);
   await client.query("COMMIT");begun=false;
   return Object.freeze({schema:SCHEMA,status:"MIGRATED"});
  }catch(error){
   if(begun)try{await client.query("ROLLBACK")}catch(rollbackError){error.rollbackError=rollbackError}
   throw error;
  }finally{client.release()}
 }
 return Object.freeze({migrate});
}
module.exports={SCHEMA,createSimbaNotificationSchemaMigration};
