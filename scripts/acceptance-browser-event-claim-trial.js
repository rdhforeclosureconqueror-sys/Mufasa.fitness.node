"use strict";
// Real Chromium DOM interactions with disposable backend storage; no production traffic.
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {createWorldBridgeApp}=require("../world-bridge-server");

const keys=["NODE_ENV","AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL","AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS"];
const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{NODE_ENV:"test",AUTH_TOKEN_SECRET:"isolated-browser-event-secret-32-characters",PILOT_LOGIN_PASSWORD:"isolated-event-admin-password",LOGIN_SEED_EMAIL:"isolated-event-admin@example.invalid",AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:"pilot_admin"});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-browser-event-"));
let server,browser,firstFailure=null;const checks=[];
(async()=>{try{
 server=createWorldBridgeApp({dataDir:dir}).listen(0,"127.0.0.1");
 await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject)});
 const base="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({serviceWorkers:"block"});
 await page.addInitScript(origin=>{window.MAAT_BACKEND_ORIGIN=origin;},base);
 await page.route("**/runtime-config.js*",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replaceAll("https://mufasa-fitness-node.onrender.com",base),contentType:"application/javascript"});});
 async function step(id,fn){try{await fn();checks.push({id,status:"PASS_BROWSER_DOM"});}catch(error){firstFailure={id,reason:String(error.message).slice(0,300)};checks.push({id,status:"FAIL",reason:firstFailure.reason});throw error;}}
 const email="event-dom-"+crypto.randomBytes(8).toString("hex")+"@example.invalid",password=crypto.randomBytes(18).toString("hex");
 let eventId,pass,memberToken,adminToken;
 async function call(route,method="GET",token,body){const response=await fetch(base+route,{method,headers:{...(token?{authorization:"Bearer "+token}:{}),...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});return{status:response.status,payload:await response.json()};}
 await step("admin-create-event",async()=>{
  const admin=await call("/api/auth/login","POST",null,{email:"isolated-event-admin@example.invalid",password:"isolated-event-admin-password"});assert.equal(admin.status,200,JSON.stringify(admin.payload));
  adminToken=admin.payload.token;
  const created=await call("/api/admin/community/events","POST",admin.payload.token,{title:"Isolated Yoga",location:"Test Studio",type:"yoga",capacity:4,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"});
  assert.equal(created.status,201,JSON.stringify(created.payload));eventId=created.payload.data.event.eventId;
  assert.equal((await call("/api/admin/community/events/"+eventId,"PATCH",admin.payload.token,{status:"confirmed"})).status,200);
 });
 await step("open-public-checkin",async()=>{
  // Make the disposable confirmed event active without modifying the system clock or production records.
  const catalogPath=path.join(dir,"community-events","catalog.json");
  const catalog=JSON.parse(fs.readFileSync(catalogPath,"utf8"));
  const event=catalog.events.find(e=>e.eventId===eventId);
  assert.ok(event,"Disposable event must exist");
  event.startAt=new Date(Date.now()-60000).toISOString();
  event.endAt=new Date(Date.now()+3600000).toISOString();
  fs.writeFileSync(catalogPath,JSON.stringify(catalog));
  await page.goto(base+"/wellness-check-in.html?eventId="+encodeURIComponent(eventId)+"&utm_source=tiktok",{waitUntil:"domcontentloaded"});
  await page.locator("#before").waitFor({state:"visible",timeout:12000});
 });
 await step("guest-checkin-dom",async()=>{
  await page.locator('#before [name="name"]').fill("Browser Guest");
  await page.locator('#before [name="email"]').fill(email);
  await page.locator('#before [name="before"]').fill("Ready");
  await page.locator('#before [name="attributionConsent"]').check();
  await page.locator('#before button').click();
  await page.locator("#after").waitFor({state:"visible",timeout:12000});
  pass=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("event-pass")||"null"));
  assert.ok(pass?.id&&pass?.token,"Expected signed guest check-in pass");
 });
 await step("guest-reflection-dom",async()=>{
  await page.locator('#after [name="after"]').fill("Restored");
  await page.locator('#after button').click();
  await page.locator("#claim-link").waitFor({state:"visible",timeout:12000});
  const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("event-claim-pass")||"null"));
  assert.equal(saved?.id,pass.id);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem("event-pass")),null);
 });
 await step("open-event-claim",async()=>{
  await page.goto(base+"/wellness-claim.html",{waitUntil:"domcontentloaded"});
  await page.locator("#claim").click();
  await page.waitForURL(url=>url.pathname==="/login.html",{timeout:12000});
 });
 await step("register-member-dom",async()=>{
  await page.goto(base+"/login.html?mode=register&returnTo=%2Fwellness-claim.html",{waitUntil:"domcontentloaded"});
  await page.locator("#name").fill("Browser Guest");await page.locator("#email").fill(email);await page.locator("#password").fill(password);await page.locator("#submit").click();
  await page.waitForURL(url=>url.pathname==="/wellness-claim.html",{timeout:15000});
 });
 await step("claim-event-dom",async()=>{
  await page.locator("#claim").click();
  await page.waitForURL(url=>url.pathname==="/community-trial-offer.html",{timeout:15000});
  assert.equal(new URL(page.url()).searchParams.get("source"),"event-check-in");
 });
 await step("trial-consent-dom",async()=>{
  await page.locator("#offer-title").waitFor({state:"visible"});
  assert.match(await page.locator("#offer-title").innerText(),/wellness event/);
  assert.equal(await page.locator("#accept").isDisabled(),true);
  memberToken=await page.evaluate(()=>window.AuthStateRuntime?.getAuthToken?.());assert.ok(memberToken,"Expected authenticated member token before trial acceptance");
  await page.locator("#agree").check();
  assert.equal(await page.locator("#accept").isEnabled(),true);
  await page.locator("#accept").click();
  await page.waitForURL(url=>url.pathname==="/community-hub.html"&&url.searchParams.get("trial")==="accepted",{timeout:15000});
 });
 await step("persisted-trial-attribution",async()=>{
  const result=await call("/api/me/trial-access","GET",memberToken);
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.payload.data?.trial?.origin?.eventId,eventId,JSON.stringify(result));
 });
 await step("admin-conversion-dashboard-dom",async()=>{
  const adminPage=await browser.newPage({serviceWorkers:"block"});
  try{
   await adminPage.addInitScript(({origin,authToken})=>{window.MAAT_BACKEND_ORIGIN=origin;localStorage.setItem("auth_token",authToken);},{origin:base,authToken:adminToken});
   await adminPage.route("**/runtime-config.js*",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replaceAll("https://mufasa-fitness-node.onrender.com",base),contentType:"application/javascript"});});
   await adminPage.goto(base+"/event-studio.html",{waitUntil:"domcontentloaded"});
   const button=adminPage.locator('[data-conversions="'+eventId+'"]');
   await button.waitFor({state:"visible",timeout:12000});
   await button.click();
   const output=adminPage.locator('[data-conversions-report]');
   await output.waitFor({state:"visible",timeout:12000});
   await assert.match(await output.innerText(),/Guest check-ins: 1 · Linked accounts: 1 · Trial activations: 1 · Trial conversion: 100% of linked accounts · Paid memberships: Not integrated/);
  }finally{await adminPage.close();}
 });
 await step("admin-event-conversions",async()=>{
  const report=await call("/api/admin/community/events/"+encodeURIComponent(eventId)+"/conversions","GET",adminToken);
  assert.equal(report.status,200,JSON.stringify(report));
  assert.deepEqual({checkedIn:report.payload.data?.checkedIn,linkedAccounts:report.payload.data?.linkedAccounts,trialActivations:report.payload.data?.trialActivations,conversionRate:report.payload.data?.conversionRate,conversionRateBasis:report.payload.data?.conversionRateBasis,membershipConversions:report.payload.data?.membershipConversions},{checkedIn:1,linkedAccounts:1,trialActivations:1,conversionRate:100,conversionRateBasis:"linkedAccounts",membershipConversions:null},JSON.stringify(report));
  const memberView=await call("/api/admin/community/events/"+encodeURIComponent(eventId)+"/conversions","GET",memberToken);
  assert.equal(memberView.status,403,JSON.stringify(memberView));
 });
 }catch(error){firstFailure=firstFailure||{id:"setup",reason:String(error.message).slice(0,300)};}
 finally{if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
 const report={kind:"WellnessBrowserEventTrialReport",mode:"ISOLATED_LOCAL_BROWSER",passed:!firstFailure,firstFailure,checks,cleanupVerified:!fs.existsSync(dir),limitations:["Disposable event activation changes only temporary local catalog storage","No production browser/customer traffic or payment processing"]};
 console.log(JSON.stringify(report,null,2));if(!report.passed||!report.cleanupVerified)process.exitCode=1;
})();
