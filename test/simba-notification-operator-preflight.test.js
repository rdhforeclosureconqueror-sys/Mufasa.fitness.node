"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {planSimbaNotificationActivation}=require("../src/business-os/organization/simba-notification-operator-preflight");
const base={databaseName:"simba_db_jda4",publicTableCount:69,schemaPresent:false,runtimeRolePresent:false,backupExportAt:"2026-11-21T23:31:00Z",backupSaved:true};
test("saved backup alone does not bypass restore verification",()=>{const r=planSimbaNotificationActivation(base);assert.equal(r.status,"HOLD");assert.deepEqual(r.blocking,["restoreVerified"]);assert.equal(r.writesPerformed,false)});
test("a verified restore only permits separate DBA approval",()=>{const r=planSimbaNotificationActivation({...base,restoreTested:true});assert.equal(r.status,"READY_FOR_SEPARATE_DBA_APPROVAL");assert.equal(r.writesPerformed,false)});
test("reject wrong database and missing Simba table inventory",()=>{const r=planSimbaNotificationActivation({...base,databaseName:"GarveyDB",publicTableCount:0,restoreTested:true});assert.equal(r.status,"HOLD");assert.ok(r.blocking.includes("correctDatabase"));assert.ok(r.blocking.includes("existingSimbaTablesPreserved"))});
test("reject missing backup and unexpected existing schema",()=>{const r=planSimbaNotificationActivation({...base,backupExportAt:"",schemaPresent:true,restoreTested:true});assert.ok(r.blocking.includes("backupRecorded"));assert.ok(r.blocking.includes("isolatedSchemaNotYetInstalled"))});
