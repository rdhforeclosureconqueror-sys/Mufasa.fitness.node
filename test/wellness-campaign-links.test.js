"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../public/quick-connect.html"),"utf8");
const script=fs.readFileSync(path.join(__dirname,"../public/wellness-campaign-links.js"),"utf8");
function links(search){
 const hrefs=["/apartment-wellness.html","/wellness-check-in.html","/sound-assessment.html","/private-sessions.html?source=community"];
 const anchors=hrefs.map(href=>({href,getAttribute(){return this.href},setAttribute(_k,v){this.href=v}}));
 const context={window:{location:{search,origin:"https://example.test"}},document:{querySelectorAll:()=>anchors},URL,URLSearchParams};
 vm.runInNewContext(script,context);
 return anchors.map(a=>a.href);
}
test("Quick Connect loads campaign propagation without replacing existing destinations",()=>{
 assert.match(html,/src="\/wellness-campaign-links\.js"/);
 assert.deepEqual(links(""),["/apartment-wellness.html","/wellness-check-in.html","/sound-assessment.html","/private-sessions.html?source=community"]);
});
test("approved attribution and event context propagate to four wellness actions",()=>{
 const output=links("?utm_source=nfc&utm_medium=community&utm_campaign=yoga_oct&eventId=event-123");
 assert.equal(output.length,4);
 for(const link of output){const u=new URL(link,"https://example.test");assert.equal(u.searchParams.get("utm_source"),"nfc");assert.equal(u.searchParams.get("utm_campaign"),"yoga_oct");assert.equal(u.searchParams.get("eventId"),"event-123");}
 assert.equal(new URL(output[3],"https://example.test").searchParams.get("source"),"community");
});
test("rejects duplicate, oversized, or injected attribution parameters",()=>{
 const output=links("?utm_source=nfc&utm_source=spoof&utm_campaign=%3Cscript%3E&eventId="+("a".repeat(81)));
 assert.deepEqual(output,links(""));
});
