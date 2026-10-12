"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {createEventCatalog}=require("../src/services/communityEventCatalog");
const {createResidentialCommunityService}=require("../src/services/residentialCommunityService");
test("confirmed events enforce capacity, duplicate registration, and cancellation",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-rsvp-"));
 try {
  const clock=()=>Date.parse("2026-10-12T12:00:00Z");
  const catalog=createEventCatalog({filePath:path.join(dir,"catalog.json"),clock});
  const event=catalog.create({title:"Yoga",location:"Dallas",type:"yoga",capacity:1,startAt:"2026-11-01T12:00:00Z",endAt:"2026-11-01T13:00:00Z"},"admin");
  const records=new Map(["a","b"].map(id=>[id,{userId:id,residentialWellness:{communicationConsent:true}}]));
  const userStore={loadUser:id=>structuredClone(records.get(id)),listUsers:()=>[...records.values()].map(value=>structuredClone(value)),updateUser:(id,fn)=>{const value=fn(structuredClone(records.get(id)));records.set(id,value);return value;}};
  const service=createResidentialCommunityService({userStore,eventCatalog:catalog,clock});
  assert.equal(service.dashboard("a").events.length,0);
  catalog.update(event.eventId,{status:"confirmed"},"admin");
  assert.equal(service.dashboard("a").events.length,1);
  assert.equal(service.rsvp("a",event.eventId).status,"going");
  assert.equal(service.rsvp("a",event.eventId).status,"going");
  assert.throws(()=>service.rsvp("b",event.eventId),/full/);
  assert.equal(service.rsvp("a",event.eventId,false).status,"not_going");
  assert.equal(service.rsvp("b",event.eventId).status,"going");
  catalog.update(event.eventId,{status:"cancelled"},"admin");
  assert.equal(service.dashboard("a").events.length,0);
  assert.throws(()=>service.rsvp("a",event.eventId),/unavailable/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
