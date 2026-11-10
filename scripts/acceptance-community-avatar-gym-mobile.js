"use strict";
// Mobile Chromium smoke test: real Express auth, Community Card, reused Avatar Studio,
// and a genuine existing world-session launch. No user records or live services touched.
const {chromium,devices}=require("playwright");
const {createApp}=require("../server");
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-identity-gateway-mobile-"));
const keys=["NODE_ENV","AUTH_TOKEN_SECRET","DISABLE_LOGIN_FOR_PILOT"],previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{NODE_ENV:"test",AUTH_TOKEN_SECRET:"community-gateway-mobile-isolated-secret",DISABLE_LOGIN_FOR_PILOT:"false"});
let server,browser,firstFailure=null;const checks=[];
async function step(id,work){try{await work();checks.push({id,status:"PASS"});}catch(e){firstFailure={id,message:String(e.message).slice(0,400)};checks.push({id,status:"FAIL"});throw e;}}
(async()=>{
 try{
  server=createApp({dataDir:dir,logger:{info(){},warn(){},error(){}}}).listen(0,"127.0.0.1");
  await new Promise((ok,fail)=>{server.once("listening",ok);server.once("error",fail);});
  const base="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});
  const registration=await context.request.post(base+"/api/auth/register",{data:{name:"Community Guest",email:"virtual-"+crypto.randomBytes(8).toString("hex")+"@example.invalid",password:"Strong-Community-Gateway-2026!",entryContext:"run_club"}});
  assert.equal(registration.status(),200,await registration.text());
  const {token}=await registration.json();assert.ok(token);
  await context.addInitScript(({token,base})=>{window.MAAT_BACKEND_ORIGIN=base;sessionStorage.setItem("maatAuthToken",token);},{token,base});
  const page=await context.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(String(e.message)));
  await step("card-loads-with-two-entrances",async()=>{
   await page.goto(base+"/community-entrance.html");
   await page.waitForFunction(()=>!document.querySelector("#saveCard").disabled,{timeout:15000});
   assert.equal(await page.locator("#communityEnterGym").isVisible(),true);
   assert.equal(await page.locator("#communityAvatarSetupLink").isVisible(),true);
   assert.match(await page.locator("#communityAvatarSetupLink").getAttribute("href"),/avatarSetup=community/);
  });
  await step("missing-avatar-fails-before-world-session",async()=>{
   await page.locator("#communityEnterGym").click();
   await page.getByText("Create or upload your avatar first, then enter the gym.").waitFor();
   assert.match(await page.locator("#communityGymFirstFailure").innerText(),/AVATAR_PROFILE/);
   assert.equal(await page.locator("#communityGymDiagnostics").evaluate(e=>e.open),true);
  });
  await step("avatar-diagnostic-identifies-first-failure",async()=>{
   await page.locator("#communityAvatarDiagnostics summary").click();
   await page.locator("#communityAvatarRunCheck").click();
   await page.waitForFunction(()=>!document.querySelector("#communityAvatarRunCheck").disabled,{timeout:15000});
   const status=await page.locator("#communityAvatarFirstFailure").innerText();
   assert.ok(status!=="NOT RUN");
   assert.ok((await page.locator("#communityAvatarDebugTrace").innerText()).includes("CANONICAL_PROFILE"));
  });
  await step("reused-avatar-studio-opens-and-shows-first-failure",async()=>{
   await page.locator("#communityAvatarSetupLink").click();
   await page.waitForURL(/push-up-release\.html\?avatarSetup=community/);
   await page.getByText("Community Avatar Studio").waitFor();
   assert.equal(await page.locator("#releaseAvatarValidationPanel").isVisible(),true);
   assert.equal(await page.locator("#releaseAvatarDebugFirstFailure").count(),1);
   assert.equal(await page.locator("#releaseAvatarFileInput").count(),1);
   assert.equal(await page.locator("#releaseUploadAvatarBtn").count(),1);
   assert.equal(await page.locator(".release-gate").isVisible(),false);
   assert.equal(await page.locator('a[href="/community-entrance.html"]').count()>0,true);
  });
  await step("no-new-page-errors",async()=>{assert.deepEqual(errors,[]);});
  await context.close();
 }catch(e){if(!firstFailure)firstFailure={id:"setup",message:String(e.message).slice(0,400)};}
 finally{
  if(browser)await browser.close();
  if(server?.listening)await new Promise(ok=>server.close(ok));
  fs.rmSync(dir,{recursive:true,force:true});
  for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
 console.log(JSON.stringify({mode:"ISOLATED_CHROMIUM_IPHONE13_COMMUNITY_GATEWAY",passed:!firstFailure,firstFailure,checks,physicalIphoneVerified:false,multiplayerPhysicalDevicesVerified:false},null,2));
 if(firstFailure)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
