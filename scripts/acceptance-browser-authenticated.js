"use strict";
// Chromium browser-context authenticated customer lifecycle against an isolated local app.
// This tests real browser network requests; DOM form interactions remain a separate gate.
const {chromium}=require("playwright");
const {createApp}=require("../server");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const keys=["AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL","AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS"];
const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{NODE_ENV:"test",AUTH_TOKEN_SECRET:"acceptance-browser-auth-secret-32-characters",PILOT_LOGIN_PASSWORD:"isolated-browser-admin-password",LOGIN_SEED_EMAIL:"isolated-browser-admin@example.invalid",AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:"pilot_admin"});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-chromium-auth-"));
let server,browser,firstFailure=null;
const checks=[];
(async()=>{
 try{
  server=createApp({dataDir:dir}).listen(0,"127.0.0.1");
  await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject)});
  const base="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({serviceWorkers:"block"});
  await page.goto(base+"/quick-connect.html");
  const request=async(route,method="GET",token,body)=>{
   const result=await page.evaluate(async({route,method,token,body})=>{
    const response=await fetch(route,{method,headers:{...(token?{authorization:"Bearer "+token}:{}),...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,payload:await response.json().catch(()=>({}))};
   },{route,method,token,body});
   return result;
  };
  async function step(id,fn){try{await fn();checks.push({id,status:"PASS_BROWSER_HTTP"});}catch(error){firstFailure={id,reason:String(error.message).slice(0,240)};checks.push({id,status:"FAIL",reason:firstFailure.reason});throw error;}}
  const email="browser-"+crypto.randomBytes(12).toString("hex")+"@example.invalid",password=crypto.randomBytes(24).toString("hex");
  let id,token,adminToken,eventId;
  await step("registration",async()=>{const r=await request("/api/auth/register","POST",null,{name:"Browser Acceptance",email,password,entryContext:"run_club"});assert.equal(r.status,200,JSON.stringify(r.payload));id=r.payload.user.id;token=r.payload.token;assert.ok(id&&token);});
  await step("authentication",async()=>{const r=await request("/api/auth/me","GET",token);assert.equal(r.status,200);assert.equal(r.payload.user.email,email);});
  await step("member-admin-denial",async()=>{const r=await request("/api/admin/members?search="+encodeURIComponent(email),"GET",token);assert.equal(r.status,403);});
  await step("admin-login",async()=>{const r=await request("/api/auth/login","POST",null,{email:"isolated-browser-admin@example.invalid",password:"isolated-browser-admin-password"});assert.equal(r.status,200,JSON.stringify(r.payload));adminToken=r.payload.token;assert.ok(adminToken);});
  await step("crm-readback",async()=>{const r=await request("/api/admin/members?search="+encodeURIComponent(email),"GET",adminToken);assert.equal(r.status,200);assert.equal(r.payload.data.members[0].userId,id);});
  await step("event-publish",async()=>{const r=await request("/api/admin/community/events","POST",adminToken,{title:"Isolated Browser Yoga",location:"Test Park",type:"yoga",capacity:3,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"});assert.equal(r.status,201,JSON.stringify(r.payload));eventId=r.payload.data.event.eventId;const p=await request("/api/admin/community/events/"+eventId,"PATCH",adminToken,{status:"confirmed"});assert.equal(p.status,200);});
  await step("consent",async()=>{const r=await request("/api/me/residential-wellness","PUT",token,{interests:["yoga"],communicationConsent:true});assert.equal(r.status,200,JSON.stringify(r.payload));});
  await step("rsvp",async()=>{const r=await request("/api/me/residential-community/rsvp/"+eventId,"PUT",token,{attending:true});assert.equal(r.status,200,JSON.stringify(r.payload));});
  await step("checkin",async()=>{const r=await request("/api/admin/community/events/"+eventId+"/attendance/"+id+"/check-in","POST",adminToken);assert.equal(r.status,200,JSON.stringify(r.payload));});
  await step("attendance-readback",async()=>{const r=await request("/api/me/residential-community","GET",token);assert.equal(r.status,200);assert.ok(r.payload.data.rsvps.some(v=>v.eventId===eventId&&v.checkedInAt));});
 }catch(error){firstFailure=firstFailure||{id:"setup",reason:String(error.message).slice(0,240)}}
 finally{
  if(browser)await browser.close();
  if(server?.listening)await new Promise(resolve=>server.close(()=>resolve()));
  fs.rmSync(dir,{recursive:true,force:true});
  for(const [key,value] of Object.entries(prior)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
 const cleanupVerified=!fs.existsSync(dir);
 console.log(JSON.stringify({mode:"ISOLATED_CHROMIUM_BROWSER_FETCH",passed:!firstFailure&&cleanupVerified,firstFailure,checks,cleanupVerified,domFormsCertified:false,productionBrowserCertified:false},null,2));
 if(firstFailure||!cleanupVerified)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
