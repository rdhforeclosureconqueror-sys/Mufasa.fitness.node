(()=>{"use strict";
const agree=document.getElementById("agree"),accept=document.getElementById("accept"),skip=document.getElementById("skip"),status=document.getElementById("status");
const params=new URLSearchParams(location.search);
const allowedSources=new Set(["private-session-request","rooftop-yoga","event-check-in","community-signup"]);
const source=allowedSources.has(params.get("source"))?params.get("source"):"private-session-request";
const hub="/community-hub.html?source="+encodeURIComponent(source);
const title=document.getElementById("offer-title"),intro=document.getElementById("offer-intro"),footnote=document.getElementById("offer-footnote");
if(source==="community-signup"){
 if(title)title.textContent="Welcome to Milele Fit!";
 if(intro)intro.textContent="Your free community account is ready. Would you like to unlock Nutrition and fitness tools with a seven-day free trial?";
 if(footnote)footnote.textContent="Your community membership stays free. Nutrition is included during the trial and in fitness memberships starting at $9.99/month. No credit card required for the trial.";
}else if(source==="event-check-in"){
 if(title)title.textContent="Thank you for joining our wellness event!";
 if(intro)intro.textContent="Your event check-in is linked to your account. Would you like to explore PocketPT free for seven days?";
 if(footnote)footnote.textContent="After seven days, full-system access pauses unless you choose a membership. Your event participation does not require a paid membership.";
}else if(source==="rooftop-yoga"){
 if(title)title.textContent="Welcome to Milele Fit rooftop yoga!";
 if(intro)intro.textContent="Explore your wellness community and try PocketPT free for seven days.";
 if(footnote)footnote.textContent="After seven days, full-system access pauses unless you choose a membership. No credit card required.";
}
async function checkExistingAccess(){
 try{
  const ready=await window.AuthStateRuntime?.whenReady?.();
  if(!ready?.ok)return;
  const request=window.MaatApiClient?.request;
  if(!request)return;
  const [membership,trial]=await Promise.all([
   request("/api/me/membership-tier"),request("/api/me/trial-access")
  ]);
  if(membership?.ok && (membership.payload?.data||membership.payload)?.hasAccess){location.replace(hub+"&trial=already-member");return;}
  const trialInfo=(trial?.payload?.data||trial?.payload)?.trial;
  if(trial?.ok&&trialInfo?.status==="trialing"){location.replace(hub+"&trial=already-active");return;}
  if(trial?.ok&&trialInfo?.status==="expired"){
   agree.disabled=true;accept.disabled=false;accept.textContent="View memberships";
   status.textContent="Your seven-day trial has ended. Your free community access continues.";
   accept.onclick=event=>{event.preventDefault();event.stopImmediatePropagation();location.assign("/membership.html");};
  }
 }catch(error){status.textContent="You can continue with the free community or choose the trial."}
}
checkExistingAccess();
agree.addEventListener("change",()=>{if(!agree.disabled)accept.disabled=!agree.checked;});
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
