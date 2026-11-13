"use strict";
(function(){
 const button=document.getElementById("firebase-cloud-run"),status=document.getElementById("firebase-cloud-status"),output=document.getElementById("firebase-cloud-report");
 if(!button||!status||!output)return;
 const targets=[
  {id:"FIREBASE_PANEL_SCRIPT",path:"/firebase-cloud-acceptance.js",marker:"firebase-cloud-run"},
  {id:"FIREBASE_AVATAR_CONTRACT",path:"/avatar-upload-contract.js",marker:"/api/avatar/upload"},
  {id:"FIREBASE_ACCEPTANCE_PAGE",path:"/admin-acceptance-lab.html",marker:"firebase-cloud-acceptance"}
 ];
 async function probe(target){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(target.path,{method:"GET",credentials:"same-origin",redirect:"follow",cache:"no-store",signal:controller.signal});
   const final=new URL(response.url,location.href);
   if(!response.ok)return {id:target.id,passed:false,reason:"HTTP_"+response.status};
   if(final.origin!==location.origin||final.pathname!==target.path)return {id:target.id,passed:false,reason:"UNEXPECTED_REDIRECT"};
   const body=await response.text();
   if(!body.includes(target.marker))return {id:target.id,passed:false,reason:"EXPECTED_CONTENT_MISSING"};
   return {id:target.id,passed:true,reason:"DEPLOYED_ASSET_FOUND"};
  }catch(error){return {id:target.id,passed:false,reason:error.name==="AbortError"?"TIMEOUT":"NETWORK_ERROR"}}
  finally{clearTimeout(timer)}
 }
 button.addEventListener("click",async()=>{
  button.disabled=true;status.textContent="Checking deployed readiness assets…";output.hidden=true;
  try{
   const checks=[];for(const target of targets)checks.push(await probe(target));
   const firstFailure=checks.find(check=>!check.passed)||null;
   const report={suite:"firebase-cloud-readiness",mode:"READ_ONLY_ASSET_CHECK",passed:!firstFailure,total:checks.length,checks,firstFailure,limitations:["Does not execute GitHub Actions or Node preflight","Does not connect to Firebase or verify member authorization","Does not upload, retrieve, delete, or change production records"]};
   output.textContent=JSON.stringify(report,null,2);output.hidden=false;
   status.textContent=firstFailure?"FAIL · "+firstFailure.id+" / "+firstFailure.reason:"PASS · 3/3 deployed assets reachable. Cloud certification still pending.";
   window.dispatchEvent(new CustomEvent("milele-acceptance-result",{detail:{type:"firebase",passed:report.passed,count:checks.filter(c=>c.passed).length,total:checks.length,firstFailure:firstFailure?.id||null}}));
  }catch(error){status.textContent="FAIL · PANEL_RUNTIME / "+(error?.message||"Unknown error")}
  finally{button.disabled=false}
 });
})();
