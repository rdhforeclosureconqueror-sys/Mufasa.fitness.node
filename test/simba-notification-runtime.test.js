"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createSimbaNotificationPoolConfig,notificationRuntimeGrantSQL}=require("../src/business-os/organization/simba-notification-runtime");
test("pool uses dedicated connection and schema-only search path",()=>{
 const config=createSimbaNotificationPoolConfig({connectionString:"postgresql://example.invalid/db"});
 assert.equal(config.options,"-c search_path=business_os_notifications,pg_catalog");
 assert.equal(config.application_name,"business-os-notifications");
 assert.equal(Object.isFrozen(config),true);
 assert.equal(Object.hasOwn(config,"password"),false);
});
test("missing connection fails closed",()=>assert.throws(()=>createSimbaNotificationPoolConfig(),/connection_required/));
test("runtime grants apply only to notification schema",()=>{
 const sql=notificationRuntimeGrantSQL("business_os_runtime");
 assert.match(sql,/GRANT USAGE ON SCHEMA business_os_notifications/);
 assert.match(sql,/GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA business_os_notifications/);
 assert.match(sql,/REVOKE CREATE ON SCHEMA business_os_notifications/);
 assert.doesNotMatch(sql,/public\./);
});
test("unsafe role identifiers rejected",()=>{
 for(const role of ['x";DROP TABLE public.users;--',"Public","a-b",""])assert.throws(()=>notificationRuntimeGrantSQL(role),/role_invalid/);
});
