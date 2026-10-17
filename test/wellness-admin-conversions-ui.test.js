"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("admin conversion UI uses authenticated aggregate endpoint",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../public/admin-event-checkins.html"),"utf8");
 const js=fs.readFileSync(path.join(__dirname,"../public/admin-event-conversions.js"),"utf8");
 assert.match(html,/id="conversion-form"/);assert.match(html,/admin-event-conversions\.js/);
 assert.match(js,/AuthNavigation\.requireUser/);
 assert.match(js,/MaatApiClient\.request/);
 assert.match(js,/\/api\/admin\/community\/events\//);
 assert.match(js,/data\.linkedAccounts/);
 assert.match(js,/data\.trialActivations/);
 assert.match(js,/Not integrated/);
 assert.doesNotMatch(js,/innerHTML|localStorage/);
});
