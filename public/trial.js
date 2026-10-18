(()=>{"use strict";
const agree=document.getElementById("agree"),start=document.getElementById("start"),status=document.getElementById("status");
const api=async(path,options={})=>{const r=await window.MaatApiClient.request(path,options);if(!r.ok)throw new Error(r.payload?.error?.message||r.error?.message||"Request failed");return r.payload?.data||r.payload;};
const params=new URLSearchParams(location.search);
const destination=params.get("returnTo")?.startsWith("/")&&!params.get("returnTo")?.startsWith("//")?params.get("returnTo") :"/community-hub.html?trial=started";
let mode="trial";
function membershipMode(){mode="membership";agree.disabled=true;start.disabled=false;start.textContent="Choose membership";status.textContent="Your seven-day trial has ended. Your saved Nutrition data remains available when you subscribe.";}
agree.onchange=()=>{if(mode==="trial")start.disabled=!agree.checked;};
start.onclick=async()=>{
 if(mode==="membership"){location.assign("/membership.html");return;}
 if(!agree.checked)return;
 start.disabled=true;status.textContent="Starting your trial…";
 try{const result=await api("/api/me/trial-access/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accepted:true})});if(result?.trial?.status==="expired"){membershipMode();return;}location.replace(destination);}
 catch(e){status.textContent=e.message;start.disabled=false;}
};
async function init(){
 const ready=await window.AuthStateRuntime.whenReady();
 if(!ready.ok){location.replace("/login.html?returnTo="+encodeURIComponent(location.pathname+location.search));return;}
 try{
  const tier=await api("/api/me/membership-tier");
  if(tier.hasAccess){location.replace(destination);return;}
  const result=await api("/api/me/trial-access");
  if(result?.trial?.status==="expired"){membershipMode();return;}
  if(result?.trial?.status==="trialing"){location.replace(destination);return;}
 }catch(e){status.textContent=e.message;}
}
init();
})();