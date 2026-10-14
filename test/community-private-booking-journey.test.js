"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"../public",name),"utf8");
test("new booking registrations retain the requested destination",()=>{assert.ok(read("login.js").includes("bookingReturn"));assert.ok(read("login.js").includes("offerReturn"));});
test("booking page has community branding",()=>{assert.ok(read("private-sessions.html").includes("community-booking"));});
test("booking sends customer to trial screen before community hub",()=>{const js=read("private-sessions.js");assert.ok(js.includes("/community-trial-offer.html?source=private-session-request"));assert.ok(!js.includes("/community-hub.html?source=private-session-request&offer=trial"));});
test("trial accept and decline both lead to hub",()=>{const html=read("community-trial-offer.html"),js=read("community-trial-offer.js");assert.ok(html.includes('id="accept"'));assert.ok(html.includes('id="skip"'));assert.ok(js.includes("/api/me/trial-access/accept"));assert.ok(js.includes("trial=accepted"));assert.ok(js.includes("trial=declined"));});
