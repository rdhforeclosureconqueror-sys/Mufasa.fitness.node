(()=>{"use strict";
const $=id=>document.getElementById(id),start=$("start"),state=$("journeyState"),status=$("status");
const origin=window.MAAT_BACKEND_ORIGIN||location.origin;
let journey=null;
async function api(path,method="GET",body){
 await window.AuthStateRuntime?.whenReady?.();
 const token=window.AuthStateRuntime?.getAuthToken?.();
 if(!token)throw Error("Sign in to start or save your journey.");
 const response=await fetch(origin+path,{method,headers:{"authorization":"Bearer "+token,"content-type":"application/json"},body:body?JSON.stringify(body):undefined,credentials:"include"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error?.message||"Journey request failed ("+response.status+")");
 return data.data||data;
}
function render(){
 const completed=journey?.completedLimbs||[];
 state.textContent=journey?.startedAt?"Started "+new Date(journey.startedAt).toLocaleDateString()+" · "+completed.length+" of 8 limbs completed":"Your journey has not started.";
 start.hidden=Boolean(journey?.startedAt);
 document.querySelectorAll("#limbs li").forEach((li,index)=>{
   let button=li.querySelector("button");
   if(!journey?.startedAt){button?.remove();return;}
   if(!button){button=document.createElement("button");li.append(" ",button);}
   const limb=index+1,done=completed.includes(limb);
   button.textContent=done?"Completed ✓":"Mark complete";
   button.disabled=done||limb!==completed.length+1;
   button.onclick=async()=>{button.disabled=true;status.textContent="Saving…";try{journey=(await api("/api/me/eight-limbs-yoga/complete","POST",{limb})).journey;status.textContent="Saved to your account.";render();}catch(error){status.textContent=error.message;render();}};
 });
}
start.onclick=async()=>{start.disabled=true;status.textContent="Saving…";try{journey=(await api("/api/me/eight-limbs-yoga/start","POST")).journey;status.textContent="Your journey has started.";render();}catch(error){status.textContent=error.message;}finally{start.disabled=false;}};
(async()=>{try{journey=(await api("/api/me/eight-limbs-yoga")).journey;render();}catch(error){status.textContent=error.message;}})();
})();