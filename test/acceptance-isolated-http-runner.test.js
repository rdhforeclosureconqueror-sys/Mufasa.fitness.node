"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("isolated HTTP runner uses bounded child process and real app HTTP test",()=>{
 const runner=read("scripts/acceptance-isolated-http-runner.js");
 assert.match(runner,/execFileAsync\(process\.execPath/);
 assert.match(runner,/timeout:30000/);
 assert.match(runner,/acceptance-real-auth-http-lifecycle\.test\.js/);
 assert.match(runner,/productionBrowserCertified:false/);
});
test("admin route requires explicit confirmation and UI never claims production E2E",()=>{
 const route=read("src/routes/businessOSAcceptanceRoutes.js"),html=read("public/admin-acceptance-lab.html");
 assert.match(route,/router\.use\(requireAuth,requireLabAdmin\)/);
 assert.match(route,/RUN_ISOLATED_HTTP_ONLY/);
 assert.match(html,/id="isolated-http-run"/);
 assert.match(html,/Does not certify production browser E2E/);
});
