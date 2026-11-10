"use strict";
// Isolated, mobile-sized Chromium DOM acceptance for the real Community Entrance page.
const {chromium,devices}=require("playwright");
const {createApp}=require("../server");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const vars=["NODE_ENV","AUTH_TOKEN_SECRET","DISABLE_LOGIN_FOR_PILOT"];
const old=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
Object.assign(process.env,{NODE_ENV:"test",AUTH_TOKEN_SECRET:"community-card-mobile-dom-acceptance-secret",DISABLE_LOGIN_FOR_PILOT:"false"});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-community-card-mobile-"));
let server,browser,firstFailure=null;const checks=[];
async function step(id,fn){try{await fn();checks.push({id,result:"PASS"});}catch(error){firstFailure={id,reason:String(error.message).slice(0,400)};checks.push({id,result:"FAIL"});throw error;}}
(async()=>{
 try{
  server=createApp({dataDir:dir,logger:{info(){},warn(){},error(){}}}).listen(0,"127.0.0.1");
  await new Promise((res,rej)=>{server.once("listening",res);server.once("error",rej);});
  const base="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});
  const registration=await context.request.post(base+"/api/auth/register",{data:{name:"Mobile Identity",email:"card-"+crypto.randomBytes(8).toString("hex")+"@example.invalid",password:"Valid-Community-Card-2026!",entryContext:"run_club"}});
  assert.equal(registration.status(),200,await registration.text());
  const payload=await registration.json();
  const token=payload.token;assert.ok(token);
  await context.addInitScript(({token,base})=>{
    window.MAAT_BACKEND_ORIGIN=base;
    sessionStorage.setItem("maatAuthToken",token);
  },{token,base});
  const page=await context.newPage();
  const failures=[];page.on("pageerror",e=>failures.push(String(e.message)));
  await step("mobile-page-authenticated",async()=>{
   await page.goto(base+"/community-entrance.html");
   await page.locator("#saveCard").waitFor({state:"visible"});
   await page.waitForFunction(()=>!document.querySelector("#saveCard").disabled,{timeout:15000});
   assert.match(await page.locator("#status").innerText(),/ready to create/i);
   assert.equal(await page.locator("#visibility").inputValue(),"private");
  });
  await step("mobile-card-preview-and-save",async()=>{
   await page.locator("#displayName").fill("Golden Heart");
   await page.locator("#bioShort").fill("Here to connect and breathe.");
   await page.locator('input[name="interests"][value="yoga"]').check();
   await page.locator('input[name="interests"][value="sound_healing"]').check();
   await page.locator('input[name="goals"][value="make_friends"]').check();
   assert.equal(await page.locator("#previewName").innerText(),"Golden Heart");
   assert.match(await page.locator("#previewBio").innerText(),/connect and breathe/);
   await page.locator("#saveCard").click();
   await page.getByText("Your Community ID is saved!").waitFor();
  });
  await step("mobile-refresh-restores-private-card",async()=>{
   await page.reload();
   await page.getByText("Your saved card is ready to edit.").waitFor();
   assert.equal(await page.locator("#displayName").inputValue(),"Golden Heart");
   assert.equal(await page.locator("#visibility").inputValue(),"private");
   assert.equal(await page.locator('input[name="interests"][value="yoga"]').isChecked(),true);
   assert.equal(await page.locator('input[name="goals"][value="make_friends"]').isChecked(),true);
  });
  await step("explicit-member-visibility-opt-in",async()=>{
   await page.locator("#visibility").selectOption("members");
   assert.match(await page.locator("#previewPrivacy").innerText(),/Visible to signed-in community members/);
   await page.locator("#saveCard").click();
   await page.getByText("Your Community ID is saved!").waitFor();
   await page.reload();
   await page.getByText("Your saved card is ready to edit.").waitFor();
   assert.equal(await page.locator("#visibility").inputValue(),"members");
  });
  await step("mobile-width-no-horizontal-overflow",async()=>{
   const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(d.scroll<=d.width+2,JSON.stringify(d));
   assert.equal(failures.length,0,failures.join("; "));
  });
  await context.close();
 }catch(error){if(!firstFailure)firstFailure={id:"setup",reason:String(error.message).slice(0,400)};}
 finally{
  if(browser)await browser.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
  for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
 const cleanupVerified=!fs.existsSync(dir);
 console.log(JSON.stringify({mode:"ISOLATED_MOBILE_CHROMIUM_DOM",passed:!firstFailure&&cleanupVerified,firstFailure,checks,cleanupVerified,physicalIphoneCertified:false,liveCertified:false},null,2));
 if(firstFailure||!cleanupVerified)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
