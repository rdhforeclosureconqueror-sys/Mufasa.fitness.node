(function(global){
'use strict';
const api=(path,options)=>global.MaatApiClient.request(path,options);
function message(id,value){document.getElementById(id).textContent=value;}
function renderHistory(items){
 const list=document.getElementById('assessment-history');list.replaceChildren();
 if(!items.length){const li=document.createElement('li');li.textContent='No assessments saved yet.';list.append(li);return;}
 items.slice(-10).reverse().forEach(item=>{const li=document.createElement('li');li.textContent=[item.date,item.type.replaceAll('_',' '),item.value,item.unit,'(self-reported)'].join(' ');list.append(li);});
}
async function refresh(){
 const [profile,assessments]=await Promise.all([api('/api/me/rugby/profile'),api('/api/me/rugby/assessments')]);
 if(!profile.ok||!assessments.ok)throw Error('Could not load rugby records');
 const form=document.getElementById('rugby-profile');
 form.elements.club.value=profile.payload?.data?.club||'';
 form.elements.position.value=profile.payload?.data?.position||'';
 renderHistory(assessments.payload?.data||[]);
}
function init(){
 if(!global.MaatApiClient?.request){message('profile-status','Rugby records are temporarily unavailable.');return;}
 const profile=document.getElementById('rugby-profile'),assessment=document.getElementById('rugby-assessment');
 assessment.elements.date.value=new Date().toISOString().slice(0,10);
 profile.addEventListener('submit',async event=>{
  event.preventDefault();const button=profile.querySelector('button');button.disabled=true;
  try{const result=await api('/api/me/rugby/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({club:profile.elements.club.value,position:profile.elements.position.value})});if(!result.ok)throw Error('Profile save failed');message('profile-status','Profile saved.');}
  catch(_){message('profile-status','Could not save profile. Please try again.');}finally{button.disabled=false;}
 });
 assessment.addEventListener('submit',async event=>{
  event.preventDefault();const button=assessment.querySelector('button');button.disabled=true;
  try{const result=await api('/api/me/rugby/assessments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:assessment.elements.type.value,value:Number(assessment.elements.value.value),date:assessment.elements.date.value})});if(!result.ok)throw Error('Assessment save failed');message('assessment-status','Assessment saved.');await refresh();}
  catch(_){message('assessment-status','Could not save assessment. Please check the measurement and date.');}finally{button.disabled=false;}
 });
 refresh().catch(()=>{message('profile-status','Could not load saved profile.');message('assessment-status','Could not load assessment history.');});
}
global.RugbyRecords={init};
})(window);
