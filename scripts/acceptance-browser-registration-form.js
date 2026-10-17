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
  // Residential wellness reads MAAT_BACKEND_ORIGIN directly and does not load runtime-config.js.
  // Seed the isolated API origin on every new document before application scripts execute.
  await page.addInitScript(origin=>{window.MAAT_BACKEND_ORIGIN=origin;},base);
  // Keep browser registration local: production runtime config points at Render.
  await page.route("**/runtime-config.js*",async route=>{
   const response=await route.fetch();
   const body=(await response.text()).replace("https://mufasa-fitness-node.onrender.com",base);
   await route.fulfill({response,body,contentType:"application/javascript"});
  });
  const email="dom-"+crypto.randomBytes(12).toString("hex")+"@example.invalid";
  const password=crypto.randomBytes(24).toString("hex");
  async function step(id,fn){try{await fn();checks.push({id,status:"PASS_BROWSER_DOM"});}catch(error){firstFailure={id,reason:String(error.message).slice(0,260)};checks.push({id,status:"FAIL",reason:firstFailure.reason});throw error;}}
  await step("open-registration",async()=>{await page.goto(base+"/login.html?mode=register&returnTo=%2Ffree-run-club.html",{waitUntil:"domcontentloaded"});await assert.doesNotReject(()=>page.locator("#name").waitFor({state:"visible",timeout:8000}));assert.equal(await page.locator("#title").innerText(),"Create Account");});
  await step("fill-registration-form",async()=>{await page.locator("#name").fill("Isolated DOM Member");await page.locator("#email").fill(email);await page.locator("#password").fill(password);});
  await step("submit-registration-form",async()=>{await page.locator("#submit").click();try{await page.waitForURL(url=>url.pathname==="/free-run-club.html",{timeout:15000});}catch(error){const evidence=await page.evaluate(()=>({path:location.pathname,status:document.querySelector("#status")?.textContent,diagnostic:window.__MAAT_LOGIN_DIAGNOSTIC__||null,endpoint:window.MaatApiClient?.resolve?.("/api/auth/register")||null}));throw Error("Registration did not navigate: "+JSON.stringify(evidence)+"; "+error.message);}});
  await step("verify-authenticated-session",async()=>{await page.goto(base+"/login.html",{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>Boolean(window.AuthStateRuntime?.getAuthToken?.()),{timeout:8000});const result=await page.evaluate(async()=>{const token=window.AuthStateRuntime?.getAuthToken?.();if(!token)return {status:0};const response=await fetch("/api/auth/me",{headers:{authorization:"Bearer "+token}});return {status:response.status,payload:await response.json()};});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.payload.user.email,email);});
  await step("open-wellness-consent",async()=>{await page.goto(base+"/residential-wellness.html",{waitUntil:"domcontentloaded"});await page.locator("#wellnessForm").waitFor({state:"visible",timeout:8000});});
  await step("submit-wellness-consent",async()=>{await page.locator('[name="interest"][value="yoga"]').check();await page.locator("#communicationConsent").check();await page.locator("#communityInviteConsent").check();await page.locator("#submit").click();try{await page.locator("#success").waitFor({state:"visible",timeout:10000});}catch(error){const evidence=await page.evaluate(()=>({url:location.href,status:document.querySelector("#status")?.textContent,authenticated:Boolean(window.AuthStateRuntime?.getAuthToken?.()),apiOrigin:window.MAAT_BACKEND_ORIGIN,formPresent:Boolean(document.querySelector("#wellnessForm"))}));throw Error("Wellness form failed: "+JSON.stringify(evidence)+"; "+error.message);}assert.match(await page.locator("#summary").innerText(),/Yoga/);});
  let eventId;
  await step("seed-isolated-confirmed-event",async()=>{
   const result=await page.evaluate(async()=>{
    const call=async(url,method,token,body)=>{const response=await fetch(url,{method,headers:{authorization:"Bearer "+token,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};};
    const login=await call("/api/auth/login","POST","",{email:"isolated-dom-admin@example.invalid",password:"isolated-dom-admin-password"});
    if(login.status!==200)throw Error("isolated admin login "+JSON.stringify(login));
    const created=await call("/api/admin/community/events","POST",login.data.token,{title:"Isolated DOM Yoga RSVP",location:"Test Park",type:"yoga",capacity:3,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"});
    if(created.status!==201)throw Error("isolated event create "+JSON.stringify(created));
    const id=created.data.data.event.eventId;
    const published=await call("/api/admin/community/events/"+id,"PATCH",login.data.token,{status:"confirmed"});
    if(published.status!==200)throw Error("isolated event publish "+JSON.stringify(published));
    return id;
   });
   eventId=result;assert.ok(eventId);
  });
  await step("open-community-event",async()=>{await page.goto(base+"/community-hub.html",{waitUntil:"domcontentloaded"});await page.locator('[data-rsvp="'+eventId+'"]').waitFor({state:"visible",timeout:12000});});
  await step("click-real-rsvp-button",async()=>{await page.locator('[data-rsvp="'+eventId+'"]').click();await page.locator('[data-rsvp="'+eventId+'"][data-going="true"]').waitFor({state:"visible",timeout:12000});assert.match(await page.locator('[data-rsvp="'+eventId+'"]').innerText(),/Cancel RSVP/);});
  const adminPage=await browser.newPage({serviceWorkers:"block"});
  await adminPage.addInitScript(origin=>{window.MAAT_BACKEND_ORIGIN=origin;},base);
  await adminPage.route("**/runtime-config.js*",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("https://mufasa-fitness-node.onrender.com",base),contentType:"application/javascript"});});
  await step("admin-login-real-form",async()=>{await adminPage.goto(base+"/login.html",{waitUntil:"domcontentloaded"});await adminPage.locator("#email").fill("isolated-dom-admin@example.invalid");await adminPage.locator("#password").fill("isolated-dom-admin-password");await adminPage.locator("#submit").click();await adminPage.waitForFunction(()=>Boolean(window.AuthStateRuntime?.getAuthToken?.()),null,{timeout:12000});});
  await step("open-admin-attendance",async()=>{await adminPage.goto(base+"/event-studio.html",{waitUntil:"domcontentloaded"});await adminPage.locator('[data-attendance="'+eventId+'"]').waitFor({state:"visible",timeout:12000});});
  await step("check-in-through-real-admin-control",async()=>{
   const dialogs=[];adminPage.on("dialog",async dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});if(dialog.type()==="prompt")await dialog.accept("1");else await dialog.accept();if(dialog.type()==="alert")await adminPage.evaluate(()=>{window.__attendanceAlertSeen=true;}).catch(()=>{});});
   await adminPage.locator('[data-attendance="'+eventId+'"]').click();
   await adminPage.waitForFunction(()=>Boolean(window.__attendanceAlertSeen),null,{timeout:12000});
   const receipt=await adminPage.evaluate(async id=>{const token=window.AuthStateRuntime?.getAuthToken?.();const response=await fetch("/api/admin/community/events/"+encodeURIComponent(id)+"/attendance",{headers:{authorization:"Bearer "+token}});return {status:response.status,data:await response.json()};},eventId);
   assert.equal(receipt.status,200,JSON.stringify(receipt));
   assert.ok(receipt.data.data.attendees.some(a=>a.checkedInAt),JSON.stringify(receipt));
   assert.ok(dialogs.some(d=>d.type==="prompt")&&dialogs.some(d=>d.type==="confirm")&&dialogs.some(d=>d.type==="alert"),JSON.stringify(dialogs));
  });
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
