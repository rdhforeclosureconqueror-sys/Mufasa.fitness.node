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
 await page.route("**/nutrition.html",async route=>{const response=await route.fetch();const body=(await response.text()).replace('backendOrigin: "https://mufasa-fitness-node.onrender.com"','backendOrigin: "'+base+'"');await route.fulfill({response,body,contentType:"text/html"});});
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
 await step("community-nutrition-navigation-dom",async()=>{
  // Trial offer redirect may settle before the community page is fully ready.
  await page.goto(base+"/community-hub.html",{waitUntil:"domcontentloaded"});
  // The community now advertises Nutrition as a trial/paid benefit, not a free tile.
  // A member who explicitly accepted the trial can still open the journal directly.
  const nutrition=page.locator('a[href="/trial.html"]').first();
  try {await nutrition.waitFor({state:"visible",timeout:12000});}
  catch(error){throw new Error("Nutrition entry not visible; url="+page.url()+"; links="+JSON.stringify(await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")).slice(0,30)))+"; original="+error.message);}
  await page.goto(base+"/nutrition.html",{waitUntil:"domcontentloaded"});
  await page.waitForURL(url=>url.pathname==="/nutrition.html",{timeout:12000});
  try {await page.locator("#journalShell").waitFor({state:"visible",timeout:15000});}
  catch(error){
   const state=await page.evaluate(()=>({url:location.href,authWall:document.querySelector("#authWall")?.hidden,sessionStatus:document.querySelector("#sessionStatus")?.hidden,message:document.querySelector("#sessionStatusMessage")?.textContent,hasToken:Boolean(window.AuthStateRuntime?.getAuthToken?.()),authRuntime:Boolean(window.AuthStateRuntime),journalHidden:document.querySelector("#journalShell")?.hidden}));
   throw new Error("Nutrition journal auth first failure: "+JSON.stringify(state)+"; "+error.message);
  }
 });
 await step("nutrition-save-custom-food-dom",async()=>{
  await page.locator('[data-open="customPanel"]').click();
  await page.locator('[data-c="foodName"]').fill("Isolated browser oatmeal");
  await page.locator('[data-c="calories"]').fill("150");
  await page.locator('[data-c="proteinGrams"]').fill("5");
  await page.locator('[data-c="carbohydrateGrams"]').fill("27");
  await page.locator('[data-c="fatGrams"]').fill("3");
  await page.locator("#customSaveBtn").click();
  await page.locator("#entriesList").getByText("Isolated browser oatmeal").waitFor({state:"visible",timeout:15000});
 });
 await step("nutrition-reload-persistence-dom",async()=>{
  const date=await page.locator("#journalDate").inputValue();
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#journalShell").waitFor({state:"visible",timeout:15000});
  assert.equal(await page.locator("#journalDate").inputValue(),date);
  await page.locator("#entriesList").getByText("Isolated browser oatmeal").waitFor({state:"visible",timeout:15000});
  const entries=await call("/api/me/nutrition/entries?date="+encodeURIComponent(date),"GET",memberToken);
  assert.equal(entries.status,200,JSON.stringify(entries));
  assert.ok(entries.payload.data?.entries?.some(e=>e.foodName==="Isolated browser oatmeal"),"Saved meal must persist in member journal");
 });
 await step("nutrition-button-inventory-dom",async()=>{
  // Close the first-visit tour through its real customer-facing control.
  const tourClose=page.getByRole("button",{name:"Close guided tour"});
  if(await tourClose.isVisible().catch(()=>false)){
   await tourClose.click();
   await page.locator('[role="dialog"].ppt-guide-card').waitFor({state:"hidden",timeout:5000});
  }
  const expected=["scanPanel","searchPanel","naturalPanel","recentPanel","customPanel"];
  for(const id of expected){
   const button=page.locator('[data-open="'+id+'"]');
   try {await button.click({timeout:6000});}
   catch(error){const detail=await button.evaluate(el=>({rect:(()=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})(),hidden:el.hidden,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,ancestorHidden:Boolean(el.closest("[hidden]")),elementAtCenter:(()=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,350)})()}));throw new Error("Nutrition panel click "+id+": "+JSON.stringify(detail)+"; "+error.message);}

   assert.equal(await page.locator("#"+id).evaluate(el=>el.classList.contains("active")),true,"Panel button "+id);
  }
  for(const id of ["weeklyThisWeek","weeklyGroceryBuilder","weeklyPantry","weeklyMissions","weeklyReview"]){
   await page.locator('[data-weekly-tab="'+id+'"]').click();
   assert.equal(await page.locator("#"+id).isVisible(),true,"Weekly tab "+id);
  }
  const buttons=await page.locator("#journalShell button").count();
  assert.ok(buttons>=22,"Nutrition buttons unexpectedly missing: "+buttons);
 });
 await step("nutrition-refresh-and-recent-buttons-dom",async()=>{
  await page.locator("#refreshBtn").click();
  await page.locator('[data-open="recentPanel"]').click();
  await page.locator("#loadRecentBtn").click();
  await page.locator("#recentList").getByText("Isolated browser oatmeal").waitFor({state:"visible",timeout:12000});
 });
 await step("nutrition-weekly-plan-and-review-buttons-dom",async()=>{
  await page.locator('[data-weekly-tab="weeklyThisWeek"]').click();
  await page.locator("#createWeeklyPlanBtn").click();
  await page.locator("#weeklyOverview").getByText(/week|plan|grocery/i).first().waitFor({state:"visible",timeout:12000});
  await page.locator('[data-weekly-tab="weeklyReview"]').click();
  await page.locator("#loadWeeklyReviewBtn").click();
  await page.locator("#weeklyReviewPanel .summary").waitFor({state:"visible",timeout:12000});
 });
 await step("nutrition-custom-entry-delete-button-dom",async()=>{
  const row=page.locator("#entriesList .row").filter({hasText:"Isolated browser oatmeal"}).first();
  await row.locator("[data-delete]").click();
  await row.waitFor({state:"detached",timeout:12000});
 });
 await step("nutrition-custom-entry-edit-button-dom",async()=>{
  await page.locator('[data-open="customPanel"]').click();
  await page.locator('[data-c="foodName"]').fill("Edit button fixture");
  await page.locator('[data-c="calories"]').fill("95");
  await page.locator("#customSaveBtn").click();
  const row=page.locator("#entriesList .row").filter({hasText:"Edit button fixture"}).first();
  await row.waitFor({state:"visible",timeout:12000});
  const editPrompts=["Edited fixture food","1"];
  const onEditDialog=dialog=>{const response=editPrompts.shift();void dialog.accept(response===undefined?undefined:response).catch(()=>{});};
  page.on("dialog",onEditDialog);
  try {await row.locator("[data-edit]").click();
  await page.locator("#entriesList").getByText("Edited fixture food").waitFor({state:"visible",timeout:12000});}
  finally {page.off("dialog",onEditDialog);}
 });
 await step("nutrition-scanner-camera-denied-dom",async()=>{
  await page.locator('[data-open="scanPanel"]').click();
  await page.context().clearPermissions();
  await page.locator("#startScanBtn").click();
  await page.locator("#barcodeStatus").getByText(/camera|denied|unavailable|permission|fallback/i).waitFor({state:"visible",timeout:8000});
  await page.locator("#stopScanBtn").click();
 });
 await step("nutrition-natural-language-draft-dom",async()=>{
  await page.locator('[data-open="naturalPanel"]').click();
  await page.locator("#naturalText").fill("Two scrambled eggs and a banana");
  await page.locator("#draftBtn").click();
  await page.locator("#draftReview").locator("[data-search]").first().waitFor({state:"visible",timeout:12000});
 });
 await step("nutrition-manual-barcode-lookup-dom",async()=>{
  await page.locator('[data-open="scanPanel"]').click();
  await page.locator("#manualBarcode").fill("0000000000000");
  await page.locator("#lookupBarcodeBtn").click();
  await page.waitForFunction(()=>{const text=document.querySelector("#barcodeStatus")?.textContent||"";return text.length>0&&!/Looking up barcode/i.test(text)},{timeout:12000});
  assert.match(await page.locator("#barcodeStatus").innerText(),/not found|detected|product|barcode/i);
 });
 await step("nutrition-food-search-button-dom",async()=>{
  await page.locator('[data-open="searchPanel"]').click();
  await page.locator("#foodSearchInput").fill("banana");
  await page.locator("#foodSearchBtn").click();
  await page.waitForFunction(()=>{const el=document.querySelector("#foodResults");return el&&el.textContent&&!/^Searching…?$/.test(el.textContent.trim())},{timeout:12000});
  assert.ok((await page.locator("#foodResults").innerText()).trim().length>0,"Food search must display a result or actionable error");
 });
 await step("nutrition-save-and-replay-meal-dom",async()=>{
  await page.locator("#entriesList .row").filter({hasText:"Edited fixture food"}).locator("[data-select]").check();
  page.once("dialog",dialog=>{void dialog.accept("Chromium saved meal").catch(()=>{});});
  await page.locator("#saveMealBtn").click();
  await page.locator('[data-open="recentPanel"]').click();
  await page.locator("#loadRecentBtn").click();
  const meal=page.locator("#mealList .row").filter({hasText:"Chromium saved meal"});
  await meal.waitFor({state:"visible",timeout:12000});
  await meal.locator("[data-meal]").click();
  await page.waitForFunction(()=>[...document.querySelectorAll("#entriesList .row")].filter(e=>e.textContent.includes("Edited fixture food")).length>=2,null,{timeout:12000});
 });
 await step("nutrition-custom-grocery-button-dom",async()=>{
  await page.locator('[data-weekly-tab="weeklyGroceryBuilder"]').click();
  await page.locator("#customGroceryName").fill("Chromium grocery fixture");
  await page.locator("#addCustomGroceryBtn").click();
  await page.locator("#weeklyGroceryOptions").getByText("Chromium grocery fixture").waitFor({state:"visible",timeout:12000});
 });
 await step("nutrition-grocery-status-buttons-dom",async()=>{
  await page.locator('[data-weekly-tab="weeklyGroceryBuilder"]').click();
  const option=page.locator("#weeklyGroceryOptions [data-option]").first();
  await option.waitFor({state:"attached",timeout:12000});
  const details=option.locator("xpath=ancestor::details");
  await details.evaluate(el=>{el.open=true;});
  await option.locator('[data-grocery-state="alreadyAtHome"]').click();
  await page.waitForFunction(()=>document.querySelector("#weeklyGroceryOptions [data-option] [data-grocery-state='alreadyAtHome']")?.getAttribute("aria-pressed")==="true",null,{timeout:12000});
  await page.locator('[data-weekly-tab="weeklyPantry"]').click();
  await page.locator("#weeklyPantryList .weekly-card").first().waitFor({state:"visible",timeout:12000});
 });
 await step("nutrition-generate-missions-button-dom",async()=>{
  await page.locator('[data-weekly-tab="weeklyThisWeek"]').click();
  await page.locator("#generateWeeklyMissionsBtn").click();
  await page.locator("#weeklyMissionList").waitFor({state:"visible",timeout:12000});
  assert.ok((await page.locator("#weeklyMissionList").innerText()).trim().length>0,"Mission panel must show missions or a useful empty state");
 });
 await step("nutrition-manual-mission-progress-dom",async()=>{
  await page.locator('[data-weekly-tab="weeklyMissions"]').click();
  const mission=page.locator("#weeklyMissionList .weekly-card").filter({has:page.locator("[data-manual-mission]")}).first();
  await mission.waitFor({state:"visible",timeout:12000});
  const before=await mission.innerText();
  await mission.locator("[data-manual-mission]").click();
  await page.waitForFunction(previous=>{const el=document.querySelector("#weeklyMissionList .weekly-card");return el&&el.innerText!==previous},before,{timeout:12000});
 });
 await step("nutrition-remaining-grocery-states-dom",async()=>{
  await page.locator('[data-weekly-tab="weeklyGroceryBuilder"]').click();
  const first=page.locator("#weeklyGroceryOptions [data-option]").first();
  await first.locator("xpath=ancestor::details").evaluate(el=>{el.open=true;});
  for(const state of ["selectedForShopping","acquired","unavailable"]){
   const target=page.locator("#weeklyGroceryOptions [data-option]").first();
   await target.locator("xpath=ancestor::details").locator("summary").click().catch(()=>{});
   await target.locator("xpath=ancestor::details").evaluate(el=>{el.open=true;});
   await target.locator('[data-grocery-state="'+state+'"]').click({force:true,timeout:10000});
   await page.waitForFunction(key=>document.querySelector('#weeklyGroceryOptions [data-option] [data-grocery-state="'+key+'"]')?.getAttribute("aria-pressed")==="true",state,{timeout:12000});
  }
 });
 await step("nutrition-return-to-community-dom",async()=>{
  await page.locator('a[href="/community-hub.html"]').first().click();
  await page.waitForURL(url=>url.pathname==="/community-hub.html",{timeout:12000});
 });
 await step("persisted-trial-attribution",async()=>{
  const result=await call("/api/me/trial-access","GET",memberToken);
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.payload.data?.trial?.origin?.eventId,eventId,JSON.stringify(result));
 });
 await step("admin-conversion-dashboard-dom",async()=>{
  const adminPage=await browser.newPage({serviceWorkers:"block"});
  try{
   await adminPage.addInitScript(origin=>{window.MAAT_BACKEND_ORIGIN=origin;},base);
   await adminPage.route("**/runtime-config.js*",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replaceAll("https://mufasa-fitness-node.onrender.com",base),contentType:"application/javascript"});});
   await adminPage.goto(base+"/login.html",{waitUntil:"domcontentloaded"});
   await adminPage.locator("#email").fill("isolated-event-admin@example.invalid");
   await adminPage.locator("#password").fill("isolated-event-admin-password");
   await adminPage.locator("#submit").click();
   await adminPage.waitForURL(url=>url.pathname!=="/login.html",{timeout:15000});
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
