"use strict";
(async function(){
 const button=document.getElementById("isolated-http-run"),status=document.getElementById("isolated-http-status"),report=document.getElementById("isolated-http-report");
 if(!button||!window.MaatApiClient||!window.AuthNavigation)return;
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  const state=window.AuthStateRuntime?.getCanonicalAuthState?.();
  const roles=state?.user?.roles||[],role=state?.user?.role;
  if(!readiness?.ok||!window.AuthStateRuntime?.getAuthToken?.()||(!roles.includes("admin")&&!roles.includes("super_admin")&&!["admin","super_admin"].includes(role))){
   status.textContent="Administrator sign-in required.";return;
  }
  button.disabled=false;status.textContent="Ready. Runs real HTTP requests only against a temporary local server and temporary data.";
 }catch(error){status.textContent="Authentication unavailable: "+error.message;return}
 button.addEventListener("click",async()=>{
  if(!window.confirm("Run isolated real HTTP signup, consent, event, RSVP, check-in and CRM test? No production customer records, payments or notifications will be created."))return;
  button.disabled=true;report.hidden=true;status.textContent="Running isolated authenticated HTTP journey…";
  try{
   const response=await window.MaatApiClient.request("/api/admin/business-os/acceptance/isolated-http/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:"RUN_ISOLATED_HTTP_ONLY"})});
   const data=response.payload?.report;
   if(!data)throw Error(window.MileleAcceptanceDiagnostics?.describe(response)||"No report returned");
   status.textContent=(data.passed?"PASS":"FAIL")+" · "+data.tests+" HTTP test(s) · "+data.durationMs+" ms"+(data.firstFailure?" · First failure: "+data.firstFailure:"");
   report.textContent=JSON.stringify(data,null,2);report.hidden=false;
   window.dispatchEvent(new CustomEvent("milele-acceptance-result",{detail:{type:"isolated-http",passed:data.passed,count:data.tests-data.failures,total:data.tests,firstFailure:data.firstFailure}}));
  }catch(error){status.textContent="Unable to run: "+error.message}
  finally{button.disabled=false}
 });
})();
