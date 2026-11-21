"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createSimbaNotificationSchemaMigration}=require("../src/business-os/organization/simba-notification-schema-migration");
function fixture(failAt){
 const calls=[];let released=false;
 const client={async query(sql){calls.push(sql);if(failAt&&sql.includes(failAt))throw Error("migration_failed")},release(){released=true}};
 return {api:createSimbaNotificationSchemaMigration({pool:{async connect(){return client}}}),calls,released:()=>released};
}
test("migration requires explicit approval and never connects by default",async()=>{
 let connections=0;const api=createSimbaNotificationSchemaMigration({pool:{async connect(){connections++;throw Error("unexpected")}}});
 await assert.rejects(()=>api.migrate(),/explicit_approval_required/);assert.equal(connections,0);
});
test("all four notification tables are created in transaction-local isolated schema",async()=>{
 const f=fixture();const r=await f.api.migrate({approved:true});
 assert.equal(r.schema,"business_os_notifications");assert.equal(r.status,"MIGRATED");
 assert.equal(f.calls[0],"BEGIN");assert.equal(f.calls[1],"CREATE SCHEMA IF NOT EXISTS business_os_notifications");
 assert.equal(f.calls[2],"SET LOCAL search_path TO business_os_notifications, pg_catalog");
 assert.equal(f.calls.at(-1),"COMMIT");assert.equal(f.calls.length,8);
 assert.ok(f.calls.slice(3,7).every(sql=>sql.includes("CREATE TABLE IF NOT EXISTS business_os_")));
 assert.equal(f.released(),true);
});
test("migration failure rolls back and releases connection",async()=>{
 const f=fixture("business_os_notification_attempts");
 await assert.rejects(()=>f.api.migrate({approved:true}),/migration_failed/);
 assert.equal(f.calls.at(-1),"ROLLBACK");assert.equal(f.calls.includes("COMMIT"),false);assert.equal(f.released(),true);
});
