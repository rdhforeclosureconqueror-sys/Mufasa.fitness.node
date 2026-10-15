"use strict";
const form=document.getElementById("reportForm"),status=document.getElementById("status"),report=document.getElementById("report");
const put=(id,value)=>{document.getElementById(id).textContent=String(value)};
function show(data){
 put("total",data.checkedIn);put("attributed",data.attributedCheckIns);put("unattributed",data.unattributedCheckIns);
 const rows=document.getElementById("campaignRows");rows.replaceChildren();
 for(const campaign of data.campaigns||[]){
  const tr=document.createElement("tr");
  for(const value of [campaign.utm_source||"—",campaign.utm_medium||"—",campaign.utm_campaign||"—",campaign.checkIns]){
   const td=document.createElement("td");td.textContent=String(value);tr.appendChild(td);
  }
  rows.appendChild(tr);
 }
 if(!rows.children.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=4;td.textContent="No attributed guest check-ins recorded.";tr.appendChild(td);rows.appendChild(tr)}
 report.hidden=false;
}
form.addEventListener("submit",async event=>{
 event.preventDefault();report.hidden=true;
 const eventId=document.getElementById("eventId").value.trim();
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(eventId)){status.textContent="Enter a valid event ID.";return}
 status.textContent="Verifying administrator access…";
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  if(!readiness?.ok){status.textContent="Sign in required.";return}
  if(!window.AuthStateRuntime?.getAuthToken?.()){status.textContent="Authentication token missing.";return}
  const result=await window.MaatApiClient.request("/api/admin/community/events/"+encodeURIComponent(eventId)+"/campaign-report");
  if(!result.ok)throw Error(result.payload?.error?.message||result.error?.message||"Report unavailable or access denied");
  show(result.payload.data);status.textContent="Report loaded. Guest details are not included.";
 }catch(error){status.textContent=error.message||"Unable to load report"}
});
