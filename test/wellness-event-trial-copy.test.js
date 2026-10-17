"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const script=fs.readFileSync(path.join(__dirname,"../public/community-trial-offer.js"),"utf8");
function render(source){
 const elements=Object.fromEntries(["offer-title","offer-intro","offer-footnote","agree","accept","skip","status"].map(id=>[id,{textContent:"",disabled:true,addEventListener(){}}]));
 vm.runInNewContext(script,{document:{getElementById:id=>elements[id]},location:{search:"?source="+source},URLSearchParams,window:{}});
 return elements;
}
test("event check-in invitation does not claim a private coaching request",()=>{
 const ui=render("event-check-in");
 assert.match(ui["offer-title"].textContent,/wellness event/);
 assert.match(ui["offer-intro"].textContent,/event check-in/);
 assert.doesNotMatch(ui["offer-intro"].textContent,/coach.*request/);
});
test("rooftop yoga invitation is context-aware",()=>assert.match(render("rooftop-yoga")["offer-title"].textContent,/rooftop yoga/));
test("trial consent and accept endpoint remain intact",()=>{
 assert.match(script,/agree\.checked/);
 assert.match(script,/\/api\/me\/trial-access\/accept/);
});
