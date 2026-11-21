"use strict";
// Read-only isolation verification; execute using the dedicated notification runtime role,
// never using Simba's owner/administrator pool. No data reads or writes to application tables.
function createSimbaNotificationPublicDenialCheck({pool}={}){
 if(typeof pool?.query!=="function")throw Error("notification_denial_runtime_pool_required");
 async function inspect({expectedRole}={}){
  if(typeof expectedRole!=="string"||!/^\\w[a-z0-9_]{0,62}$/.test(expectedRole))throw Error("notification_denial_expected_role_required");
  const identity=await pool.query("SELECT current_user AS username, current_setting('search_path') AS search_path");
  const username=identity.rows[0]?.username;
  const searchPath=identity.rows[0]?.search_path;
  if(typeof username!=="string"||username!==expectedRole)return Object.freeze({status:"NOT_READY",reason:"unsafe_runtime_identity",publicTableDenialVerified:false});
  if(searchPath!=="business_os_notifications,pg_catalog")return Object.freeze({status:"NOT_READY",reason:"unsafe_search_path",publicTableDenialVerified:false});
  const result=await pool.query(`SELECT c.relname,
    has_table_privilege(c.oid,'SELECT') AS can_select,
    has_table_privilege(c.oid,'INSERT') AS can_insert,
    has_table_privilege(c.oid,'UPDATE') AS can_update,
    has_table_privilege(c.oid,'DELETE') AS can_delete,
    has_table_privilege(c.oid,'TRUNCATE') AS can_truncate,
    has_table_privilege(c.oid,'REFERENCES') AS can_reference,
    has_table_privilege(c.oid,'TRIGGER') AS can_trigger
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')`);
  const accessible=result.rows.filter(r=>Object.entries(r).some(([k,v])=>k.startsWith("can_")&&v===true)).map(r=>r.relname);
  return Object.freeze({status:accessible.length||!result.rows.length?"NOT_READY":"PUBLIC_ACCESS_DENIED",publicTableDenialVerified:accessible.length===0&&result.rows.length>0,publicObjectsChecked:result.rows.length,accessiblePublicObjects:Object.freeze(accessible)});
 }
 return Object.freeze({inspect});
}
module.exports={createSimbaNotificationPublicDenialCheck};
