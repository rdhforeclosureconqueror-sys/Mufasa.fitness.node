"use strict";
// Real customer-facing registration DOM automation on a disposable local server.
// This is not production E2E; no real customer data, messages, or payments.
const {chromium}=require("playwright");
const {createApp}=require("../server");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const keys=["AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL","AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS"];
const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{NODE_ENV:"test",AUTH_TOKEN_SECRET:"acceptance-dom-registration-secret-32-characters",PILOT_LOGIN_PASSWORD:"isolated-dom-admin-password",LOGIN_SEED_EMAIL:"isolated-dom-admin@example.invalid",AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:"pilot_admin"});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-dom-registration-"));
let server,browser,firstFailure=null;
const checks=[];
(async()=>{
 try{
  server=createApp({dataDir:dir}).listen(0,"127.0.0.1");
  await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject)});
  browser=await chromium.launch({headless:true});
  const base="http://127.0.0.1:"+server.address().port;
  const page=await browser.newPage({serviceWorkers:"block"});
  const email="dom-"+crypto.randomBytes(12).toString("hex")+"@example.invalid";
  const password=crypto.randomBytes(24).toString("hex");
  async function step(id,fn){try{await fn();checks.push({id,status:"PASS_BROWSER_DOM"});}catch(error){firstFailure={id,reason:String(error.message).slice(0,260)};checks.push({id,status:"FAIL",reason:firstFailure.reason});throw error;}}
  await step("open-registration",async()=>{await page.goto(base+"/login.html?mode=register&returnTo=%2Ffree-run-club.html",{waitUntil:"domcontentloaded"});await assert.doesNotReject(()=>page.locator("#name").waitFor({state:"visible",timeout:8000}));assert.equal(await page.locator("#title").innerText(),"Create Account");});
  await step("fill-registration-form",async()=>{await page.locator("#name").fill("Isolated DOM Member");await page.locator("#email").fill(email);await page.locator("#password").fill(password);});
  await step("submit-registration-form",async()=>{await page.locator("#submit").click();await page.waitForURL(url=>url.pathname==="/free-run-club.html",{timeout:15000});});
  await step("verify-authenticated-session",async()=>{const result=await page.evaluate(async()=>{const token=window.AuthStateRuntime?.getAuthToken?.();if(!token)return {status:0};const response=await fetch("/api/auth/me",{headers:{authorization:"Bearer "+token}});return {status:response.status,payload:await response.json()};});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.payload.user.email,email);});
 }catch(error){firstFailure=firstFailure||{id:"setup",reason:String(error.message).slice(0,260)}}
 finally{
  if(browser)await browser.close();
  if(server?.listening)await new Promise(resolve=>server.close(()=>resolve()));
  fs.rmSync(dir,{recursive:true,force:true});
  for(const [key,value] of Object.entries(prior)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
 const cleanupVerified=!fs.existsSync(dir);
 console.log(JSON.stringify({mode:"ISOLATED_CHROMIUM_REAL_REGISTRATION_FORM",passed:!firstFailure&&cleanupVerified,firstFailure,checks,cleanupVerified,fullCustomerJourneyCertified:false,productionBrowserCertified:false},null,2));
 if(firstFailure||!cleanupVerified)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
