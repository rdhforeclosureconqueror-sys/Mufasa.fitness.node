"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"../public",name),"utf8");
test("new community booking accounts return directly to existing request form",()=>{const login=read("login.js");assert.match(login,/bookingReturn/);assert.match(login,/offerReturn/);});
test("booking form is community branded before render and skips global nav initialization",()=>{const html=read("private-sessions.html");assert.match(html,/community-booking/);assert.match(html,/Request your private wellness session/);});
test("submitted booking goes to trial decision before hub",()=>{const js=read("private-sessions.js");assert.match(js,/community-trial-offer.html\\?source=private-session-request/);assert.doesNotMatch(js,/community-hub.html\\?source=private-session-request&offer=trial/);});
test("trial decision offers accept and skip, both returning to community hub",()=>{const html=read("community-trial-offer.html"),js=read("community-trial-offer.js");assert.match(html,/id="accept"/);assert.match(html,/id="skip"/);assert.match(js,/api\\/me\\/trial-access\\/accept/);assert.match(js,/trial=accepted/);assert.match(js,/trial=declined/);});
