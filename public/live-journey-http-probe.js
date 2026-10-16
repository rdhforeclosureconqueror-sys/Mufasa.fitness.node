"use strict";
(async function(){
 const button=document.getElementById("live-http-probe-run"),status=document.getElementById("live-http-probe-status"),report=document.getElementById("live-http-probe-report");
 if(!button||!status||!report)return;
 button.addEventListener("click",async()=>{
  button.disabled=true;report.hidden=true;status.textContent="Running read-only same-origin HTTP checks…";
  const checks=[];
  const targets=[
   {id:"test-center-page",path:"/admin-acceptance-lab.html",expected:[200]},
   {id:"unauthenticated-admin-boundary",path:"/api/admin/business-os/acceptance/live/preflight",expected:[401,403]}
  ];
  const api=window.MaatApiClient;
  for(const target of targets){
   try{
    if(target.id==="unauthenticated-admin-boundary"&&(!api||typeof api.resolve!=="function"))throw Error("Canonical backend URL resolver unavailable");
    const url=target.id==="unauthenticated-admin-boundary"?api.resolve(target.path):target.path;
    const response=await fetch(url,{method:"GET",credentials:"omit",cache:"no-store",redirect:"manual",headers:{"Accept":"application/json"}});
    checks.push({id:target.id,status:target.expected.includes(response.status)?"PASS":"FAIL",httpStatus:response.status,expected:target.expected,targetOrigin:new URL(url,location.href).origin});
   }catch(error){checks.push({id:target.id,status:"FAIL",reason:String(error.message||error)})}
  }
  const firstFailure=checks.find(x=>x.status==="FAIL")||null;
  status.textContent=firstFailure?"FAIL · First boundary: "+firstFailure.id:"PASS · 2/2 live HTTP checks (read-only)";
  report.textContent=JSON.stringify({mode:"LIVE_READ_ONLY_HTTP",executionPerformed:false,checks,firstFailure,limitations:["Does not create customers, RSVP, check in, verify CRM, or test authenticated admin API"]},null,2);
  report.hidden=false;button.disabled=false;
 });
})();
