"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventNotificationQueue}=require("../src/services/eventNotificationQueue");
test("event notifications are durable and idempotent",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"event-outbox-"));
 try{
  const q=createEventNotificationQueue({dataDir:dir,clock:()=>1234}),eventId="a".repeat(32);
  const first=q.enqueue({eventId,kind:"checkin"}),second=q.enqueue({eventId,kind:"checkin"});
  assert.equal(first.id,second.id);
  q.enqueue({eventId,kind:"reflection"});
  assert.equal(q.pending().length,2);
  assert.equal(JSON.stringify(q.pending()).includes("guest@example.com"),false);
  assert.throws(()=>q.enqueue({eventId:"wrong",kind:"checkin"}));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
