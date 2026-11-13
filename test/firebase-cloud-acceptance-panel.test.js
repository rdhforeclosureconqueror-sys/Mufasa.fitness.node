"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
test("Firebase one-touch panel is wired to acceptance page and first-failure progress",()=>{
 const html=read("public/admin-acceptance-lab.html"),script=read("public/firebase-cloud-acceptance.js"),progress=read("public/acceptance-progress.js");
 assert.match(html,/id="firebase-cloud-run"/);
 assert.match(html,/src="\/firebase-cloud-acceptance.js"/);
 assert.match(script,/milele-acceptance-result/);
 assert.match(script,/firstFailure/);
 assert.match(script,/READ_ONLY_ASSET_CHECK/);
 assert.match(progress,/firebase:\{label:"Firebase readiness \(read-only\)",total:3\}/);
 assert.match(html,/Does not run GitHub CI, connect to Firebase/);
});
