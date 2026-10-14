(()=>{"use strict";
const agree=document.getElementById("agree"),accept=document.getElementById("accept"),skip=document.getElementById("skip"),status=document.getElementById("status");
const hub="/community-hub.html?source=private-session-request";
agree.addEventListener("change",()=>{accept.disabled=!agree.checked;});
skip.addEventListener("click",()=>location.replace(hub+"&trial=declined"));
accept.addEventListener("click",async()=>{
 if(!agree.checked)return;
 accept.disabled=true;skip.disabled=true;status.textContent="Starting your trial…";
 try{
  const ready=await window.AuthStateRuntime?.whenReady?.();
  if(!ready?.ok){status.textContent="Please sign in to start the trial.";location.replace("/login.html?returnTo="+encodeURIComponent("/community-trial-offer.html?source=private-session-request"));return;}
  if(!window.MaatApiClient?.request)throw Error("Trial service is unavailable.");
  const result=await window.MaatApiClient.request("/api/me/trial-access/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accepted:true})});
  if(!result?.ok)throw Error(result?.payload?.error?.message||result?.error?.message||"Could not activate trial.");
  location.replace(hub+"&trial=accepted");
 }catch(error){status.textContent=error.message||"Could not start trial.";accept.disabled=false;skip.disabled=false;}
});
})();
