"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {allowed,installQuinsProtectedRoutes}=require("../src/routes/quinsProtectedRoutes");
test("preview requires explicit opt-in; anonymous users remain blocked",()=>{
 const member={auth:{userId:"player",email:"p@example.com"}};
 for(const flag of [undefined,"","false","TRUE","typo"]) assert.equal(allowed(member,{QUINS_BUILD_PREVIEW:flag}),false);
 assert.equal(allowed(member,{QUINS_BUILD_PREVIEW:"true"}),true);
 assert.equal(allowed({auth:null},{QUINS_BUILD_PREVIEW:"true"}),false);
 assert.equal(allowed({auth:null},{QUINS_AUTHORIZED_USER_IDS:"player"}),false);
});
test("explicit id and email enrollments only",()=>{
 assert.equal(allowed({auth:{userId:"player"}},{QUINS_AUTHORIZED_USER_IDS:"player"}),true);
 assert.equal(allowed({auth:{userId:"other",email:"Coach@Example.com"}},{QUINS_AUTHORIZED_EMAILS:"coach@example.com"}),true);
 assert.equal(allowed({auth:{userId:"other",email:"other@example.com"}},{QUINS_AUTHORIZED_EMAILS:"coach@example.com",QUINS_BUILD_PREVIEW:"false"}),false);
});
test("protected endpoint enforces authentication and enrollment",()=>{
 let handler,guard;
 const app={get(path,a,b){if(path==="/api/quins/ravens/status"){guard=a;handler=b;}}};
 const requireAuth=()=>{};
 installQuinsProtectedRoutes({app,requireAuth,env:{}});
 assert.equal(guard,requireAuth);
 let code=200,payload,headers;
 const res={set(v){headers=v;return this;},status(v){code=v;return this;},json(v){payload=v;return this;}};
 handler({auth:null},res);
 assert.equal(code,403);assert.equal(payload.error,"QUINS_TEAM_ACCESS_REQUIRED");
 assert.equal(headers["Cache-Control"],"private, no-store");
});

test("verified platform administrators bypass redundant Quin enrollment",()=>{
 assert.equal(allowed({auth:{userId:"owner"},authz:{role:"admin"}},{}),true);
 assert.equal(allowed({auth:{userId:"owner"},authz:{role:"super_admin"}},{}),true);
 assert.equal(allowed({auth:{userId:"owner"},authz:{role:"member",isBootstrapSuperAdmin:true}},{}),true);
 assert.equal(allowed({auth:{userId:"owner"},authz:{role:"member"}},{QUINS_BUILD_PREVIEW:"false"}),false);
 assert.equal(allowed({auth:null,authz:{role:"admin"}},{}),false);
 assert.equal(allowed({auth:{userId:"owner",role:"admin"},authz:{role:"member"}},{QUINS_BUILD_PREVIEW:"false"}),false);
});

test("both tactical endpoints deny unlisted and removed members before returning payload",()=>{
 const routes={}; const guard=()=>{}; const env={QUINS_AUTHORIZED_USER_IDS:"approved"};
 installQuinsProtectedRoutes({app:{get(p,...h){routes[p]=h;}},requireAuth:guard,env});
 for(const path of ["/api/quins/ravens/status","/api/quins/ravens/play"]){
  assert.equal(routes[path][0],guard);
  const invoke=(auth)=>{let status=200,body,headers;const res={set(v){headers=v;return this;},status(v){status=v;return this;},json(v){body=v;return this;}};routes[path][1]({auth,query:{}},res);return {status,body,headers};};
  assert.equal(invoke({userId:"approved"}).status,200);
  for(const auth of [null,{userId:"unrelated"}]){const out=invoke(auth);assert.equal(out.status,403);assert.deepEqual(out.body,{error:"QUINS_TEAM_ACCESS_REQUIRED"});assert.equal(out.headers["Cache-Control"],"private, no-store");}
  env.QUINS_AUTHORIZED_USER_IDS="";assert.equal(invoke({userId:"approved"}).status,403);env.QUINS_AUTHORIZED_USER_IDS="approved";
 }
});
