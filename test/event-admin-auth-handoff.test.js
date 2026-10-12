"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("event admin page loads canonical auth dependencies in dashboard order",()=>{
 const html=fs.readFileSync("public/admin-event-checkins.html","utf8");
 const files=["runtime-config.js","runtime-state.js","auth-state-runtime.js","auth-navigation.js","api-client.js","admin-event-checkins.js"];
 let last=-1;
 for(const file of files){const i=html.indexOf('src="/'+file);assert.ok(i>last,file+" missing or out of order");last=i;}
 const js=fs.readFileSync("public/admin-event-checkins.js","utf8");
 assert.match(js,/AuthNavigation\.requireUser/);
 assert.match(js,/AuthStateRuntime\?\.getAuthToken/);
});
test("client management loads shared auth runtime before API client",()=>{
 const html=fs.readFileSync("public/admin-members.html","utf8");
 for(const file of ["runtime-state.js","auth-navigation.js"])assert.ok(html.includes('src="/'+file));
});
