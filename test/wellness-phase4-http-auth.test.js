"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),express=require("express");
const {installBusinessOSAcceptanceRoutes}=require("../src/routes/businessOSAcceptanceRoutes");
function createHarness(){
 const app=express();
 // Synthetic identity injection is TEST-LOCAL ONLY; never installed in the production application.
 const requireAuth=(req,res,next)=>{
  const identity=req.get("x-test-identity");
  if(!identity)return res.status(401).json({ok:false,error:{code:"UNAUTHENTICATED"}});
  req.auth={userId:"isolated-"+identity};req.authz={role:identity};next();
 };
 installBusinessOSAcceptanceRoutes({app,requireAuth});
 return app;
}
async function withServer(fn){
 const server=createHarness().listen(0,"127.0.0.1");
 try{
  await new Promise(resolve=>server.once("listening",resolve));
  return await fn("http://127.0.0.1:"+server.address().port);
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
}
async function request(origin,role,body="{}"){
 const headers={"Content-Type":"application/json"};
 if(role)headers["x-test-identity"]=role;
 const res=await fetch(origin+"/api/admin/business-os/acceptance/wellness/run",{method:"POST",headers,body});
 return {status:res.status,cache:res.headers.get("cache-control"),payload:await res.json()};
}
test("Phase 4 HTTP: anonymous and nonadmin identities cannot execute isolated acceptance",async()=>{
 await withServer(async origin=>{
  const anonymous=await request(origin,null);
  assert.equal(anonymous.status,401);
  for(const role of ["member","operator","trainer"]){
   const denied=await request(origin,role);
   assert.equal(denied.status,403,role);
   assert.equal(denied.payload.error.code,"FORBIDDEN");
  }
 });
});
test("Phase 4 HTTP: admin and super_admin can run disposable wellness journey",async()=>{
 await withServer(async origin=>{
  for(const role of ["admin","super_admin"]){
   const result=await request(origin,role);
   assert.equal(result.status,200,role);
   assert.match(result.cache||"",/no-store/);
   assert.equal(result.payload.ok,true);
   assert.equal(result.payload.report.mode,"ISOLATED_TEMP_STORAGE_NO_PRODUCTION_SIDE_EFFECTS");
   assert.equal(result.payload.report.passed,true);
   assert.equal(result.payload.report.checks.length,9);
   assert.equal(result.payload.report.firstFailure,null);
  }
 });
});
test("Phase 4 HTTP: invalid bodies fail closed and do not run synthetic scenario",async()=>{
 await withServer(async origin=>{
  const extra=await request(origin,"admin",JSON.stringify({scenarioIds:["WJ-011"]}));
  assert.equal(extra.status,400);
  assert.equal(extra.payload.error.code,"INVALID_REQUEST");
  const missingType=await fetch(origin+"/api/admin/business-os/acceptance/wellness/run",{method:"POST",headers:{"x-test-identity":"admin","Content-Type":"text/plain"},body:"{}"});
  assert.equal(missingType.status,415);
 });
});
