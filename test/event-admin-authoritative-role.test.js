"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("event admin lets backend decide administrator authorization",()=>{
 const js=fs.readFileSync("public/admin-event-checkins.js","utf8");
 assert.match(js,/MaatApiClient\.request\("\/api\/admin\/event-checkins"\)/);
 assert.doesNotMatch(js,/if\(!roles\.includes\("super_admin"\)\)/);
 assert.match(js,/AuthNavigation\.requireUser/);
 assert.match(js,/getAuthToken/);
});
test("event attendee roster allows admins and super-admins but not operators alone",()=>{
 const server=fs.readFileSync("server.js","utf8");
 const route=server.match(/app\.get\("\/api\/admin\/event-checkins"[\s\S]*?\n  \}\);/);
 assert.ok(route,"event roster endpoint exists");
 assert.match(route[0],/\["admin", "super_admin"\]\.includes\(req\.authz\?\.role\)/);
 assert.match(route[0],/requireAuth/);
 assert.doesNotMatch(route[0],/\["admin", "super_admin", "operator"\]/);
 const dashboard=fs.readFileSync("public/dashboard.js","utf8");
 assert.match(dashboard,/eventCheckinsDashboardLink\.hidden = !\(roles\.includes\("admin"\) \|\| roles\.includes\("super_admin"\)\)/);
});
