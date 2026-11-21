"use strict";
// Read-only activation preflight. Must use an authorized database inspector pool.
// Never creates schema, grants privileges, or changes application routing.
const SCHEMA="business_os_notifications";
const TABLES=["business_os_notifications","business_os_notification_claims","business_os_notification_attempts","business_os_notification_reconciliation_audit"];
function createSimbaNotificationActivationPreflight({pool}={}){
 if(typeof pool?.query!=="function")throw Error("notification_preflight_database_required");
 async function inspect({runtimeRole}={}){
  if(typeof runtimeRole!=="string"||!/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole))throw Error("notification_preflight_role_invalid");
  const [schema,tables,role,privileges]=await Promise.all([
   pool.query("SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=$1) AS present",[SCHEMA]),
   pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE'",[SCHEMA]),
   pool.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=$1",[runtimeRole]),
   pool.query(`SELECT c.relname,has_table_privilege($1,c.oid,'SELECT') AS can_select,has_table_privilege($1,c.oid,'INSERT') AS can_insert,has_table_privilege($1,c.oid,'UPDATE') AS can_update,has_table_privilege($1,c.oid,'DELETE') AS can_delete
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$2 AND c.relkind IN ('r','p')`,[runtimeRole,SCHEMA])
  ]);
  const schemaPresent=schema.rows[0]?.present===true;
  const found=new Set(tables.rows.map(r=>r.table_name));
  const roleRecord=role.rows[0]||null;
  const roleSafe=!!roleRecord&&!roleRecord.rolsuper&&!roleRecord.rolcreatedb&&!roleRecord.rolcreaterole;
  const grants=new Map(privileges.rows.map(r=>[r.relname,r]));
  const missingTables=TABLES.filter(t=>!found.has(t));
  const missingGrants=TABLES.filter(t=>!grants.get(t)||!["can_select","can_insert","can_update","can_delete"].every(k=>grants.get(t)[k]===true));
  return Object.freeze({status:schemaPresent&&roleSafe&&!missingTables.length&&!missingGrants.length?"READY_FOR_MANUAL_DENIAL_TEST":"NOT_READY",schemaPresent,rolePresent:!!roleRecord,roleSafe,missingTables:Object.freeze(missingTables),missingGrants:Object.freeze(missingGrants),publicTableDenialVerified:false});
 }
 return Object.freeze({inspect});
}
module.exports={SCHEMA,TABLES,createSimbaNotificationActivationPreflight};
