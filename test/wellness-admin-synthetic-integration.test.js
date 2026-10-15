"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("wellness synthetic endpoint shares authenticated admin-only acceptance router",()=>{
 const routes=fs.readFileSync("src/routes/businessOSAcceptanceRoutes.js","utf8");
 assert.match(routes,/router\.use\(requireAuth,requireLabAdmin\)/);
 assert.match(routes,/router\.post\("\/wellness\/run"/);
 assert.match(routes,/runWellness\(\)/);
 assert.match(routes,/Object\.keys\(req\.body\)\.length/);
});
test("admin acceptance page exposes synthetic run and report",()=>{
 const html=fs.readFileSync("public/admin-acceptance-lab.html","utf8");
 const js=fs.readFileSync("public/wellness-synthetic-admin-runner.js","utf8");
 assert.match(html,/id="wellness-synthetic-run"/);
 assert.match(html,/wellness-synthetic-admin-runner\.js/);
 assert.match(js,/acceptance\/wellness\/run/);
 assert.match(js,/firstFailure/);
});
