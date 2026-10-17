"use strict";
(async function(){
 const button=document.getElementById("wellness-primary-run"),status=document.getElementById("wellness-primary-status"),output=document.getElementById("wellness-primary-report");
 if(!button||!status||!output||!window.MaatApiClient||!window.AuthNavigation)return;
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  const user=window.AuthStateRuntime?.getCanonicalAuthState?.()?.user||{};
  if(!readiness?.ok||!window.AuthStateRuntime?.getAuthToken?.()||!["admin","super_admin"].some(role=>user.role===role||user.roles?.includes(role))){status.textContent="Admin sign-in required.";return}
  button.disabled=false;status.textContent="Ready · Safe isolated HTTP customer journey.";
 }catch(error){status.textContent="Authentication unavailable: "+error.message;return}
 button.addEventListener("click",async()=>{
  if(!window.confirm("Run the isolated Wellness signup, consent, event, RSVP, check-in and CRM test? This uses temporary local records; trial and private-session browser actions are not yet covered."))return;
  button.disabled=true;output.hidden=true;status.textContent="Running Wellness customer journey…";
  try{
   const response=await window.MaatApiClient.request("/api/admin/business-os/acceptance/isolated-http/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:"RUN_ISOLATED_HTTP_ONLY"})});
   const data=response.payload?.report;
   if(!data)throw Error(window.MileleAcceptanceDiagnostics?.describe(response)||"No report returned");
   status.textContent=(data.passed?"PASS":"FAIL")+" · "+data.tests+" HTTP test(s) · "+data.durationMs+" ms"+(data.firstFailure?" · First failure: "+data.firstFailure:"")+" · Trial/private-session browser steps not yet tested";
   output.textContent=JSON.stringify({journey:"Wellness Community",covered:["signup","login","consent","event","RSVP","check-in","CRM readback","temporary cleanup"],notYetCovered:["full browser navigation","seven-day trial activation","private-session request"],...data},null,2);
   output.hidden=false;
  }catch(error){status.textContent="FAIL · "+error.message}
  finally{button.disabled=false}
 });
})();