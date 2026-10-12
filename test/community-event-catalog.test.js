"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createEventCatalog } = require("../src/services/communityEventCatalog");
test("events remain private until confirmed and persist after reopening store", () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), "milele-events-"));
 try {
  const filePath = path.join(dir, "events.json"), clock = () => Date.parse("2026-10-12T12:00:00Z");
  const store = createEventCatalog({ filePath, clock });
  const event = store.create({ title:"Sound Bath", location:"Dallas", type:"sound_bath", capacity:14, startAt:"2026-11-01T18:00:00-06:00", endAt:"2026-11-01T19:00:00-06:00" }, "owner");
  assert.equal(store.list({publicOnly:true}).length, 0);
  store.update(event.eventId, {status:"confirmed"}, "owner");
  assert.equal(createEventCatalog({filePath,clock}).list({publicOnly:true}).length, 1);
  store.update(event.eventId, {status:"cancelled"}, "owner");
  assert.equal(store.list({publicOnly:true}).length, 0);
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
test("invalid capacity and past publication are rejected", () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-events-"));
 try {
  const store=createEventCatalog({filePath:path.join(dir,"events.json"),clock:()=>Date.parse("2026-10-12T12:00:00Z")});
  const input={title:"Yoga",location:"Dallas",type:"yoga",capacity:0,startAt:"2026-10-01T10:00:00Z",endAt:"2026-10-01T11:00:00Z"};
  assert.throws(()=>store.create(input,"owner"),/capacity/);
  const event=store.create({...input,capacity:10},"owner");
  assert.throws(()=>store.update(event.eventId,{status:"confirmed"},"owner"),/past/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
