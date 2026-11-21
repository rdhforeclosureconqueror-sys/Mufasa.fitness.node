"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createSimbaNotificationPublicDenialCheck}=require("../src/business-os/organization/simba-notification-public-denial");
function fixture({username="business_os_runtime",path="business_os_notifications,pg_catalog",objects=[{relname:"simba_accounts",can_select:false,can_insert:false,can_update:false,can_delete:false,can_truncate:false,can_reference:false,can_trigger:false}]}={}){
 const queries=[];const pool={async query(sql){queries.push(sql);return sql.includes("current_user")?{rows:[{username,search_path:path}]}:{rows:objects}}};
 return {check:createSimbaNotificationPublicDenialCheck({pool}),queries};
}
test("verifies denial using runtime identity and catalog privileges only",async()=>{
 const f=fixture(),r=await f.check.inspect({expectedRole:"business_os_runtime"});
 assert.equal(r.status,"PUBLIC_ACCESS_DENIED");assert.equal(r.publicTableDenialVerified,true);
 assert.equal(r.publicObjectsChecked,1);assert.equal(f.queries.length,2);
 assert.ok(f.queries.every(s=>s.trim().startsWith("SELECT")));
});
test("any public privilege fails closed",async()=>{
 const f=fixture({objects:[{relname:"simba_accounts",can_select:true}]});
 const r=await f.check.inspect({expectedRole:"business_os_runtime"});
 assert.equal(r.status,"NOT_READY");assert.deepEqual(r.accessiblePublicObjects,["simba_accounts"]);
});
test("empty public inventory is not proof",async()=>assert.equal((await fixture({objects:[]}).check.inspect({expectedRole:"business_os_runtime"})).status,"NOT_READY"));
test("owner role or wrong search path fails closed",async()=>{
 for(const options of [{username:"simba_db_jda4_user"},{path:"public"}]){
  const f=fixture(options),r=await f.check.inspect({expectedRole:"business_os_runtime"});
  assert.equal(r.status,"NOT_READY");assert.equal(f.queries.length,1);
 }
});
test("missing or invalid expected role rejected",async()=>{await assert.rejects(()=>fixture().check.inspect(),/expected_role_required/);await assert.rejects(()=>fixture().check.inspect({expectedRole:"a;drop"}),/expected_role_required/)});
