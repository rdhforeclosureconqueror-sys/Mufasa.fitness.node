"use strict";
(async function(){
 const button=document.getElementById("wellness-synthetic-run"),status=document.getElementById("wellness-synthetic-status"),report=document.getElementById("wellness-synthetic-report");
 if(!button||!window.MaatApiClient||!window.AuthNavigation)return;
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  if(!readiness?.ok||!window.AuthStateRuntime?.getAuthToken?.()){status.textContent="Sign in as admin to run isolated tests.";return}
  const roles=window.AuthStateRuntime?.getCanonicalAuthState?.()?.user?.roles||[];
  const role=window.AuthStateRuntime?.getCanonicalAuthState?.()?.user?.role;
  if(!roles.includes("admin")&&!roles.includes("super_admin")&&!["admin","super_admin"].includes(role)){status.textContent="Admin access required.";return}
  button.disabled=false;status.textContent="Ready to run isolated customer service tests.";
 }catch(error){status.textContent="Authentication unavailable: "+error.message;return}
 button.addEventListener("click",async()=>{
  button.disabled=true;report.hidden=true;status.textContent="Running isolated synthetic journey…";
  try{
   const response=await window.MaatApiClient.request("/api/admin/business-os/acceptance/wellness/run",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
   if(!response.ok)throw Error(response.payload?.error?.firstFailure||response.payload?.error?.code||"Request failed");
   const data=response.payload?.report;
   if(!data||!Array.isArray(data.checks))throw Error("Invalid synthetic report");
   const passed=data.checks.filter(x=>x.status==="PASS").length;
   status.textContent=(data.passed?"PASS":"FAIL")+" · "+passed+"/"+data.checks.length+" checks passed"+(data.firstFailure?" · First failure: "+data.firstFailure.id:"");
   report.textContent=JSON.stringify(data,null,2);report.hidden=false;
  }catch(error){status.textContent="Unable to run: "+error.message}
  finally{button.disabled=false}
 });
})();
