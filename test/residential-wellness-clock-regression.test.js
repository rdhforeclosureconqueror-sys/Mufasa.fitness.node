"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createResidentialWellnessService}=require("../src/services/residentialWellnessService");

function store(){
 const users=new Map([["u1",{id:"u1"}]]);
 return {
  loadUser:id=>users.get(id)||null,
  updateUser(id,mutator){const next=mutator({...users.get(id)});users.set(id,next);return next;}
 };
}
test("residential wellness save accepts default clock and persists timestamps",()=>{
 const userStore=store(),service=createResidentialWellnessService({userStore});
 const profile=service.save("u1",{interests:["sound_bath"],communicationConsent:true,communityInviteConsent:true,campaign:"LYLE-OCT26"});
 assert.deepEqual(profile.interests,["sound_bath"]);
 assert.equal(profile.attribution.campaign,"LYLE-OCT26");
 assert.doesNotThrow(()=>new Date(profile.createdAt).toISOString());
 assert.doesNotThrow(()=>new Date(profile.updatedAt).toISOString());
});
test("residential wellness save accepts injected deterministic clock",()=>{
 const userStore=store(),service=createResidentialWellnessService({userStore,clock:()=>Date.parse("2026-10-06T19:45:00.000Z")});
 const profile=service.save("u1",{interests:["yoga"],communicationConsent:true});
 assert.equal(profile.createdAt,"2026-10-06T19:45:00.000Z");
});
