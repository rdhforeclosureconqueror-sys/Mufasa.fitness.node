"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("event admin lets backend decide super-admin authorization",()=>{
 const js=fs.readFileSync("public/admin-event-checkins.js","utf8");
 assert.match(js,/MaatApiClient\.request\("\/api\/admin\/event-checkins"\)/);
 assert.doesNotMatch(js,/if\(!roles\.includes\("super_admin"\)\)/);
 assert.match(js,/AuthNavigation\.requireUser/);
 assert.match(js,/getAuthToken/);
});