"use strict";
// Real Express HTTP acceptance using isolated disk, real registration and signed bearer tokens.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const crypto=require("node:crypto");
const {createApp}=require("../server");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-community-id-http-"));
const previous=Object.fromEntries(["NODE_ENV","AUTH_TOKEN_SECRET","DISABLE_LOGIN_FOR_PILOT"].map(k=>[k,process.env[k]]));
Object.assign(process.env,{NODE_ENV:"test",AUTH_TOKEN_SECRET:"community-card-isolated-test-secret-2026",DISABLE_LOGIN_FOR_PILOT:"false"});
let server=null,firstFailure=null;const checks=[];
async function listen(){
 const app=createApp({dataDir:dir,logger:{info(){},warn(){},error(){}}});
 const s=app.listen(0,"127.0.0.1");
 await new Promise((resolve,reject)=>{s.once("listening",resolve);s.once("error",reject);});return s;
}
function base(){return "http://127.0.0.1:"+server.address().port;}
async function http(path,method="GET",token,body){
 const res=await fetch(base()+path,{method,headers:{...(token?{authorization:"Bearer "+token}:{}),...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
 return {status:res.status,data:await res.json().catch(()=>({}))};
}
async function step(id,run){try{await run();checks.push({id,result:"PASS"});}catch(e){firstFailure={id,reason:String(e.message).slice(0,360)};checks.push({id,result:"FAIL"});throw e;}}
async function close(){if(server){await new Promise(resolve=>server.close(resolve));server=null;}}
(async()=>{
 let alice,bob,aliceId;
 try{
  server=await listen();
  await step("authentication-required",async()=>{
   for(const method of ["GET","PUT"]){const r=await http("/api/me/community-card",method);assert.equal(r.status,401,JSON.stringify(r.data));}
  });
  const register=async name=>{
   const email="community-"+crypto.randomBytes(9).toString("hex")+"@example.invalid";
   const r=await http("/api/auth/register","POST",null,{name,email,password:"Milele-Card-2026-Valid-Password!",entryContext:"community_signup"});
   assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(r.data.token&&r.data.user?.id);return {token:r.data.token,id:r.data.user.id};
  };
  await step("two-independent-members-register",async()=>{alice=await register("Card Alice");bob=await register("Card Bob");aliceId=alice.id;assert.notEqual(alice.id,bob.id);});
  await step("card-initially-empty",async()=>{const r=await http("/api/me/community-card","GET",alice.token);assert.equal(r.status,200);assert.equal(r.data.data.card,null);});
  const card={displayName:"Peace Walker",bioShort:"Here for community",interests:["yoga","meditation"],goals:["make_friends"],visibility:"private"};
  await step("save-private-card",async()=>{const r=await http("/api/me/community-card","PUT",alice.token,card);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.data.card.displayName,card.displayName);assert.equal(r.data.data.card.visibility,"private");});
  await step("invalid-payload-rejected",async()=>{const r=await http("/api/me/community-card","PUT",alice.token,{...card,email:"not-allowed@example.invalid"});assert.equal(r.status,400,JSON.stringify(r.data));});
  await step("cross-account-read-isolation",async()=>{const r=await http("/api/me/community-card","GET",bob.token);assert.equal(r.status,200);assert.equal(r.data.data.card,null);});
  await step("persisted-on-disk",async()=>{const saved=JSON.parse(fs.readFileSync(path.join(dir,"users",aliceId+".json"),"utf8"));assert.equal(saved.communityCard.displayName,card.displayName);});
  await step("fresh-app-instance-reloads-card",async()=>{await close();server=await listen();const r=await http("/api/me/community-card","GET",alice.token);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.data.card.displayName,card.displayName);assert.equal(r.data.data.card.visibility,"private");});
  await step("separate-account-remains-isolated-after-restart",async()=>{const r=await http("/api/me/community-card","GET",bob.token);assert.equal(r.status,200);assert.equal(r.data.data.card,null);});
  await step("members-visibility-is-explicit",async()=>{const r=await http("/api/me/community-card","PUT",alice.token,{...card,visibility:"members"});assert.equal(r.status,200);assert.equal(r.data.data.card.visibility,"members");});
 }catch(e){if(!firstFailure)firstFailure={id:"setup",reason:String(e.message).slice(0,360)};}
 finally{
  await close();fs.rmSync(dir,{recursive:true,force:true});
  for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
 const cleanupVerified=!fs.existsSync(dir);
 console.log(JSON.stringify({mode:"ISOLATED_REAL_EXPRESS_HTTP",passed:!firstFailure&&cleanupVerified,firstFailure,checks,cleanupVerified,productionCertified:false},null,2));
 if(firstFailure||!cleanupVerified)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
