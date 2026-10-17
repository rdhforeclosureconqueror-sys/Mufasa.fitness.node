(()=>{"use strict";
const form=document.getElementById("conversion-form"),status=document.getElementById("conversion-status"),metrics=document.getElementById("conversion-metrics");
const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
form?.addEventListener("submit",async event=>{
 event.preventDefault();metrics.replaceChildren();
 const id=String(document.getElementById("conversion-event").value||"").trim();
 if(!/^[A-Za-z0-9_-]{3,64}$/.test(id)){status.textContent="Enter a valid event ID.";return;}
 status.textContent="Loading verified event conversions…";
 try{
  const readiness=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search});
  if(!readiness?.ok){status.textContent="Administrator sign-in required.";return;}
  const result=await window.MaatApiClient.request("/api/admin/community/events/"+encodeURIComponent(id)+"/conversions");
  if(!result?.ok)throw Error(result?.payload?.error?.message||result?.error?.message||"Access denied or report unavailable.");
  const data=result.payload?.data||{};
  const fields=[["Guest check-ins",data.checkedIn],["Linked member accounts",data.linkedAccounts],["Seven-day trial activations",data.trialActivations],["Trial conversions per linked account",String(data.conversionRate??0)+"%"],["Paid membership conversions","Not integrated"]];
  for(const [label,value] of fields){const block=document.createElement("div"),name=document.createElement("strong"),number=document.createElement("p");name.textContent=label;number.textContent=String(value??"—");block.append(name,number);metrics.append(block);}
  status.textContent="Verified report for event "+id+". Counts are recorded activity, not estimates.";
 }catch(error){status.textContent=error.message||"Could not load event conversions.";}
});
})();