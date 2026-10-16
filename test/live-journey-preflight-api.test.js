"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const route=fs.readFileSync("src/routes/businessOSAcceptanceRoutes.js","utf8");
const html=fs.readFileSync("public/admin-acceptance-lab.html","utf8");
const client=fs.readFileSync("public/live-journey-preflight-runner.js","utf8");
test("live preflight is behind shared admin authentication and read-only",()=>{
 assert.match(route,/router\.use\(requireAuth,requireLabAdmin\)/);
 assert.match(route,/router\.get\("\/live\/preflight"/);
 assert.match(route,/assessLiveJourneyPreflight\(\{adminAuthorized:true\}\)/);
 assert.doesNotMatch(route,/router\.post\("\/live\/run"/);
});
test("admin Test Center exposes explicit preflight, not a live execution button",()=>{
 assert.match(html,/id="live-preflight-run"/);
 assert.match(html,/live-journey-preflight-runner\.js/);
 assert.match(client,/method:"GET"/);
 assert.match(client,/executionPerformed!==false/);
 assert.doesNotMatch(html,/id="live-journey-run"/);
});
