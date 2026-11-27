'use strict';
(()=>{
 const $=id=>document.getElementById(id),form=$('editor'),status=$('status'),button=$('preview');
 const endpoint='/api/admin/rugby/policy-preview';
 let current=null;
 const fields=[['minimumScore','Minimum competency score',4,5],['candidateMinimumDistinctDays','Distinct observation days',2,365],['candidateMinimumSpanDays','Observation span (days)',1,365]];
 async function request(options={}){
  const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store',...options});
  if(!response.ok)throw Error(response.status===409?'Policy version changed. Reload before reviewing.':'Policy access or preview unavailable.');
  const result=await response.json();if(result.ok!==true||!result.data)throw Error('Invalid policy response');return result.data;
 }
 function render(data){
  if(!Number.isInteger(data.version)||!Array.isArray(data.policy?.stages)||data.policy.stages.length!==7)throw Error('Invalid policy response');
  current=data;$('version').textContent='Current version: '+data.version;
  for(const stage of data.policy.stages){
   const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=stage.id;group.append(legend);
   for(const [key,title,min,max] of fields){
    const label=document.createElement('label'),input=document.createElement('input');label.textContent=title+' (current: '+stage[key]+')';input.type='number';input.min=min;input.max=max;input.step=1;input.required=true;input.value=stage[key];input.name=stage.id+':'+key;label.append(input);group.append(label);
   }
   for(const [key,title] of [['proposedDimensions','Competency dimensions'],['candidateContexts','Observation contexts']]){
    const label=document.createElement('label'),input=document.createElement('textarea');label.textContent=title+' (one per line)';input.required=true;input.value=stage[key].join('\n');input.name=stage.id+':'+key;label.append(input);group.append(label);
   }
   $('stages').append(group);
  }
  form.hidden=false;status.textContent='Candidate policy loaded. Changes remain drafts.';
 }
 form.addEventListener('input',()=>{$('result').hidden=true;});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!current||button.disabled)return;button.disabled=true;$('result').hidden=true;
  try{
   const policy=structuredClone(current.policy);
   for(const stage of policy.stages){
    for(const [key] of fields)stage[key]=Number(form.elements.namedItem(stage.id+':'+key).value);
    for(const key of ['proposedDimensions','candidateContexts'])stage[key]=form.elements.namedItem(stage.id+':'+key).value.split('\n').map(x=>x.trim()).filter(Boolean);
   }
   const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policy,expectedVersion:current.version,reason:$('reason').value})});
   if(result.published!==false||result.stageChangeAuthorized!==false||!Array.isArray(result.changes))throw Error('Unsafe preview response');
   $('changes').textContent=result.changes.length?result.changes.map(x=>x.stageId+' · '+x.field+'\n'+JSON.stringify(x.before)+' → '+JSON.stringify(x.after)).join('\n\n'):'No changes.';
   $('result').hidden=false;status.textContent='Preview only. Nothing published.';
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
 });
 request().then(render).catch(()=>{status.textContent='Owner policy access unavailable. No policy data loaded.';form.hidden=true;});
})();
