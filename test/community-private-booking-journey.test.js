"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"../public",name),"utf8");
test("new community booking accounts return directly to existing request form",()=>{const login=read("login.js");assert.match(login,/bookingReturn/);assert.match(login,/bookingReturn\)\?requestedReturn/);});
test("booking form is community branded before render and skips global nav initialization",()=>{const html=read("private-sessions.html");assert.match(html,/community-booking/);assert.match(html,/if\(!document.documentElement.classList.contains\("community-booking"\)\)/);assert.match(html,/Request your private wellness session/);});
test("request success opens optional trial card within community hub",()=>{const js=read("private-sessions.js"),hub=read("community-hub.html");assert.match(js,/community-hub.html\?source=private-session-request&offer=trial/);assert.match(hub,/id="privateTrialOffer"/);assert.match(hub,/href="\/trial.html"/);assert.match(hub,/id="dismissTrialOffer"/);});
