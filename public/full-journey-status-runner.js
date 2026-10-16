"use strict";
(async function(){
 const button=document.getElementById("full-journey-status-run"),status=document.getElementById("full-journey-status"),report=document.getElementById("full-journey-report");
 if(!button||!status||!report||!window.MaatApiClient||!window.AuthNavigation)return;
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  if(!readiness?.ok||!window.AuthStateRuntime?.getAuthToken?.()){status.textContent="Admin sign-in required.";return}
  const user=window.AuthStateRuntime?.getCanonicalAuthState?.()?.user||{};
  if(!["admin","super_admin"].some(role=>user.role===role||user.roles?.includes(role))){status.textContent="Admin access required.";return}
  button.disabled=false;status.textContent="Ready to inspect full journey evidence.";
 }catch(error){status.textContent="Authentication unavailable: "+error.message;return}
 button.addEventListener("click",async()=>{
  button.disabled=true;status.textContent="Checking verified production journey evidence…";report.hidden=true;
  try{
   const response=await window.MaatApiClient.request("/api/admin/business-os/acceptance/live/full-journey/status",{method:"GET"});
   if(!response.ok)throw Error(response.error?.message||"Evidence endpoint unavailable");
   const result=response.payload?.report;
   if(!result||!Array.isArray(result.checks)||result.executionPerformed!==false)throw Error("Invalid evidence report");
   status.textContent=result.passed?"PASS · All eight evidence gates verified":"BLOCKED · First missing evidence: "+(result.firstFailure?.id||"unknown");
   report.textContent=JSON.stringify(result,null,2);report.hidden=false;
  }catch(error){status.textContent="FAIL · "+String(error.message||error)}
  finally{button.disabled=false}
 });
})();
