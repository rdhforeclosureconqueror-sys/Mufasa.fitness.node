"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),express=require("express");
const {createEventCatalog}=require("../src/services/communityEventCatalog");
const {createAuthCredentialStore}=require("../src/repositories/authCredentialStore");
const {createClientCrmService}=require("../src/services/clientCrmService");
const {createResidentialCommunityService}=require("../src/services/residentialCommunityService");
const {installCommunityEventCatalogRoutes}=require("../src/routes/communityEventCatalogRoutes");
const {installResidentialCommunityRoutes}=require("../src/routes/residentialCommunityRoutes");
async function withIsolatedApp(run){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-phase4-http-"));
 const users=new Map([["member",{userId:"member",displayName:"Test Member",residentialWellness:{communicationConsent:true}}],["other",{userId:"other",displayName:"Other Member",residentialWellness:{communicationConsent:true}}]]);
 const credentials=createAuthCredentialStore({filePath:path.join(dir,"credentials.json")});
 const store={loadUser:id=>users.has(id)?structuredClone(users.get(id)):null,listUsers:()=>Array.from(users.values(),v=>structuredClone(v)),updateUser:(id,fn)=>{const next=fn(structuredClone(users.get(id)));users.set(id,next);return next}};
 const clock=()=>Date.parse("2026-10-15T12:00:00Z");
 const catalog=createEventCatalog({filePath:path.join(dir,"events.json"),clock});
 const service=createResidentialCommunityService({userStore:store,eventCatalog:catalog,clock});
 const app=express();app.use(express.json());
 // Test-only identity middleware. This is never installed in the deployed application.
 const requireAuth=(req,res,next)=>{const role=req.get("x-test-role");if(!role)return res.status(401).json({ok:false,error:{code:"UNAUTHENTICATED"}});req.auth={userId:role==="admin"||role==="super_admin"?"staff":role};req.authz={role};next()};
 installCommunityEventCatalogRoutes({app,requireAuth,catalog});
 installResidentialCommunityRoutes({app,requireAuth,service});
 app.use((err,req,res,next)=>res.status(err.status||400).json({ok:false,error:{code:err.code||"REQUEST_FAILED",message:err.message}}));
 const server=app.listen(0,"127.0.0.1");
 try{
  await new Promise(resolve=>server.once("listening",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  const request=async(method,url,role,body)=>{
   const headers={};if(role)headers["x-test-role"]=role;if(body!==undefined)headers["content-type"]="application/json";
   const res=await fetch(origin+url,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
   return {status:res.status,body:await res.json()};
  };
  await run({request,users,catalog,credentials,store});
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));fs.rmSync(dir,{recursive:true,force:true})}
}
test("Phase 4: admin publishes event; member discovers, RSVPs; admin checks in; member and admin read persisted state",async()=>{
 await withIsolatedApp(async({request,users})=>{
  const base="/api/admin/community/events";
  const input={title:"Phase 4 Isolated Yoga",location:"Test Park",type:"yoga",capacity:2,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"};
  assert.equal((await request("POST",base,"member",input)).status,403);
  const created=await request("POST",base,"admin",input);assert.equal(created.status,201,JSON.stringify(created.body));
  const id=created.body.data.event.eventId;assert.ok(id);
  const unpublished=await request("GET","/api/community/events");assert.equal(unpublished.body.data.events.some(e=>e.eventId===id),false);
  const published=await request("PATCH",base+"/"+id,"admin",{status:"confirmed"});assert.equal(published.status,200);
  const discovered=await request("GET","/api/community/events");assert.equal(discovered.body.data.events.some(e=>e.eventId===id),true);
  assert.equal((await request("GET","/api/me/residential-community")).status,401);
  const dashboard=await request("GET","/api/me/residential-community","member");assert.equal(dashboard.status,200);
  const rsvp=await request("PUT","/api/me/residential-community/rsvp/"+id,"member",{attending:true});assert.equal(rsvp.status,200,JSON.stringify(rsvp.body));
  assert.equal(rsvp.body.data.rsvp.status,"going");
  assert.equal((await request("PUT","/api/me/residential-community/rsvp/"+id,"member",{attending:true})).status,200);
  assert.equal(users.get("member").residentialCommunity.rsvps.filter(r=>r.eventId===id).length,1);
  const attendanceUrl=base+"/"+id+"/attendance";
  assert.equal((await request("GET",attendanceUrl,"member")).status,403);
  const before=await request("GET",attendanceUrl,"admin");assert.equal(before.status,200);
  assert.equal(before.body.data.registered,1);
  const checkUrl=attendanceUrl+"/member/check-in";
  assert.equal((await request("POST",checkUrl,"member")).status,403);
  const checked=await request("POST",checkUrl,"admin");assert.equal(checked.status,200,JSON.stringify(checked.body));
  assert.ok(checked.body.data.checkIn.checkedInAt);
  const again=await request("POST",checkUrl,"super_admin");assert.equal(again.status,200);
  assert.equal(again.body.data.checkIn.checkedInAt,checked.body.data.checkIn.checkedInAt);
  const after=await request("GET",attendanceUrl,"admin");assert.equal(after.body.data.attendees[0].checkedInAt,checked.body.data.checkIn.checkedInAt);
  const memberAfter=await request("GET","/api/me/residential-community","member");assert.ok(memberAfter.body.data.rsvps.some(r=>r.eventId===id&&r.checkedInAt));
  assert.equal((await request("POST",attendanceUrl+"/other/check-in","admin")).status>=400,true);
 });
});

test("Integrated isolated identity → authenticated HTTP event → CRM service verification",async()=>{
 await withIsolatedApp(async({request,users,credentials,store})=>{
  const email="journey@example.invalid",password="isolated-test-only-secret";
  const account=credentials.create({email,name:"Synthetic Journey",password,accessTier:"free"});
  assert.ok(account?.id);
  assert.equal(credentials.verify(credentials.findByEmail(email),password),true);
  assert.equal(credentials.verify(credentials.findByEmail(email),"incorrect"),false);
  users.set(account.id,{userId:account.id,profile:{email,displayName:"Synthetic Journey"},residentialWellness:{communicationConsent:true}});
  const crm=createClientCrmService({userStore:store,authCredentialStore:credentials,
   membershipService:{getMembership:()=>({status:"inactive"})},trainerWorkspaceStore:{hasActiveAccess:()=>false},
   messagingStore:{listForUser:()=>[],listMessages:()=>[]},authorizationResolver:{resolveRole:()=>({role:"user"})}});
  const admin={userId:"staff",role:"admin"};
  assert.equal(crm.directory(admin,{search:email}).members[0].userId,account.id);
  const input={title:"Isolated Journey Yoga",location:"Test Park",type:"yoga",capacity:2,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"};
  const created=await request("POST","/api/admin/community/events","admin",input);
  assert.equal(created.status,201,JSON.stringify(created.body));
  const id=created.body.data.event.eventId;
  assert.equal((await request("PATCH","/api/admin/community/events/"+id,"admin",{status:"confirmed"})).status,200);
  assert.equal((await request("PUT","/api/me/residential-community/rsvp/"+id,account.id,{attending:true})).status,200);
  const check=await request("POST","/api/admin/community/events/"+id+"/attendance/"+account.id+"/check-in","admin");
  assert.equal(check.status,200,JSON.stringify(check.body));
  const persisted=await request("GET","/api/me/residential-community",account.id);
  assert.ok(persisted.body.data.rsvps.some(x=>x.eventId===id&&x.checkedInAt));
  const attendance=await request("GET","/api/admin/community/events/"+id+"/attendance","admin");
  assert.equal(attendance.body.data.registered,1);
  assert.equal(attendance.body.data.attendees[0].userId,account.id);
  assert.equal(crm.overview(admin,account.id).summary.email,email);
  assert.equal((await request("GET","/api/admin/community/events/"+id+"/attendance",account.id)).status,403);
 });
});
