"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../public/live-journey-http-probe.js"),"utf8");
test("live HTTP probe sends anonymous admin boundary to canonical backend, not static frontend",async()=>{
 const handlers={},calls=[],status={textContent:""},report={hidden:true,textContent:""},button={disabled:false,addEventListener:(type,cb)=>handlers[type]=cb};
 const elements={"live-http-probe-run":button,"live-http-probe-status":status,"live-http-probe-report":report};
 const context={document:{getElementById:id=>elements[id]},location:{href:"https://frontend.example/admin-acceptance-lab.html"},URL,window:{MaatApiClient:{resolve:p=>"https://backend.example"+p}},fetch:async(url,options)=>{calls.push({url,options});return {status:url.startsWith("https://backend.example")?401:200}}};
 vm.runInNewContext(source,context);
 await handlers.click();
 assert.equal(calls.length,2);
 assert.equal(calls[0].url,"/admin-acceptance-lab.html");
 assert.equal(calls[1].url,"https://backend.example/api/admin/business-os/acceptance/live/preflight");
 assert.equal(calls[1].options.credentials,"omit");
 assert.equal(calls[1].options.headers.Authorization,undefined);
 assert.match(status.textContent,/PASS/);
 assert.equal(JSON.parse(report.textContent).firstFailure,null);
});
test("missing canonical resolver fails closed instead of silently hitting frontend",async()=>{
 const handlers={},status={textContent:""},report={hidden:true,textContent:""},button={disabled:false,addEventListener:(type,cb)=>handlers[type]=cb};
 const elements={"live-http-probe-run":button,"live-http-probe-status":status,"live-http-probe-report":report};
 const context={document:{getElementById:id=>elements[id]},location:{href:"https://frontend.example/"},URL,window:{},fetch:async()=>({status:200})};
 vm.runInNewContext(source,context);await handlers.click();
 assert.match(status.textContent,/FAIL/);
 assert.match(report.textContent,/Canonical backend URL resolver unavailable/);
});
