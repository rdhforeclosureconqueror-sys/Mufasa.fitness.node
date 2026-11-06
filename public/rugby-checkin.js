(function(global){
'use strict';
function init(){
 const form=document.getElementById('rugby-checkin'),status=document.getElementById('checkin-status'),guidance=document.getElementById('checkin-guidance');
 if(!form||!global.MaatApiClient?.request)return;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button');button.disabled=true;status.textContent='Saving check-in…';
  try{
   const today=new Date();const date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
   const result=await global.MaatApiClient.request('/api/me/rugby/checkins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,readiness:form.elements.readiness.value,teamHighLoad:form.elements.teamHighLoad.checked,injuryConcern:form.elements.injuryConcern.checked,week:Number(document.getElementById('week').value)+1})});
   if(!result.ok||!result.payload?.data?.plan)throw Error('Save failed');
   const plan=result.payload.data.plan;
   guidance.replaceChildren();
   const title=document.createElement('h3');title.textContent='Today: '+plan.theme;
   const mobility=document.createElement('p');mobility.textContent='Recovery: '+plan.mobility;
   const saq=document.createElement('p');saq.textContent='SAQ: '+plan.saq;
   guidance.append(title,mobility,saq);
   const verified=await global.MaatApiClient.request('/api/me/rugby/checkins');if(!verified.ok||!verified.payload?.data?.some(item=>item.date===date&&item.readiness===form.elements.readiness.value))throw Error('Check-in readback failed');status.textContent='PASS: Daily check-in saved and verified by reloading your account. Match schedule not yet verified.';
  }catch(_){status.textContent='FIRST FAILURE: Check-in save or readback could not be verified. Please retry.';}
  finally{button.disabled=false;}
 });
}
global.RugbyCheckin={init};
})(window);
