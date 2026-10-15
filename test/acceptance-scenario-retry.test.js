"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
test("scenario loading retries only network-failed read-only GET and retains auth",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/admin-acceptance-lab.js"),"utf8");
 assert.match(source,/requireUser/);
 assert.match(source,/getAuthToken/);
 assert.match(source,/response\.diagnostics\?\.status==null && response\.diagnostics\?\.dispatched===true/);
 assert.equal((source.match(/request\(endpoint\+"\/scenarios"\)/g)||[]).length,2);
 assert.equal((source.match(/request\(endpoint\+"\/run"/g)||[]).length,1);
});
