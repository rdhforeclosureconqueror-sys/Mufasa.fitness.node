"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("admin dashboard exposes full journey evidence status without a write action",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../public/admin-acceptance-lab.html"),"utf8");
 const js=fs.readFileSync(path.join(__dirname,"../public/full-journey-status-runner.js"),"utf8");
 assert.match(html,/id="full-journey-status-run"/);
 assert.match(html,/src="\/full-journey-status-runner.js"/);
 assert.match(js,/AuthNavigation\.requireUser/);
 assert.match(js,/MaatApiClient\.request/);
 assert.match(js,/live\/full-journey\/status/);
 assert.match(js,/method:"GET"/);
 assert.doesNotMatch(js,/method:"POST"|method:"DELETE"|method:"PATCH"/);
});
