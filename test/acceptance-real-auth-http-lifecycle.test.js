"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {createApp}=require("../server");
async function call(base,route,{method="GET",token,body}={}){
 const response=await fetch(base+route,{method,headers:{...(token?{authorization:"Bearer "+token}:{}),...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,payload:await response.json().catch(()=>({}))};
}
test("real application HTTP registration, bearer auth, admin CRM read, and isolated cleanup",async t=>{
 const keys=["AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL","AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS"];
 const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{AUTH_TOKEN_SECRET:"acceptance-real-auth-secret-32-characters",PILOT_LOGIN_PASSWORD:"isolated-admin-password",LOGIN_SEED_EMAIL:"isolated-admin@example.invalid",AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:"pilot_admin"});
 t.after(()=>{for(const [k,v]of Object.entries(prior)){if(v==null)delete process.env[k];else process.env[k]=v;}});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-real-auth-http-"));

 const server=createApp({dataDir:dir}).listen(0,"127.0.0.1");
 await new Promise(resolve=>server.once("listening",resolve));
 t.after(async()=>{
  try{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
  assert.equal(fs.existsSync(dir),false,"isolated HTTP test directory must be deleted");
 });
 const base="http://127.0.0.1:"+server.address().port;
 const email="milele-acceptance-"+crypto.randomBytes(12).toString("hex")+"@example.invalid";
 const password=crypto.randomBytes(24).toString("hex");
 const anonymous=await call(base,"/api/auth/me");assert.equal(anonymous.status,401);
 const registered=await call(base,"/api/auth/register",{method:"POST",body:{name:"Isolated Journey",email,password,entryContext:"run_club"}});
 assert.equal(registered.status,200,JSON.stringify(registered.payload));
 const id=registered.payload.user.id,token=registered.payload.token;assert.ok(id&&token);
 const me=await call(base,"/api/auth/me",{token});assert.equal(me.status,200,JSON.stringify(me.payload));assert.equal(me.payload.user.email,email);
 const denied=await call(base,"/api/admin/members?search="+encodeURIComponent(email),{token});assert.equal(denied.status,403);
 const admin=await call(base,"/api/auth/login",{method:"POST",body:{email:"isolated-admin@example.invalid",password:"isolated-admin-password"}});
 assert.equal(admin.status,200,JSON.stringify(admin.payload));
 const directory=await call(base,"/api/admin/members?search="+encodeURIComponent(email),{token:admin.payload.token});
 assert.equal(directory.status,200,JSON.stringify(directory.payload));assert.equal(directory.payload.data.members[0].userId,id);
 const overview=await call(base,"/api/admin/clients/"+id+"/overview",{token:admin.payload.token});
 assert.equal(overview.status,200,JSON.stringify(overview.payload));assert.equal(overview.payload.data.summary.email,email);
 const event=await call(base,"/api/admin/community/events",{method:"POST",token:admin.payload.token,body:{title:"Isolated Community Yoga",location:"Test Park",type:"yoga",capacity:3,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"}});
 assert.equal(event.status,201,JSON.stringify(event.payload));
 const eventId=event.payload.data.event.eventId;
 const published=await call(base,"/api/admin/community/events/"+eventId,{method:"PATCH",token:admin.payload.token,body:{status:"confirmed"}});
 assert.equal(published.status,200,JSON.stringify(published.payload));
 const publicEvents=await call(base,"/api/community/events");assert.equal(publicEvents.status,200);
 assert.ok(publicEvents.payload.data.events.some(e=>e.eventId===eventId));
 const beforeJoin=await call(base,"/api/me/residential-community",{token});assert.equal(beforeJoin.status,403);
 const missingConsent=await call(base,"/api/me/residential-wellness",{method:"PUT",token,body:{interests:["yoga"],communicationConsent:false}});assert.notEqual(missingConsent.status,200);
 const joined=await call(base,"/api/me/residential-wellness",{method:"PUT",token,body:{interests:["yoga"],communicationConsent:true}});
 assert.equal(joined.status,200,JSON.stringify(joined.payload));assert.equal(joined.payload.data.profile.communicationConsent,true);
 const rsvp=await call(base,"/api/me/residential-community/rsvp/"+eventId,{method:"PUT",token,body:{attending:true}});
 assert.equal(rsvp.status,200,JSON.stringify(rsvp.payload));
 const deniedCheckin=await call(base,"/api/admin/community/events/"+eventId+"/attendance/"+id+"/check-in",{method:"POST",token});
 assert.equal(deniedCheckin.status,403);
 const checkin=await call(base,"/api/admin/community/events/"+eventId+"/attendance/"+id+"/check-in",{method:"POST",token:admin.payload.token});
 assert.equal(checkin.status,200,JSON.stringify(checkin.payload));
 const dashboard=await call(base,"/api/me/residential-community",{token});assert.equal(dashboard.status,200);
 assert.ok(dashboard.payload.data.rsvps.some(v=>v.eventId===eventId&&v.checkedInAt));
 const attendance=await call(base,"/api/admin/community/events/"+eventId+"/attendance",{token:admin.payload.token});
 assert.equal(attendance.status,200);assert.equal(attendance.payload.data.registered,1);
 const duplicate=await call(base,"/api/auth/register",{method:"POST",body:{name:"Duplicate",email,password}});
 assert.equal(duplicate.status,409);
 assert.ok(fs.existsSync(path.join(dir,"users",id+".json")));
 // Teardown closes the local HTTP listener, removes every test-owned record, and asserts deletion.
});
