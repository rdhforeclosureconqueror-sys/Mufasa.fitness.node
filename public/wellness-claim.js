(()=>{"use strict";
const button=document.getElementById("claim"),status=document.getElementById("status");
button.addEventListener("click",async()=>{
 button.disabled=true;
 try{
  const pass=JSON.parse(sessionStorage.getItem("event-claim-pass")||"null");
  if(!pass?.id||!pass?.token)throw Error("No event pass found in this browser session. Return to your event check-in.");
  const ready=await window.AuthStateRuntime?.whenReady?.();
  if(!ready?.ok){location.replace("/login.html?returnTo="+encodeURIComponent("/wellness-claim.html"));return;}
  if(!window.MaatApiClient?.request)throw Error("Member service unavailable.");
  const result=await window.MaatApiClient.request("/api/me/community/guest-check-in/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:pass.id,token:pass.token})});
  if(!result?.ok)throw Error(result?.payload?.error?.message||result?.error?.message||"Unable to link this event.");
  sessionStorage.removeItem("event-claim-pass");
  status.textContent="Your event is linked to your member account.";
  location.replace("/community-trial-offer.html?source=event-check-in");
 }catch(error){status.textContent=error.message||"Unable to link this event.";button.disabled=false;}
});
})();