"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../public/acceptance-api-diagnostics.js"),"utf8");
test("failure report distinguishes CORS/network boundary without leaking auth tokens",()=>{
 const context={};vm.runInNewContext(source,context);
 const text=context.MileleAcceptanceDiagnostics.describe({error:{message:"Failed to fetch"},diagnostics:{apiOrigin:"https://mufasa-fitness-node.onrender.com",status:null,dispatched:true,crossOrigin:true,preflightRequired:true,failureClass:"unknown network"}});
 assert.match(text,/First failure: Failed to fetch/);assert.match(text,/HTTP: no response/);assert.match(text,/Preflight required: true/);assert.doesNotMatch(text,/Bearer /);
});
test("HTTP auth failures preserve response status and code",()=>{
 const context={};vm.runInNewContext(source,context);
 const text=context.MileleAcceptanceDiagnostics.describe({payload:{error:{code:"FORBIDDEN"}},diagnostics:{status:403,failureClass:"authentication HTTP response"}});
 assert.match(text,/FORBIDDEN/);assert.match(text,/HTTP: 403/);
});
