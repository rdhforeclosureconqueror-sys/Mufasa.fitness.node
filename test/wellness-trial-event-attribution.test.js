"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
test("trial origin is derived from verified member claims rather than request source",()=>{
 const section=source.slice(source.indexOf('app.post("/api/me/trial-access/accept"'),source.indexOf('app.get("/api/me/trial-access"'));
 assert.match(section,/user\.wellnessEventClaims/);
 assert.match(section,/verified-event-check-in/);
 assert.match(section,/checkInId:latestClaim\.id/);
 assert.doesNotMatch(section,/req\.body\?\.eventId|req\.body\?\.source/);
});
test("existing trials remain idempotent and consent is required",()=>{
 const section=source.slice(source.indexOf('app.post("/api/me/trial-access/accept"'),source.indexOf('app.get("/api/me/trial-access"'));
 assert.match(section,/req\.body\?\.accepted!==true/);
 assert.match(section,/if\(user\.trialAccess\?\.acceptedAt\)/);
 assert.match(section,/paymentRequired:false/);
});
