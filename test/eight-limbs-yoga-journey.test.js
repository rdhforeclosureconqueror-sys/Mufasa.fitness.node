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

test("56-day yoga progression unlocks daily, preserves limb legacy and prevents skips",()=>{
 let now=Date.parse("2026-11-12T18:00:00Z");
 const service=createResidentialWellnessService({userStore:store(),clock:()=>now});
 assert.throws(()=>service.completeYogaDay("a",1),/Start your yoga journey/);
 const started=service.startYogaJourney("a");
 assert.equal(started.availableDay,1);
 assert.deepEqual(started.completedDays,[]);
 assert.throws(()=>service.completeYogaDay("a",57),/Choose a day/);
 assert.throws(()=>service.completeYogaDay("a",2),/not unlocked/);
 const day1=service.completeYogaDay("a",1);
 assert.deepEqual(day1.completedDays,[1]);
 assert.deepEqual(service.completeYogaDay("a",1).completedDays,[1]);
 now+=86400000;
 assert.equal(service.getYogaJourney("a").availableDay,2);
 assert.deepEqual(service.completeYogaDay("a",2).completedDays,[1,2]);
 assert.throws(()=>service.completeYogaDay("a",4),/not unlocked/);
 now+=4*86400000;
 assert.throws(()=>service.completeYogaDay("a",5),/previous day/);
 assert.deepEqual(service.completeYogaDay("a",3).completedDays,[1,2,3]);
 assert.deepEqual(service.completeYogaLimb("a",1).completedDays,[1,2,3],"legacy limb actions must not reset daily progress");
 assert.deepEqual(service.getYogaJourney("b"),null);
 now+=100*86400000;
 assert.equal(service.getYogaJourney("a").availableDay,56);
});
test("public 56-day library is complete and separate from Pan-African Adinkra",()=>{
 const fs=require("node:fs"),path=require("node:path");
 const lessons=JSON.parse(fs.readFileSync(path.join(__dirname,"../public/mindfulness-limbs-v1.json"),"utf8")).lessons;
 assert.equal(lessons.length,56);
 for(let i=0;i<56;i++){
  assert.equal(lessons[i].week,Math.floor(i/7)+1);
  assert.equal(lessons[i].day,i%7+1);
  for(const key of ["limb","lesson","question","action"])assert.ok(lessons[i][key]);
 }
 const html=fs.readFileSync(path.join(__dirname,"../public/eight-limbs-yoga.html"),"utf8");
 assert.ok(html.includes('id="lessonPanel"'));
 assert.ok(html.includes('id="completeDay"'));
 const js=fs.readFileSync(path.join(__dirname,"../public/eight-limbs-yoga.js"),"utf8");
 assert.ok(js.includes("/api/me/eight-limbs-yoga/complete-day"));
 assert.ok(js.includes("/mindfulness-limbs-v1.json"));
});
