"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createEventCheckinStore}=require("../src/services/eventCheckinStore");
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wellness-attribution-"));try{return fn(createEventCheckinStore({dataDir:dir}))}finally{fs.rmSync(dir,{recursive:true,force:true})}}
const base={event:"wellness-event",name:"Guest Person",email:"guest@example.com",before:"Calm"};
test("guest check-in stores no campaign without explicit consent",()=>fixture(store=>{store.checkin({...base,attribution:{utm_source:"nfc",utm_campaign:"yoga_oct"}});assert.equal(store.roster()[0].attribution,null)}));
test("consented check-in stores only bounded campaign fields",()=>fixture(store=>{store.checkin({...base,attributionConsent:true,attribution:{utm_source:"nfc",utm_medium:"community",utm_campaign:"yoga_oct",email:"do-not-copy@example.com"}});assert.deepEqual(store.roster()[0].attribution,{utm_source:"nfc",utm_medium:"community",utm_campaign:"yoga_oct"})}));
test("malformed attribution is discarded and does not prevent attendance",()=>fixture(store=>{store.checkin({...base,attributionConsent:true,attribution:{utm_source:"<script>",utm_medium:"a".repeat(90),utm_campaign:"GOOD"}});assert.equal(store.roster()[0].attribution,null)}));
