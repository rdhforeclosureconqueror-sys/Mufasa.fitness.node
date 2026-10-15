"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("dashboard uses canonical admin report and textContent for untrusted campaign labels",()=>{
 const js=fs.readFileSync("public/admin-wellness-campaigns.js","utf8");
 const html=fs.readFileSync("public/admin-wellness-campaigns.html","utf8");
 assert.match(js,/AuthNavigation\.requireUser/);
 assert.match(js,/MaatApiClient\.request/);
 assert.match(js,/campaign-report/);
 assert.match(js,/td\.textContent=String\(value\)/);
 assert.doesNotMatch(js,/innerHTML|localStorage/);
 assert.match(html,/Campaign Attendance/);
 assert.match(html,/admin-wellness-campaigns\.js/);
});
test("Event Studio links to campaign reporting",()=>assert.match(fs.readFileSync("public/event-studio.html","utf8"),/admin-wellness-campaigns\.html/));
