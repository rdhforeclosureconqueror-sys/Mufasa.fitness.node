"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {allowed,installQuinsProtectedRoutes}=require("../src/routes/quinsProtectedRoutes");
test("fail closed without configured enrollment",()=>{
 assert.equal(allowed({auth:{userId:"player",email:"p@example.com"}},{}),false);
 assert.equal(allowed({auth:null},{QUINS_AUTHORIZED_USER_IDS:"player"}),false);
});
test("explicit id and email enrollments only",()=>{
 assert.equal(allowed({auth:{userId:"player"}},{QUINS_AUTHORIZED_USER_IDS:"player"}),true);
 assert.equal(allowed({auth:{userId:"other",email:"Coach@Example.com"}},{QUINS_AUTHORIZED_EMAILS:"coach@example.com"}),true);
 assert.equal(allowed({auth:{userId:"other",email:"other@example.com"}},{QUINS_AUTHORIZED_EMAILS:"coach@example.com"}),false);
});
test("protected endpoint enforces authentication and enrollment",()=>{
 let handler,guard;
 const app={get(path,a,b){assert.equal(path,"/api/quins/ravens/status");guard=a;handler=b;}};
 const requireAuth=()=>{};
 installQuinsProtectedRoutes({app,requireAuth,env:{}});
 assert.equal(guard,requireAuth);
 let code=200,payload,headers;
 const res={set(v){headers=v;return this;},status(v){code=v;return this;},json(v){payload=v;return this;}};
 handler({auth:{userId:"unknown"}},res);
 assert.equal(code,403);assert.equal(payload.error,"QUINS_TEAM_ACCESS_REQUIRED");
 assert.equal(headers["Cache-Control"],"private, no-store");
});
