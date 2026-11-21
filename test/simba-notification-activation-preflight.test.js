"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createSimbaNotificationActivationPreflight,TABLES}=require("../src/business-os/organization/simba-notification-activation-preflight");
function fixture({schema=true,role=true,unsafe=false,missing=[],denied=[]}={}){
 const queries=[];
 const pool={async query(sql,params){queries.push({sql,params});if(sql.includes("SELECT EXISTS(SELECT 1 FROM pg_namespace"))return {rows:[{present:schema}]};
 if(sql.includes("information_schema.tables"))return {rows:TABLES.filter(t=>!missing.includes(t)).map(table_name=>({table_name}))};
 if(sql.includes("pg_roles"))return {rows:role?[{rolname:"business_os_runtime",rolsuper:unsafe,rolcreatedb:false,rolcreaterole:false}]:[]};
 return {rows:TABLES.filter(t=>!missing.includes(t)).map(relname=>({relname,can_select:!denied.includes(relname),can_insert:true,can_update:true,can_delete:true}))};}};
 return {api:createSimbaNotificationActivationPreflight({pool}),queries};
}
test("complete least privilege checks still require manual public denial test",async()=>{
 const f=fixture();const result=await f.api.inspect({runtimeRole:"business_os_runtime"});
 assert.equal(result.status,"READY_FOR_MANUAL_DENIAL_TEST");assert.equal(result.publicTableDenialVerified,false);assert.equal(f.queries.length,4);
 assert.ok(f.queries.every(q=>/^SELECT/.test(q.sql.trim())));assert.ok(f.queries.at(-1).sql.includes("to_regrole($1)"));
});
for(const [name,opts] of [["missing schema",{schema:false}],["missing role",{role:false}],["privileged role",{unsafe:true}],["missing table",{missing:[TABLES[0]]}],["missing grant",{denied:[TABLES[1]]}]]){
 test(name+" fails closed",async()=>{const r=await fixture(opts).api.inspect({runtimeRole:"business_os_runtime"});assert.equal(r.status,"NOT_READY")});
}
test("rejects invalid role identifiers",async()=>{await assert.rejects(()=>fixture().api.inspect({runtimeRole:'public;drop'}),/role_invalid/)});
