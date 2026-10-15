"use strict";
(function(){
 const host=document.getElementById("wellness-route-runner");if(!host)return;
 const button=document.getElementById("wellness-run"),output=document.getElementById("wellness-run-report"),status=document.getElementById("wellness-run-status");
 const journeys=[
 {id:"WJ-001",name:"NFC landing destination",steps:["/quick-connect.html"]},
 {id:"WJ-003",name:"Explore community",steps:["/quick-connect.html","/apartment-wellness.html"]},
 {id:"WJ-004",name:"Check-in entry",steps:["/quick-connect.html","/wellness-check-in.html","/event-checkin.js"]},
 {id:"WJ-005",name:"Assessment entry",steps:["/quick-connect.html","/sound-assessment.html"]},
 {id:"WJ-006",name:"Private session entry",steps:["/quick-connect.html","/private-sessions.html"]},
 {id:"WJ-028",name:"Run Club discovery",steps:["/community-hub.html","/free-run-club.html"]},
 {id:"DISCOVERY-RESIDENTIAL",name:"Residential wellness discovery",steps:["/apartment-wellness.html","/residential-wellness.html"]}
 ];
 const timeout=9000;
 async function check(step,previous){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const response=await fetch(step,{method:"GET",credentials:"same-origin",redirect:"follow",signal:controller.signal,cache:"no-store"});
   if(!response.ok)return {step,status:"FAIL",reason:"HTTP_"+response.status};
   if(new URL(response.url,location.origin).origin!==location.origin)return {step,status:"FAIL",reason:"CROSS_ORIGIN_REDIRECT"};
   if(!new URL(response.url,location.origin).pathname.endsWith(step))return {step,status:"FAIL",reason:"UNEXPECTED_REDIRECT",finalUrl:new URL(response.url).pathname};
   const text=await response.text();
   if(!text.trim())return {step,status:"FAIL",reason:"EMPTY_RESPONSE"};
   if(previous==="/quick-connect.html"){
    const entry=await fetch("/quick-connect.html",{credentials:"same-origin",cache:"no-store"});
    if(!entry.ok)return {step,status:"FAIL",reason:"ENTRY_UNAVAILABLE"};
    const html=await entry.text(),doc=new DOMParser().parseFromString(html,"text/html");
    const linked=Array.from(doc.querySelectorAll("a[href]")).some(a=>{try{return new URL(a.getAttribute("href"),location.origin).pathname===step}catch{return false}});
    if(!linked)return {step,status:"FAIL",reason:"ENTRY_LINK_MISSING"};
   }
   if(step.endsWith(".html") && !/<html[\s>]/i.test(text))return {step,status:"FAIL",reason:"NOT_HTML"};
   return {step,status:"PASS_ROUTE_ONLY",reason:"HTTP_AND_LINK_OK"};
  }catch(e){return {step,status:"FAIL",reason:e.name==="AbortError"?"TIMEOUT":"NETWORK_ERROR"}}
  finally{clearTimeout(timer)}
 }
 button.addEventListener("click",async()=>{
  button.disabled=true;output.hidden=true;status.textContent="Running read-only route checks…";
  const results=[];
  for(const journey of journeys){const checks=[];let previous=null;
   for(const step of journey.steps){const result=await check(step,previous);checks.push(result);if(result.status==="FAIL")break;previous=step}
   results.push({id:journey.id,name:journey.name,status:checks.some(x=>x.status==="FAIL")?"FAIL":"PASS_ROUTE_ONLY",firstFailure:checks.find(x=>x.status==="FAIL")||null,checks});
  }
  const report={kind:"WellnessBrowserRouteReport",mode:"READ_ONLY_BROWSER_HTTP",timestamp:new Date().toISOString(),results,limitations:["No NFC hardware interaction","No client registration, RSVP, check-in submission, payment, or database write","Passing route checks do not certify end-to-end customer workflows"]};
  output.textContent=JSON.stringify(report,null,2);output.hidden=false;
  const failures=results.filter(x=>x.status==="FAIL");status.textContent=failures.length?failures.length+" of "+results.length+" route journeys failed; inspect firstFailure below.":results.length+" route journeys reachable. Customer-action tests remain unimplemented.";
  button.disabled=false;
 });
})();
