"use strict";
// Explicitly configured, least-privilege runtime connection to the approved Simba database.
// Credentials must be provisioned separately; never use Simba's owner credentials.
const SCHEMA="business_os_notifications";
function createSimbaNotificationPoolConfig({connectionString,applicationName="business-os-notifications"}={}){
 if(typeof connectionString!=="string"||!connectionString.trim())throw Error("notification_runtime_connection_required");
 if(typeof applicationName!=="string"||!/^[a-zA-Z0-9_-]{1,63}$/.test(applicationName))throw Error("notification_runtime_application_invalid");
 // node-postgres passes this startup option to every pooled connection. No unqualified
 // notification SQL can resolve a table from Simba's public schema.
 return Object.freeze({
  connectionString,
  options:"-c search_path="+SCHEMA+",pg_catalog",
  application_name:applicationName,
  allowExitOnIdle:false
 });
}
// DBA-only reviewable SQL. No credentials, automatic role creation, or automatic grants.
// Requires an existing dedicated LOGIN role; never grant access to public.*.
// SQL identifier is restricted to prevent injection.
function notificationRuntimeGrantSQL(role){
 if(typeof role!=="string"||!/^[a-z_][a-z0-9_]{0,62}$/.test(role))throw Error("notification_runtime_role_invalid");
 const ident='"'+role+'"';
 return [
  "GRANT USAGE ON SCHEMA business_os_notifications TO "+ident+";",
  "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA business_os_notifications TO "+ident+";",
  "REVOKE CREATE ON SCHEMA business_os_notifications FROM "+ident+";"
 ].join("\n");
}
module.exports={SCHEMA,createSimbaNotificationPoolConfig,notificationRuntimeGrantSQL};
