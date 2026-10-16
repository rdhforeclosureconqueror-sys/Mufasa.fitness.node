"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"../public",name),"utf8");
test("progress panel distinguishes session checks from CI and staging certification",()=>{
 const html=read("admin-acceptance-lab.html"),script=read("acceptance-progress.js");
 assert.match(html,/id="acceptance-progress-list"/);
 assert.match(html,/id="acceptance-first-failure"/);
 assert.match(html,/Full authenticated HTTP customer journey: verified in isolated repository CI/);
 assert.match(html,/Production browser E2E and cleanup of production test records: not certified/);
 assert.match(html,/acceptance-progress\.js/);
 assert.match(script,/Not run in this session/);
 assert.match(script,/milele-acceptance-result/);
});
test("each runner emits a progress event after verified report",()=>{
 for(const name of ["admin-acceptance-lab.js","wellness-browser-route-runner.js","wellness-synthetic-admin-runner.js"])assert.match(read(name),/new CustomEvent\("milele-acceptance-result"/);
});
