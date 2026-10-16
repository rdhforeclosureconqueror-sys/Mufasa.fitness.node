"use strict";
(async function(){
 const button=document.getElementById("live-preflight-run"),status=document.getElementById("live-preflight-status"),output=document.getElementById("live-preflight-report");
 if(!button||!window.MaatApiClient||!window.AuthNavigation)return;
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  if(!readiness?.ok||!window.AuthStateRuntime?.getAuthToken?.()){status.textContent="Admin sign-in required.";return}
  const user=window.AuthStateRuntime?.getCanonicalAuthState?.()?.user||{};
  if(!["admin","super_admin"].some(role=>user.role===role||user.roles?.includes(role))){status.textContent="Admin access required.";return}
  button.disabled=false;status.textContent="Ready to check production journey safeguards (read-only).";
 }catch(error){status.textContent="Authentication unavailable: "+error.message;return}
 button.addEventListener("click",async()=>{
  button.disabled=true;output.hidden=true;status.textContent="Checking safeguards…";
  try{
   const response=await window.MaatApiClient.request("/api/admin/business-os/acceptance/live/preflight",{method:"GET"});
   if(!response.ok)throw Error(response.error?.message||"Preflight unavailable");
   const data=response.payload?.report;
   if(!data||!Array.isArray(data.checks)||data.executionPerformed!==false)throw Error("Invalid preflight response");
   status.textContent=data.readyForImplementation?"Safeguards asserted; live execution remains disabled.":"BLOCKED · First missing safeguard: "+data.firstFailure;
   output.textContent=JSON.stringify(data,null,2);output.hidden=false;
  }catch(error){status.textContent="Preflight failed: "+error.message}
  finally{button.disabled=false}
 });
})();
