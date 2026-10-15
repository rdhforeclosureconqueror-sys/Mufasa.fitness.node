"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {requireLabAdmin}=require("../src/routes/businessOSAcceptanceRoutes");
function check(auth,authz){let status=null,called=false;const res={status(n){status=n;return this},json(x){return x}};requireLabAdmin({auth,authz},res,()=>{called=true});return {status,called}}
test("admin and super_admin can access lab",()=>{for(const role of ["admin","super_admin"])assert.deepEqual(check({userId:"u"},{role}),{status:null,called:true})});
test("anonymous, member, operator, and trainer are denied",()=>{assert.equal(check(null,null).status,401);for(const role of ["user","operator","trainer"])assert.equal(check({userId:"u"},{role}).status,403)});
test("untrusted role in auth token cannot bypass canonical authz",()=>{assert.equal(check({userId:"u",role:"super_admin"},{role:"user"}).status,403)});
