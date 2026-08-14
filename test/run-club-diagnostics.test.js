"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),vm=require("node:vm");
const {createRunClubDiagnosticsService}=require("../src/diagnostics/runClubDiagnosticsService");
const contract=require("../config/route-authorization-contract");
const {createApp}=require("../server");const {createAuthTokenLib}=require("../src/lib/authToken");
test("Run Club master diagnostics pass backend checks, label visual checks unavailable, redact output, and clean isolation",()=>{const before=new Set(fs.readdirSync(os.tmpdir()).filter(x=>x.startsWith("run-club-diagnostics-"))),report=createRunClubDiagnosticsService({rootDir:path.join(__dirname,".."),routeContract:contract}).run(),after=new Set(fs.readdirSync(os.tmpdir()).filter(x=>x.startsWith("run-club-diagnostics-")));assert.equal(report.overall,"PASS");assert.deepEqual(report.phases.map(x=>x.status),["PASS","PASS","PASS","PASS"]);assert.equal(report.boundary.status,"PASS");assert.equal(report.continuity.status,"PASS");assert.ok(report.phases[2].checks.some(x=>x.status==="NOT AVAILABLE"));assert.deepEqual(after,before);assert.doesNotMatch(JSON.stringify(report),/diagnostic_member|authToken|password|latitude|longitude/);});
test("unsupported Greatness XP producers remain disabled",()=>{const actions=require("../data/gamification/xp-policy.json").policies[0].actions;for(const event of ["greatness.weekly_goal.completed","greatness.personal_best.earned","greatness.club_run.completed","greatness.trail_contribution.helpful_milestone","greatness.referral.activated","greatness.new_trail.completed"])assert.equal(actions[event],undefined,event);});
test("Run Club diagnostics shell is reachable while its operation requires admin authorization",async t=>{const prior=process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS="runclub_admin";t.after(()=>prior==null?delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS=prior);const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),"runclub-diag-api-")),app=createApp({dataDir}),server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));const base=`http://127.0.0.1:${server.address().port}`,auth=createAuthTokenLib({secret:process.env.AUTH_TOKEN_SECRET||"dev-only-secret-change-me"}),member=auth.issueUserToken({userId:"ordinary_member"}).token,admin=auth.issueUserToken({userId:"runclub_admin"}).token;assert.equal((await fetch(base+"/admin-run-club-diagnostics.html")).status,200);assert.equal((await fetch(base+"/api/admin/diagnostics/run-club/run",{method:"POST"})).status,401);assert.equal((await fetch(base+"/api/admin/diagnostics/run-club/run",{method:"POST",headers:{authorization:`Bearer ${member}`}})).status,403);const response=await fetch(base+"/api/admin/diagnostics/run-club/run",{method:"POST",headers:{authorization:`Bearer ${admin}`}});assert.equal(response.status,201);assert.equal((await response.json()).data.safeMode.cleanup,"automatic");});
test("admin diagnostics UI has one master button and four phase rendering foundation",()=>{const html=fs.readFileSync(path.join(__dirname,"../public/admin-run-club-diagnostics.html"),"utf8"),js=fs.readFileSync(path.join(__dirname,"../public/admin-run-club-diagnostics.js"),"utf8");assert.match(html,/Run Run Club Diagnostics/);assert.equal((html.match(/id="runDiagnostics"/g)||[]).length,1);assert.match(js,/data\.phases/);assert.match(js,/NOT AVAILABLE|check\.status/);});
test("admin diagnostics UI preserves owner scope and adds a production-wide redacted trace",()=>{const html=fs.readFileSync(path.join(__dirname,"../public/admin-run-club-diagnostics.html"),"utf8"),js=fs.readFileSync(path.join(__dirname,"../public/admin-run-club-diagnostics.js"),"utf8");assert.match(html,/Inspect Most Recent Completed Activity/);assert.match(html,/Inspect Most Recent Production Completed Greatness Activity/);assert.match(html,/Copy Redacted Verification Trace/);assert.match(js,/\/api\/me\/greatness\/journey/);assert.match(js,/\/api\/admin\/diagnostics\/greatness\/most-recent-completed/);assert.match(js,/verification-diagnostic/);assert.match(js,/traceAllowlist/);assert.doesNotMatch(js,/route\.points|latitude|longitude|userId|memberId/);assert.match(html,/greatness-verification-trace-2026\.08\.14\.2/);});
test("cross-member Greatness diagnostics are admin-only and return only the redacted allowlist",async t=>{const prior=process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS="trace_admin";t.after(()=>prior==null?delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS=prior);const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),"greatness-production-trace-")),userDir=path.join(dataDir,"users");fs.mkdirSync(userDir,{recursive:true});fs.writeFileSync(path.join(userDir,"private_member_42.json"),JSON.stringify({userId:"private_member_42",identity:{email:"secret@example.com",name:"Secret Member"},steppingIntoGreatness:{activities:[{activityId:"private_activity_99",userId:"private_member_42",status:"completed",createdAt:"2026-08-14T10:00:00.000Z",updatedAt:"2026-08-14T10:30:00.000Z",endedAt:"2026-08-14T10:30:00.000Z",distanceMeters:3210,verificationLevel:"verified_gps",validation:{state:"valid",reasons:[]},gpsQuality:{acceptedSamples:20,rejectedSamples:2,rating:"good",suspiciousMovementDetected:false},selectedRoute:{routeId:"private_trail"},route:{points:[{latitude:41.2,longitude:-72.3}]},token:"private-token"}]}}));const app=createApp({dataDir}),server=app.listen(0);t.after(()=>server.close());await new Promise(resolve=>server.once("listening",resolve));const base=`http://127.0.0.1:${server.address().port}`,auth=createAuthTokenLib({secret:process.env.AUTH_TOKEN_SECRET||"dev-only-secret-change-me"}),member=auth.issueUserToken({userId:"ordinary_member"}).token,admin=auth.issueUserToken({userId:"trace_admin"}).token,endpoint=base+"/api/admin/diagnostics/greatness/most-recent-completed";assert.equal((await fetch(endpoint,{headers:{authorization:`Bearer ${member}`}})).status,403);const response=await fetch(endpoint,{headers:{authorization:`Bearer ${admin}`}}),payload=await response.json(),copied=JSON.stringify(payload.data);assert.equal(response.status,200);assert.deepEqual(Object.keys(payload.data).sort(),["acceptedGpsSamples","activityTimestamp","authoritativePersistence","completedDistanceMeters","decision","diagnosticVersion","eligibility","finalGpsQuality","persistedVerificationReasonCodes","rejectedGpsSamples","suspiciousMovementDetected"].sort());assert.doesNotMatch(copied,/private_member|secret@example|Secret Member|private_activity|private_trail|latitude|longitude|route|points|token|-72\.3|41\.2/i);});
test("authenticated admin navigation exposes Run Club Diagnostics without URL tokens",()=>{const html=fs.readFileSync(path.join(__dirname,"../public/dashboard.html"),"utf8"),js=fs.readFileSync(path.join(__dirname,"../public/dashboard.js"),"utf8"),page=fs.readFileSync(path.join(__dirname,"../public/admin-run-club-diagnostics.html"),"utf8");assert.match(html,/id="runClubDiagnosticsNav"[^>]+href="\/admin-run-club-diagnostics\.html"[^>]+hidden>Run Club Diagnostics/);assert.match(js,/AuthStateRuntime\?\.whenReady/);assert.match(js,/role === "admin" \|\| role === "super_admin"/);assert.doesNotMatch(html,/admin-run-club-diagnostics\.html\?[^"']*(token|auth)/i);assert.match(page,/Admin sign-in required/);assert.match(page,/Return to the Admin \/ Debug area/);});
function diagnosticsBrowser(options={}) {
  const token=Object.hasOwn(options,"token")?options.token:"aaa.bbb.ccc",fetchImpl=options.fetchImpl,HeadersImpl=options.HeadersImpl||Headers,RequestImpl=options.RequestImpl||Request;
  class Element{constructor(tag){this.tag=tag;this.children=[];this.textContent="";this.disabled=false;this.listener=null;}appendChild(child){this.children.push(child);return child;}removeChild(child){this.children.splice(this.children.indexOf(child),1);}addEventListener(_name,listener){this.listener=listener;}get firstChild(){return this.children[0]||null;}}
  const elements={runDiagnostics:new Element("button"),status:new Element("p"),results:new Element("div"),authRequired:new Element("div"),diagnosticsContent:new Element("div")};
  const window={location:{origin:"https://mufasafitsite.onrender.com"},URL,Headers:HeadersImpl,Request:RequestImpl,AuthStateRuntime:{getCanonicalAuthState:()=>({token})},fetch:fetchImpl||(async()=>{throw new TypeError("The string did not match the expected pattern.");})};
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../public/admin-run-club-diagnostics.js"),"utf8"),{window,document});
  return {window,elements};
}

test("diagnostics constructs an exact canonical-backend authenticated POST Request",async()=>{
  let request;
  const browser=diagnosticsBrowser({fetchImpl:async value=>{request=value;return {ok:true,status:201,json:async()=>({data:{overall:"PASS",phases:[]}})}}});
  await browser.elements.runDiagnostics.listener();
  assert.equal(request.url,"https://mufasa-fitness-node.onrender.com/api/admin/diagnostics/run-club/run");
  assert.equal(request.method,"POST");
  assert.equal(request.credentials,"omit");
  assert.equal(request.headers.get("authorization"),"Bearer aaa.bbb.ccc");
  assert.equal(request.headers.get("content-type"),null);
  assert.equal(await request.text(),"");
});

test("diagnostics rejects missing, undefined, null, and whitespace canonical tokens before Headers construction",async()=>{
  for(const token of [undefined,null,"","   "]){
    let dispatched=false;
    const browser=diagnosticsBrowser({token,fetchImpl:async()=>{dispatched=true;}});
    await browser.elements.runDiagnostics.listener();
    assert.equal(dispatched,false,String(token));
    assert.match(browser.elements.status.textContent,/Auth retrieval — FAIL/);
    assert.deepEqual(browser.elements.results.children.slice(1).map(x=>x.children[0].textContent),["Phase 1 — NOT RUN","Phase 2 — NOT RUN","Phase 3 — NOT RUN","Phase 4 — NOT RUN"]);
    assert.match(browser.elements.status.textContent,/Diagnostics backend was not reached/);
  }
});

test("diagnostics rejects CR/LF, duplicated Bearer, and malformed authorization values",async()=>{
  for(const token of ["aaa.\nbbb.ccc","aaa.\rbbb.ccc","Bearer aaa.bbb.ccc","Bearer Bearer aaa.bbb.ccc","not-a-signed-token"]){
    let dispatched=false;
    const browser=diagnosticsBrowser({token,fetchImpl:async()=>{dispatched=true;}});
    await browser.elements.runDiagnostics.listener();
    assert.equal(dispatched,false,JSON.stringify(token));
    assert.match(browser.elements.status.textContent,/Authentication header — FAIL/);
    assert.doesNotMatch(browser.elements.status.textContent,/aaa|bbb|ccc/);
  }
});

test("Safari request failure is isolated to dispatch and leaves backend phases NOT RUN",async()=>{
  let request;
  const browser=diagnosticsBrowser({fetchImpl:async value=>{request=value;throw new TypeError("The string did not match the expected pattern.");}});
  await browser.elements.runDiagnostics.listener();
  assert.equal(request.url,"https://mufasa-fitness-node.onrender.com/api/admin/diagnostics/run-club/run");
  assert.equal(browser.elements.results.children.length,5);
  assert.equal(browser.elements.results.children[0].children[0].textContent,"Request/Auth — FAIL");
  assert.deepEqual(browser.elements.results.children.slice(1).map(x=>x.children[0].textContent),["Phase 1 — NOT RUN","Phase 2 — NOT RUN","Phase 3 — NOT RUN","Phase 4 — NOT RUN"]);
  assert.match(browser.elements.status.textContent,/Fetch dispatch — FAIL/);
  assert.match(browser.elements.status.textContent,/Diagnostics backend was not reached/);
});

test("diagnostics distinguishes Headers and Request construction failures",async()=>{
  class BadHeaders{set(){throw new TypeError("The string did not match the expected pattern.");}}
  let browser=diagnosticsBrowser({HeadersImpl:BadHeaders});
  await browser.elements.runDiagnostics.listener();
  assert.match(browser.elements.status.textContent,/Header construction — FAIL/);
  class BadRequest{constructor(){throw new TypeError("invalid Request");}}
  browser=diagnosticsBrowser({RequestImpl:BadRequest});
  await browser.elements.runDiagnostics.listener();
  assert.match(browser.elements.status.textContent,/Request construction — FAIL/);
});
