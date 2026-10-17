"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventCheckinStore}=require("../src/services/eventCheckinStore");
test("token claim binds event to member, is idempotent, and rejects another account",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wellness-claim-"));
 try{
  const store=createEventCheckinStore({dataDir:dir,clock:()=>1000});
  const {id,token}=store.checkin({event:"rooftop-yoga",name:"Guest Example",email:"guest@example.test",before:""});
  const claimed=store.claim({id,token,userId:"member-1"});
  assert.equal(claimed.eventId,"rooftop-yoga");
  assert.equal(store.claim({id,token,userId:"member-1"}).claimedAt,1000);
  assert.throws(()=>store.claim({id,token,userId:"member-2"}),/already claimed/);
  assert.throws(()=>store.claim({id,token:"0".repeat(48),userId:"member-1"}),/Invalid claim/);
  assert.equal(store.roster().find(r=>r.id===id).claimedBy,"member-1");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
