"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const script=fs.readFileSync("public/community-trial-offer.js","utf8");
function setup(search,authenticated=true){
 const handlers={};const elements=Object.fromEntries(["agree","accept","skip","status"].map(id=>[id,{checked:false,disabled:false,textContent:"",addEventListener:(event,cb)=>{handlers[id+":"+event]=cb;}}]));
 const location={search,replaced:null,replace(url){this.replaced=url;}};
 const context={document:{getElementById:id=>elements[id]},location,URLSearchParams,encodeURIComponent,window:{AuthStateRuntime:{whenReady:async()=>({ok:authenticated})},MaatApiClient:{request:async()=>({ok:true})}}};
 vm.runInNewContext(script,context);
 return{handlers,elements,location};
}
test("rooftop trial acceptance returns to community with original source",async()=>{
 const {handlers,elements,location}=setup("?source=rooftop-yoga");
 elements.agree.checked=true;await handlers["accept:click"]();
 assert.equal(location.replaced,"/community-hub.html?source=rooftop-yoga&trial=accepted");
});
test("rooftop source survives login returnTo",async()=>{
 const {handlers,elements,location}=setup("?source=rooftop-yoga",false);
 elements.agree.checked=true;await handlers["accept:click"]();
 assert.equal(location.replaced,"/login.html?returnTo="+encodeURIComponent("/community-trial-offer.html?source=rooftop-yoga"));
});
test("untrusted source is not reflected into redirect",async()=>{
 const {handlers,elements,location}=setup("?source=https://evil.example");
 elements.agree.checked=true;await handlers["accept:click"]();
 assert.equal(location.replaced,"/community-hub.html?source=private-session-request&trial=accepted");
});
