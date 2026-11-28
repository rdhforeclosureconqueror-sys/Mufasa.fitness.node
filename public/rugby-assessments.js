'use strict';
(()=>{
 const $=id=>document.getElementById(id);let catalog,revision=0,pendingSubmission=null;
 const words=value=>String(value).replaceAll('_',' ');
 async function api(path,body){
  const response=await window.MaatApiClient.request(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  if(!response.ok||response.payload?.ok!==true)throw Error(response.payload?.error?.message||(response.status===401?'Please sign in first.':'Could not access assessment records.'));
  return response.payload.data;
 }
 function option(value,label){const item=document.createElement('option');item.value=value;item.textContent=label;return item;}
 function endpoint(){return $('capture-athlete').value?'/api/admin/rugby/athletes/'+encodeURIComponent($('capture-athlete').value)+'/assessment-records':'/api/me/rugby/assessment-records';}
 function renderProtocol(){
  const protocol=catalog.protocols.find(item=>item.id===$('capture-protocol').value);if(!protocol)return;
  const movement=protocol.category==='movement';$('protocol-setup').textContent=protocol.setup;$('physical-fields').hidden=movement;$('movement-fields').hidden=!movement;$('capture-value').required=!movement;$('capture-value').disabled=movement;$('capture-value').value='';$('capture-unit').textContent=protocol.unit||'';
  $('movement-fields').replaceChildren();
  for(const key of protocol.observationKeys||[]){const label=document.createElement('label'),select=document.createElement('select');label.textContent=words(key);select.dataset.observation=key;for(const value of protocol.observationValues?.[key]||['not_assessed','observed','not_observed'])select.append(option(value,words(value)));label.append(select);$('movement-fields').append(label);}
 }
 function renderProtocols(){
  const combine=catalog.combines.find(item=>item.id===$('capture-combine').value);
  $('session-label').hidden=!combine;$('capture-session').required=!!combine;if(!combine)$('capture-session').value='';
  $('capture-protocol').replaceChildren(...catalog.protocols.filter(item=>!combine||combine.protocolIds.includes(item.id)).map(item=>option(item.id,item.name+' · '+item.category)));renderProtocol();
 }
 async function loadCatalog(){
  catalog=await api('/api/me/rugby/assessment-catalog');
  $('capture-combine').replaceChildren(option('','Standalone assessment'),...catalog.combines.map(item=>option(item.id,item.name)));
  $('combine-tests').replaceChildren();
  for(const protocol of catalog.protocols){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=protocol.id;label.append(input,document.createTextNode(protocol.name));$('combine-tests').append(label);}
  $('configuration').hidden=!catalog.canConfigure;renderProtocols();
 }
 function describe(record){
  const result=record.protocol.category==='physical'?record.value+' '+record.unit:Object.entries(record.observations).map(([key,value])=>words(key)+': '+words(value)).join('; ');
  return [record.date,record.protocol.name,result,'trial '+record.trial,words(record.source),'pain: '+(record.pain===null?'unknown':record.pain?'yes':'no'),record.combine?record.combine.name+' / '+record.combine.sessionName:'Standalone assessment',record.setupNotes].join(' · ');
 }
 async function history(){
  const selected=++revision,path=endpoint();$('capture-history').replaceChildren();
  const records=await api(path);if(selected!==revision)return records;
  const items=records.length?records.slice().reverse().map(describe):['No movement or physical assessment records saved through this workflow yet.'];
  $('capture-history').replaceChildren(...items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));return records;
 }
 $('capture-combine').addEventListener('change',renderProtocols);$('capture-protocol').addEventListener('change',renderProtocol);
 $('capture-athlete').addEventListener('change',()=>{history().catch(error=>{$('status').textContent=error.message;});});
 $('capture-form').addEventListener('submit',async event=>{
  event.preventDefault();$('save-capture').disabled=true;$('capture-athlete').disabled=true;
  try{
   const protocol=catalog.protocols.find(item=>item.id===$('capture-protocol').value);
   const body={protocolId:protocol.id,date:$('capture-date').value,trial:Number($('capture-trial').value),pain:$('capture-pain').value==='unknown'?null:$('capture-pain').value==='yes',setupNotes:$('capture-notes').value};
   if(protocol.category==='physical')body.value=Number($('capture-value').value);
   else body.observations=Object.fromEntries([...$('movement-fields').querySelectorAll('select')].map(select=>[select.dataset.observation,select.value]));
   if($('capture-combine').value){body.combineId=$('capture-combine').value;body.sessionName=$('capture-session').value;}
   const fingerprint=endpoint()+JSON.stringify(body);
   if(pendingSubmission?.fingerprint!==fingerprint)pendingSubmission={fingerprint,requestId:crypto.randomUUID()};
   body.requestId=pendingSubmission.requestId;
   const saved=await api(endpoint(),body);const records=await history();if(!records.some(record=>record.id===saved.id))throw Error('Save returned but assessment readback could not be verified.');
   pendingSubmission=null;
   $('status').textContent='Assessment saved and read back from the athlete record. It is available in the admin athlete review.';
  }catch(error){$('status').textContent=error.message;}finally{$('save-capture').disabled=false;$('capture-athlete').disabled=false;}
 });
 async function saveConfig(form,body){
  const button=form.querySelector('button');button.disabled=true;
  try{const saved=await api('/api/admin/rugby/assessment-catalog',body);await loadCatalog();if(![...catalog.protocols,...catalog.combines].some(item=>item.id===saved.id))throw Error('Definition readback could not be verified.');$('config-status').textContent='Definition saved and verified. Select it in the assessment form above.';}
  catch(error){$('config-status').textContent=error.message;}finally{button.disabled=false;}
 }
 $('protocol-form').addEventListener('submit',event=>{event.preventDefault();saveConfig(event.currentTarget,{kind:'physical_test',name:$('new-protocol-name').value,unit:$('new-protocol-unit').value,setup:$('new-protocol-setup').value});});
 $('combine-form').addEventListener('submit',event=>{event.preventDefault();saveConfig(event.currentTarget,{kind:'combine',name:$('new-combine-name').value,setup:$('new-combine-setup').value,protocolIds:[...$('combine-tests').querySelectorAll('input:checked')].map(input=>input.value)});});
 const today=new Date();$('capture-date').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 (async()=>{
  try{await loadCatalog();if(catalog.canConfigure){const athletes=await api('/api/admin/rugby/athlete-reviews');for(const athlete of athletes)$('capture-athlete').append(option(athlete.athleteId,athlete.name+' · admin recording'));const target=new URLSearchParams(location.search).get('athleteId');if(athletes.some(athlete=>athlete.athleteId===target))$('capture-athlete').value=target;}
   await history();$('workspace').hidden=false;$('status').textContent='Movement and physical assessment capture is active.';
  }catch(error){$('status').textContent=error.message;}
 })();
})();
