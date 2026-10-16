"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../public/event-checkin.js"),"utf8");
function run(search,consent=false){
 const requests=[];
 const before={hidden:true,onsubmit:null},after={hidden:true,onsubmit:null};
 const fields={name:"Test Guest",email:"guest@example.test",before:"Ready",attributionConsent:consent?"yes":null};
 const context={location:{search,hostname:"example.test"},URLSearchParams,encodeURIComponent,JSON,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{getElementById:id=>id==="before"?before:id==="after"?after:{textContent:""}},FormData:class{constructor(){this.values=Object.entries(fields).filter(([,v])=>v!==null)}get(k){return fields[k]??null}*[Symbol.iterator](){yield* this.values}},fetch:async(url,options)=>{requests.push({url,options});return {json:async()=>({ok:true,data:{id:"test",token:"test"},data2:{events:[]}})}}};
 vm.runInNewContext(source,context);
 return {requests,before,fields};
}
test("valid NFC event context routes guest check-in to event endpoint with validated attribution",async()=>{
 const v=run("?eventId=event-123&utm_source=nfc&utm_medium=community&utm_campaign=yoga_oct",true);
 await v.before.onsubmit({preventDefault(){}});
 assert.equal(v.requests.at(-1).url,"/api/community/events/event-123/guest-check-in");
 const body=JSON.parse(v.requests.at(-1).options.body);
 assert.equal(body.attributionConsent,true);
 assert.equal(body.attribution.utm_source,"nfc");
 assert.equal(body.attribution.utm_campaign,"yoga_oct");
});
test("duplicate eventId cannot choose an attacker-controlled event",async()=>{
 const v=run("?eventId=event-123&eventId=event-456",false);
 await v.before.onsubmit({preventDefault(){}});
 assert.equal(v.requests.at(-1).url,"/api/event-checkin");
 assert.equal(JSON.parse(v.requests.at(-1).options.body).attributionConsent,false);
});
test("invalid or duplicate campaign fields are excluded before check-in submission",async()=>{
 const v=run("?eventId=event-123&utm_source=nfc&utm_source=spoof&utm_campaign=%3Cscript%3E",true);
 await v.before.onsubmit({preventDefault(){}});
 const body=JSON.parse(v.requests.at(-1).options.body);
 assert.equal(body.attribution.utm_source,null);
 assert.equal(body.attribution.utm_campaign,null);
});
test("no consent is preserved even when campaign tags exist",async()=>{
 const v=run("?eventId=event-123&utm_source=nfc&utm_campaign=yoga_oct",false);
 await v.before.onsubmit({preventDefault(){}});
 assert.equal(JSON.parse(v.requests.at(-1).options.body).attributionConsent,false);
});
