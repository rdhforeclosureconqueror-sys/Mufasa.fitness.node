"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventNotificationQueue}=require("../src/services/eventNotificationQueue");
const {createEventNotificationWorker}=require("../src/services/eventNotificationWorker");
test("email worker sends once and preserves notification state",async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),"email-worker-"));
 try{
  const eventId="b".repeat(32),dir=path.join(dataDir,"event-checkins");
  fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,eventId+".json"),JSON.stringify({event:"yoga",name:"Guest",email:"guest@example.com"}));
  const queue=createEventNotificationQueue({dataDir});queue.enqueue({eventId,kind:"checkin"});
  let calls=0;
  const worker=createEventNotificationWorker({dataDir,env:{RESEND_API_KEY:"test",EVENT_EMAIL_FROM:"Events <events@example.com>",EVENT_EMAIL_TO:"owner@example.com"},fetchImpl:async(url,options)=>{calls++;assert.equal(url,"https://api.resend.com/emails");assert.ok(!options.body.includes("tokenHash"));return{ok:true}},now:()=>1000});
  assert.equal((await worker.runOnce()).processed,1);
  await worker.runOnce();assert.equal(calls,1);
  assert.equal(queue.pending().length,0);
 }finally{fs.rmSync(dataDir,{recursive:true,force:true})}
});
