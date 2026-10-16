"use strict";
(function(){
 const button=document.getElementById("full-journey-status-run");
 const status=document.getElementById("full-journey-status");
 const report=document.getElementById("full-journey-report");
 if(!button||!status||!report)return;
 button.addEventListener("click",async()=>{
  button.disabled=true;status.textContent="Checking verified production journey evidence…";report.hidden=true;
  try{
   const api=window.apiClient;
   const token=window.authStateRuntime?.getToken?.()||window.localStorage?.getItem("token");
   const response=await fetch("/api/admin/business-os/acceptance/live/full-journey/status",{method:"GET",cache:"no-store",credentials:"same-origin",headers:token?{"Authorization":"Bearer "+token}:{}});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error?.code||"HTTP_"+response.status);
   const result=data.report;
   status.textContent=result.passed?"PASS · All eight evidence gates verified":"BLOCKED · First missing evidence: "+(result.firstFailure?.id||"unknown");
   report.textContent=JSON.stringify(result,null,2);report.hidden=false;
  }catch(error){status.textContent="FAIL · "+String(error.message||error)}
  finally{button.disabled=false}
 });
})();
