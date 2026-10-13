"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {createEventCatalog}=require("../src/services/communityEventCatalog");
const {createResidentialCommunityService}=require("../src/services/residentialCommunityService");
test("attendance check-in requires RSVP and is idempotent",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"attendance-"));
 try{
 const clock=()=>Date.parse("2026-10-13T12:00:00Z");
 const catalog=createEventCatalog({filePath:path.join(dir,"events.json"),clock});
 const e=catalog.create({title:"Sound Bath",location:"Park",type:"sound_bath",capacity:1,startAt:"2026-11-14T15:00:00Z",endAt:"2026-11-14T16:00:00Z"},"admin");
 catalog.update(e.eventId,{status:"confirmed"},"admin");
 const users=new Map(["a","b"].map(userId=>[userId,{userId,displayName:userId,residentialWellness:{communicationConsent:true}}]));
 const store={loadUser:id=>structuredClone(users.get(id)),listUsers:()=>Array.from(users.values(),u=>structuredClone(u)),updateUser:(id,fn)=>{const next=fn(structuredClone(users.get(id)));users.set(id,next);return next;}};
 const svc=createResidentialCommunityService({userStore:store,eventCatalog:catalog,clock});
 assert.throws(()=>svc.checkIn(e.eventId,"a"),/not registered/);
 svc.rsvp("a",e.eventId);
 assert.equal(svc.attendance(e.eventId).registered,1);
 assert.equal(svc.attendance(e.eventId).remaining,0);
 assert.throws(()=>svc.rsvp("b",e.eventId),/full/);
 const first=svc.checkIn(e.eventId,"a");
 assert.equal(first.checkedInAt,svc.checkIn(e.eventId,"a").checkedInAt);
 assert.equal(svc.attendance(e.eventId).attendees[0].checkedInAt,first.checkedInAt);
 assert.throws(()=>svc.rsvp("a",e.eventId,false),/cannot be cancelled/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("Event Studio attendance buttons are included in event click dispatch",()=>{
 const js=fs.readFileSync(path.join(__dirname,"../public/event-studio.js"),"utf8");
 assert.match(js,/button\.dataset\.edit\|\|button\.dataset\.attendance\|\|button\.dataset\.publish/);
});
