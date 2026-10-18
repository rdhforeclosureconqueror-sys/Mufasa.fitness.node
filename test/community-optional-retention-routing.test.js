"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..","public",name),"utf8");
test("Community Hub keeps Nutrition direct and Retention Journey optional",()=>{
 const hub=read("community-hub.html");
 assert.match(hub,/id="optionalRetentionJourney"/);
 assert.match(hub,/href="\/retention-journey-start\.html\?source=community-hub"/);
 assert.match(hub,/href="\/nutrition\.html"/);
 assert.doesNotMatch(hub,/href="\/(?:dashboard|workout|free-run-club)\.html"/);
 assert.doesNotMatch(hub,/href="\/trial\.html">🥗 Nutrition/);
});
test("Community-initiated retention returns to Community Hub instead of PocketPT",()=>{
 const source=read("retention-journey-start.js");
 assert.match(source,/communityMode=new URLSearchParams/);
 assert.match(source,/communityMode\?"\/community-hub\.html\?journey=completed":"\/workout\.html\?journey=1"/);
 assert.match(read("retention-journey-start.html"),/Back to My Community Hub/);
});
