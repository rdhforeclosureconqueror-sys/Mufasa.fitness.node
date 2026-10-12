"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("event attendee navigation is available to administrators in the existing dashboard",()=>{
 const html=fs.readFileSync("public/dashboard.html","utf8");
 const js=fs.readFileSync("public/dashboard.js","utf8");
 assert.match(html,/id="clientManagementCard"/);
 assert.match(html,/id="eventCheckinsDashboardLink"[^>]*href="\\/admin-event-checkins\\.html"[^>]*hidden/);
 assert.ok(js.includes('eventCheckinsDashboardLink.hidden = !(roles.includes("admin") || roles.includes("super_admin"))'));
 assert.ok(!js.includes('eventCheckinsDashboardLink.hidden = !roles.includes("super_admin")'));
});
