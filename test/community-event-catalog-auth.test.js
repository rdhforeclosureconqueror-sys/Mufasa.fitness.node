"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {requireEventAdmin}=require("../src/routes/communityEventCatalogRoutes");
test("event catalog admin guard rejects anonymous and nonadmin roles",()=>{
 for(const req of [{},{auth:{userId:"member"},authz:{role:"user"}},{auth:{userId:"operator"},authz:{role:"operator"}},{auth:{userId:"trainer"},authz:{role:"trainer"}}]){
   assert.throws(()=>requireEventAdmin(req,null,()=>{}),e=>e.status===(req.auth?403:401));
 }
});
test("event catalog admin guard allows admin and super_admin only",()=>{
 for(const role of ["admin","super_admin"]){let passed=false;requireEventAdmin({auth:{userId:"staff"},authz:{role}},null,()=>{passed=true});assert.equal(passed,true);}
});
