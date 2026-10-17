(()=>{"use strict";
const agree=document.getElementById("agree"),accept=document.getElementById("accept"),skip=document.getElementById("skip"),status=document.getElementById("status");
const params=new URLSearchParams(location.search);
const allowedSources=new Set(["private-session-request","rooftop-yoga","event-check-in"]);
const source=allowedSources.has(params.get("source"))?params.get("source"):"private-session-request";
const hub="/community-hub.html?source="+encodeURIComponent(source);
const title=document.getElementById("offer-title"),intro=document.getElementById("offer-intro"),footnote=document.getElementById("offer-footnote");
if(source==="event-check-in"){
 if(title)title.textContent="Thank you for joining our wellness event!";
 if(intro)intro.textContent="Your event check-in is linked to your account. Would you like to explore PocketPT free for seven days?";
 if(footnote)footnote.textContent="After seven days, full-system access pauses unless you choose a membership. Your event participation does not require a paid membership.";
}else if(source==="rooftop-yoga"){
 if(title)title.textContent="Welcome to Milele Fit rooftop yoga!";
 if(intro)intro.textContent="Explore your wellness community and try PocketPT free for seven days.";
 if(footnote)footnote.textContent="After seven days, full-system access pauses unless you choose a membership. No credit card required.";
}
agree.addEventListener("change",()=>{accept.disabled=!agree.checked;});
skip.addEventListener("click",()=>location.replace(hub+"&trial=declined"));
accept.addEventListener("click",async()=>{
 if(!agree.checked)return;
 accept.disabled=true;skip.disabled=true;status.textContent="Starting your trial…";
 try{
  const ready=await window.AuthStateRuntime?.whenReady?.();
  if(!ready?.ok){status.textContent="Please sign in to start the trial.";location.replace("/login.html?returnTo="+encodeURIComponent("/community-trial-offer.html?source="+encodeURIComponent(source)));return;}
  if(!window.MaatApiClient?.request)throw Error("Trial service is unavailable.");
  const result=await window.MaatApiClient.request("/api/me/trial-access/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accepted:true})});
  if(!result?.ok)throw Error(result?.payload?.error?.message||result?.error?.message||"Could not activate trial.");
  location.replace(hub+"&trial=accepted");
 }catch(error){status.textContent=error.message||"Could not start trial.";accept.disabled=false;skip.disabled=false;}
});
})();
