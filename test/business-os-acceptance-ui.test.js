"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../public/admin-acceptance-lab.html"),"utf8");
const js=fs.readFileSync(path.join(__dirname,"../public/admin-acceptance-lab.js"),"utf8");
test("test center uses canonical login and API client",()=>{assert.match(html,/auth-navigation\.js/);assert.match(html,/api-client\.js/);assert.match(js,/AuthNavigation\.requireUser/);assert.match(js,/MaatApiClient\.request/);assert.match(js,/getAuthToken/)});
test("scenario results rendered as text, not untrusted HTML",()=>{assert.match(js,/textContent=JSON\.stringify/);assert.doesNotMatch(js,/innerHTML\s*=/)});
test("synthetic test UI has explicit run action and status",()=>{assert.match(html,/Run selected scenarios/);assert.match(js,/method:"POST"/);assert.match(js,/scenarioIds/);assert.match(html,/No real payments/)});
