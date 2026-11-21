"use strict";
// A fail-closed, side-effect-free approval gate for the shared Simba database.
// Never accepts database passwords or performs DDL.
const DATABASE="simba_db_jda4";
const SCHEMA="business_os_notifications";
function planSimbaNotificationActivation({databaseName,publicTableCount,schemaPresent,runtimeRolePresent,backupExportAt,backupSaved,restoreTested=false}={}){
 const checks=Object.freeze({
  correctDatabase:databaseName===DATABASE,
  existingSimbaTablesPreserved:Number.isSafeInteger(publicTableCount)&&publicTableCount>=69,
  isolatedSchemaNotYetInstalled:schemaPresent===false,
  runtimeRoleNotYetInstalled:runtimeRolePresent===false,
  backupRecorded:typeof backupExportAt==="string"&&/^\\d{4}-\\d{2}-\\d{2}T/.test(backupExportAt)&&!Number.isNaN(Date.parse(backupExportAt)),
  offsiteCopyConfirmed:backupSaved===true,
  restoreVerified:restoreTested===true
 });
 const blocking=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
 return Object.freeze({database:DATABASE,schema:SCHEMA,status:blocking.length?"HOLD":"READY_FOR_SEPARATE_DBA_APPROVAL",checks,blocking:Object.freeze(blocking),writesPerformed:false});
}
module.exports={planSimbaNotificationActivation};
