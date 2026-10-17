"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
test("event claim requires stored token and posts only after authentication",async()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/wellness-claim.js"),"utf8");
 const handlers={},calls=[],storage=new Map([["event-claim-pass",JSON.stringify({id:"a".repeat(32),token:"b".repeat(48)})]]);
 const status={textContent:""},button={disabled:false,addEventListener:(event,fn)=>handlers[event]=fn};
 const context={document:{getElementById:id=>id==="claim"?button:status},sessionStorage:{getItem:key=>storage.get(key)||null,removeItem:key=>storage.delete(key)},location:{replace:url=>calls.push(["redirect",url])},window:{AuthStateRuntime:{whenReady:async()=>({ok:true})},MaatApiClient:{request:async(url,opts)=>{calls.push(["request",url,JSON.parse(opts.body)]);return{ok:true};}}},JSON,Error};
 vm.runInNewContext(source,context);await handlers.click();
 assert.equal(calls[0][1],"/api/me/community/guest-check-in/claim");
 assert.equal(calls[0][2].token,"b".repeat(48));
 assert.equal(calls[1][1],"/community-trial-offer.html?source=event-check-in");
 assert.equal(storage.has("event-claim-pass"),false);
});
test("unauthenticated event claim redirects to login without sending token",async()=>{
 const source=fs.readFileSync(path.join(__dirname,"../public/wellness-claim.js"),"utf8");
 let callback,redirect,called=false;
 vm.runInNewContext(source,{document:{getElementById:id=>id==="claim"?{disabled:false,addEventListener:(_,fn)=>callback=fn}:{textContent:""}},sessionStorage:{getItem:()=>JSON.stringify({id:"a".repeat(32),token:"b".repeat(48)})},location:{replace:url=>redirect=url},window:{AuthStateRuntime:{whenReady:async()=>({ok:false})},MaatApiClient:{request:()=>{called=true;}}},JSON,Error,encodeURIComponent});
 await callback();assert.equal(called,false);assert.match(redirect,/^\/login\.html\?returnTo=/);
});
