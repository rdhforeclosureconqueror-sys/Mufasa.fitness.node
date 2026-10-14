"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventCheckinStore}=require("../src/services/eventCheckinStore");
const {createEventCatalog}=require("../src/services/communityEventCatalog");
const {createResidentialCommunityService}=require("../src/services/residentialCommunityService");
test("guest NFC check-in is tied to canonical event and counts against member RSVP capacity",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"guest-event-"));
 try{
  const clock=()=>Date.parse("2026-10-13T12:00:00Z");
  const catalog=createEventCatalog({filePath:path.join(dir,"catalog.json"),clock});
  const event=catalog.create({title:"Sound Bath",location:"Park",type:"sound_bath",capacity:1,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"},"admin");
  catalog.update(event.eventId,{status:"confirmed"},"admin");
  const guests=createEventCheckinStore({dataDir:dir,clock});
  const pass=guests.checkin({event:event.eventId,name:"Guest Person",email:"guest@example.com",before:"Ready"});
  assert.equal(guests.roster().filter(x=>x.event===event.eventId).length,1);
  guests.reflect({...pass,after:"Peaceful"});
  assert.equal(guests.roster()[0].after.response,"Peaceful");
  const users=new Map([["member",{userId:"member",residentialWellness:{communicationConsent:true}}]]);
  const store={loadUser:id=>structuredClone(users.get(id)),listUsers:()=>Array.from(users.values(),u=>structuredClone(u)),updateUser:(id,fn)=>{const u=fn(structuredClone(users.get(id)));users.set(id,u);return u;}};
  const service=createResidentialCommunityService({userStore:store,eventCatalog:catalog,guestCheckins:guests,clock});
  assert.throws(()=>service.rsvp("member",event.eventId),/full/);
  assert.equal(service.attendance(event.eventId).remaining,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
