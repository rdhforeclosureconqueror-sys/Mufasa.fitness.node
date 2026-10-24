"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const express=require("express");
const {installSoundAssessmentRoutes}=require("../src/routes/soundAssessmentRoutes");
const {createAssessmentStore}=require("../src/sound-assessment/assessment-store");
const {QUICK_BANK}=require("../src/sound-assessment/quick-bank");
const {DEEP_BANK}=require("../src/sound-assessment/deep-bank");
test("live HTTP request persists complete quick assessment and returns record id",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sound-assessment-"));
 const file=path.join(dir,"records.ndjson");
 const app=express();installSoundAssessmentRoutes({app,store:createAssessmentStore(file)});
 const server=app.listen(0);
 try{
  const base="http://127.0.0.1:"+server.address().port;
  const answers=Object.fromEntries(QUICK_BANK.map(q=>[q.id,0]));
  const response=await fetch(base+"/api/sound-assessment/result/quick",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers})});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);assert.ok(body.data.assessmentId);
  const rows=fs.readFileSync(file,"utf8").trim().split("\n").map(JSON.parse);
  assert.equal(rows.length,1);assert.equal(rows[0].id,body.data.assessmentId);assert.deepEqual(rows[0].answers,answers);
  const invalid=await fetch(base+"/api/sound-assessment/result/quick",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers:{}})});
  assert.equal(invalid.status,422);assert.equal(fs.readFileSync(file,"utf8").trim().split("\n").length,1);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
test("persistence failure does not claim success",async()=>{
 const app=express();installSoundAssessmentRoutes({app,store:{save(){throw new Error("disk unavailable")}}});
 const server=app.listen(0);
 try{const answers=Object.fromEntries(QUICK_BANK.map(q=>[q.id,0]));const response=await fetch("http://127.0.0.1:"+server.address().port+"/api/sound-assessment/result/quick",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers})});assert.equal(response.status,503);assert.equal((await response.json()).error.code,"SA_PERSISTENCE_FAILED");}finally{await new Promise(resolve=>server.close(resolve));}
});

test("full 25-question assessment persists its complete interpretive report",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sound-assessment-deep-"));
 const file=path.join(dir,"records.ndjson");
 const app=express();installSoundAssessmentRoutes({app,store:createAssessmentStore(file)});
 const server=app.listen(0);
 try{
  const answers=Object.fromEntries(DEEP_BANK.map((q,i)=>[q.id,i%q.options.length]));
  const response=await fetch("http://127.0.0.1:"+server.address().port+"/api/sound-assessment/result/deep",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers})});
  assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.ok,true);assert.ok(body.data.assessmentId);
  const row=JSON.parse(fs.readFileSync(file,"utf8").trim());
  assert.equal(row.mode,"deep");assert.equal(Object.keys(row.answers).length,25);
  assert.equal(row.result.primary.label,body.data.primary.label);
  assert.deepEqual(row.result.sections,body.data.sections);
  assert.ok(row.result.soundFoundation);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
