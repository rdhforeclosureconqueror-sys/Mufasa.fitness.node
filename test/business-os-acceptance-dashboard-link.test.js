"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../public/dashboard.html"),"utf8"),js=fs.readFileSync(path.join(__dirname,"../public/dashboard.js"),"utf8");
test("dashboard has hidden Acceptance Lab entry",()=>{assert.match(html,/id="acceptanceLabDashboardLink"[^>]*href="\/admin-acceptance-lab\.html"[^>]*hidden/);assert.match(js,/acceptanceLabDashboardLink\.hidden = !hasObservabilityAccess/)});
test("visibility is derived from admin or super_admin roles",()=>{assert.match(js,/role === "admin" \|\| role === "super_admin"/)});
