"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("admin pages initialize auth before API requests",()=>{
 for(const file of ["public/admin-members.html","public/admin-event-checkins.html"]){
 const html=fs.readFileSync(file,"utf8");
 const auth=html.indexOf('src="/auth-state-runtime.js');
 const api=html.indexOf('src="/api-client.js');
 assert.ok(auth>=0&&api>auth,file+" must initialize authentication before API client");
 }
});
test("event attendee page preserves backend auth error",()=>{
 const source=fs.readFileSync("public/admin-event-checkins.js","utf8");
 assert.match(source,/typeof result\.payload\?\.error==="string"/);
});
