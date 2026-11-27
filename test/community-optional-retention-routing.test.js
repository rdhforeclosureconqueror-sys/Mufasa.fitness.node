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
 const owner=hub.match(/<section class="card" id="ownerFitnessLinks" hidden[\s\S]*?<\/section>/);
 assert.ok(owner);
 assert.match(owner[0],/href="\/dashboard\.html"/);
 assert.doesNotMatch(hub.replace(owner[0],""),/href="\/(?:dashboard|workout|free-run-club)\.html"/);
 assert.match(read("community-hub.js"),/data\.authz\?\.role/);
 assert.match(read("community-hub.js"),/roles\.includes\("super_admin"\)\|\|roles\.includes\("admin"\)/);
 assert.match(hub,/id="ownerAccessStatus"/);
 assert.match(read("rugby-player.html"),/href="\/rugby-policy-dashboard\.html"/);
 assert.match(read("rugby-policy-dashboard.html"),/href="\/rugby-player\.html"/);
 assert.doesNotMatch(hub,/href="\/trial\.html">🥗 Nutrition/);
});
test("Community-initiated retention returns to Community Hub instead of PocketPT",()=>{
 const source=read("retention-journey-start.js");
 assert.match(source,/const\s+communityMode\s*=\s*new URLSearchParams\(location\.search\)\.get\("source"\)\s*===\s*"community-hub"/);
 assert.match(source,/communityMode\s*\?\s*"\/community-hub\.html\?journey=completed"\s*:\s*"\/workout\.html\?journey=1"/);
 assert.match(read("retention-journey-start.html"),/Back to My Community Hub/);
});
