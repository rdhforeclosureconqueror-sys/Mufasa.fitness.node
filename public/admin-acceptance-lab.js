"use strict";
(async function(){
 const status=document.getElementById("status"),list=document.getElementById("scenarios"),run=document.getElementById("run"),summary=document.getElementById("summary"),report=document.getElementById("report"),copy=document.getElementById("copy");
 const endpoint="/api/admin/business-os/acceptance";
 function failure(result){return window.MileleAcceptanceDiagnostics?.describe(result)||result?.error?.message||"Request failed";}
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  if(!readiness?.ok){status.textContent="Sign in required.";return}
  if(!window.AuthStateRuntime?.getAuthToken?.()){status.textContent="No verified authentication token.";return}
  const response=await window.MaatApiClient.request(endpoint+"/scenarios");
  if(!response.ok)throw Error(failure(response));
  const scenarios=response.payload?.scenarios;
  if(!Array.isArray(scenarios)||!scenarios.length)throw Error("No scenarios available");
  for(const scenario of scenarios){
   const label=document.createElement("label"),input=document.createElement("input"),name=document.createElement("span");
   input.type="checkbox";input.value=scenario.id;input.checked=true;
   name.textContent=" "+scenario.id+" · Expected "+scenario.expected;
   label.append(input,name);list.append(label);
  }
  status.textContent=scenarios.length+" synthetic scenario(s) available";run.disabled=false;
  run.addEventListener("click",async()=>{
   const scenarioIds=Array.from(list.querySelectorAll("input:checked"),x=>x.value);
   if(!scenarioIds.length){status.textContent="Select at least one scenario.";return}
   run.disabled=true;status.textContent="Running synthetic verification…";copy.hidden=true;
   try{
    const result=await window.MaatApiClient.request(endpoint+"/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenarioIds})});
    if(!result.ok)throw Error(failure(result));
    const data=result.payload?.report;
    if(!data||!Array.isArray(data.results))throw Error("Invalid report received");
    summary.textContent=(data.passed?"PASS":"FAIL")+" · "+data.results.filter(x=>x.passed).length+"/"+data.total+" passed · Commit "+data.commitSha;
    summary.className=data.passed?"pass":"fail";report.textContent=JSON.stringify(data,null,2);report.hidden=false;copy.hidden=false;
    status.textContent="Simulation complete. No production changes performed.";window.dispatchEvent(new CustomEvent("milele-acceptance-result",{detail:{type:"business",passed:data.passed,count:data.results.filter(x=>x.passed).length,total:data.total,firstFailure:data.results.find(x=>!x.passed)?.id||null}}));
   }catch(e){summary.textContent="Unable to run: "+e.message;summary.className="fail";status.textContent="Verification unavailable";}
   finally{run.disabled=false}
  });
  copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(report.textContent);status.textContent="Report copied."}catch(_){status.textContent="Copy unavailable; select report text instead."}});
 }catch(e){status.textContent="Test Center unavailable: "+e.message;run.disabled=true}
})();
