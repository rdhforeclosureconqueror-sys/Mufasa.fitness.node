"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createResidentialWellnessService}=require("../src/services/residentialWellnessService");
function store(){const records=new Map();return {loadUser:id=>records.get(id)||null,updateUser:(id,fn)=>{records.set(id,fn(records.get(id)||{userId:id}));}};}
test("yoga enrollment is idempotent and account scoped",()=>{
 const service=createResidentialWellnessService({userStore:store(),clock:()=>Date.parse("2026-11-12T18:00:00Z")});
 assert.equal(service.getYogaJourney("a"),null);
 const first=service.startYogaJourney("a");assert.equal(first.startedAt,"2026-11-12T18:00:00.000Z");
 assert.deepEqual(service.startYogaJourney("a"),first);
 assert.equal(service.getYogaJourney("b"),null);
 assert.deepEqual(service.completeYogaLimb("a",1).completedLimbs,[1]);
 assert.deepEqual(service.completeYogaLimb("a",1).completedLimbs,[1]);
 assert.deepEqual(service.getYogaJourney("b"),null);
});
test("cannot skip yoga limbs or complete before starting",()=>{
 const service=createResidentialWellnessService({userStore:store()});
 assert.throws(()=>service.completeYogaLimb("a",1),/Start your yoga journey/);
 service.startYogaJourney("a");
 assert.throws(()=>service.completeYogaLimb("a",3),/previous limb/);
 assert.throws(()=>service.completeYogaLimb("a",9),/Choose a limb/);
 assert.deepEqual(service.completeYogaLimb("a",1).completedLimbs,[1]);
 assert.deepEqual(service.completeYogaLimb("a",2).completedLimbs,[1,2]);
});
