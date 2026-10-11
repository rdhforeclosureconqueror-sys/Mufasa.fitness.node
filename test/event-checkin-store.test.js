"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventCheckinStore}=require("../src/services/eventCheckinStore");
test("guest check-in persists and reflection token is single-use",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"event-checkin-"));
 try{
  const store=createEventCheckinStore({dataDir:dir,clock:()=>1000});
  const pass=store.checkin({event:"rooftop-yoga",name:"Sample Guest",email:"guest@example.com",before:"Curious"});
  assert.equal(store.roster().length,1);
  assert.equal(store.roster()[0].tokenHash,undefined);
  assert.throws(()=>store.reflect({...pass,token:"invalid",after:"Calm"}));
  assert.deepEqual(store.reflect({...pass,after:"Calm"}),{complete:true});
  assert.equal(store.roster()[0].after.response,"Calm");
  assert.equal(store.verifyCompletion({...pass,email:"guest@example.com"}),true);
  assert.equal(store.verifyCompletion({...pass,email:"other@example.com"}),false);
  assert.equal(store.verifyCompletion({...pass,token:"wrong",email:"guest@example.com"}),false);
  assert.throws(()=>store.reflect({...pass,after:"Again"}));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
