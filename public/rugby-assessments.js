'use strict';
(()=>{
 const $=id=>document.getElementById(id);let catalog,revision=0,pendingSubmission=null,positionRevision=0,contextInputs={},savedRecords=[],bindingCandidateId=null;
 const words=value=>String(value).replaceAll('_',' ');
 async function api(path,body){
  await window.RugbyWorkspaceSession.require();
  const response=await window.MaatApiClient.request(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  if(!response.ok||response.payload?.ok!==true)throw Error(response.payload?.error?.message||(response.status===401?'Please sign in first.':'Could not access assessment records.'));
  return response.payload.data;
 }
 function option(value,label){const item=document.createElement('option');item.value=value;item.textContent=label;return item;}
 function endpoint(){return $('capture-athlete').value?'/api/admin/rugby/athletes/'+encodeURIComponent($('capture-athlete').value)+'/assessment-records':'/api/me/rugby/assessment-records';}
 function positionEndpoint(){return endpoint().replace('assessment-records','assessment-positions');}
 function relevantIds(){
  const selected=[$('capture-primary').value,$('capture-secondary').value].filter(Boolean).map(Number);
  if(!selected.length)return new Set((catalog.candidateAssessments||[]).map(item=>item.id));
  return new Set((catalog.positionProfiles||[]).filter(profile=>selected.includes(profile.number)).flatMap(profile=>[...profile.assessmentIds,...Object.values(profile.alternatives).flat()]));
 }
 function renderCandidate(){
  const candidate=(catalog.candidateAssessments||[]).find(item=>item.id===$('framework-candidate').value);if(!candidate)return;
  if(bindingCandidateId!==candidate.id){$('binding-setup').value='';bindingCandidateId=candidate.id;}
  $('candidate-guide').href='/rugby-assessment-guides/'+encodeURIComponent(candidate.id)+'.html';
  $('candidate-procedure').textContent=candidate.name+'. '+candidate.procedure;
  $('candidate-validity').replaceChildren(...candidate.validityCriteria.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('candidate-stop').textContent=candidate.stopRule;
  const bindings=catalog.protocols.filter(item=>item.candidateId===candidate.id);
  $('candidate-bindings').textContent=bindings.length?bindings.length+' local capture procedure(s) registered. Select one in the test dropdown below.':'No exact local procedure registered. Existing similarly named tests do not establish procedure equivalence.';
  $('binding-name').value=candidate.name;$('binding-form').hidden=!catalog.canConfigure;
 }
 function renderPositionMenu(){
  const primary=$('capture-primary').value,secondary=$('capture-secondary').value;
  $('position-guide').href=primary?'/rugby-positions/'+encodeURIComponent(primary)+'.html':'/rugby-learning.html#positions';
  $('secondary-guide').hidden=!secondary;$('secondary-guide').href=secondary?'/rugby-positions/'+encodeURIComponent(secondary)+'.html':'/rugby-learning.html#positions';
  const previous=$('framework-candidate').value,ids=relevantIds();
  $('framework-candidate').replaceChildren(...(catalog.candidateAssessments||[]).filter(item=>ids.has(item.id)).map(item=>option(item.id,item.name+' · '+item.mode)));
  if(ids.has(previous))$('framework-candidate').value=previous;
  const requested=new URLSearchParams(location.search).get('candidateId');
  if(!previous&&requested&&ids.has(requested))$('framework-candidate').value=requested;
  const selected=[$('capture-primary').value,$('capture-secondary').value].filter(Boolean).map(Number);
  $('position-demands').textContent=(catalog.positionProfiles||[]).filter(profile=>selected.includes(profile.number)).map(profile=>profile.number+' · '+profile.name+': '+profile.demands.join('; ')).join(' | ')||'All positions shown. Relevant menus are options, not a requirement to perform every test.';
  renderCandidate();renderProtocols();
 }
 async function loadPositions(){
  const selected=++positionRevision,path=positionEndpoint();const saved=await api(path);if(selected!==positionRevision)return;
  $('capture-primary').value=saved.primary?String(saved.primary):'';$('capture-secondary').value=saved.secondary?String(saved.secondary):'';renderPositionMenu();
 }
 function renderContext(protocol){
  contextInputs={};$('context-fields').replaceChildren();$('context-fields').hidden=!protocol.candidateId;if(!protocol.candidateId)return;
  const heading=document.createElement('p');heading.textContent='Record actual context. These entries require review and do not authorize contact or progression.';$('context-fields').append(heading);
  function field(key,labelText,values){
   const label=document.createElement('label'),control=document.createElement(values?'select':'input');label.textContent=labelText;control.dataset.context=key;control.required=key!=='clipRef';control.maxLength=key==='conditions'?1000:key==='role'||key==='supervisor'?100:300;
   if(values)for(const value of values)control.append(option(value,words(value)));
   label.append(control);$('context-fields').append(label);contextInputs[key]=control;return control;
  }
  const position=field('position','Position observed',['',...(catalog.positionProfiles||[]).map(profile=>String(profile.number))]);position.value=$('capture-primary').value;
  field('role','Actual role / task');field('side','Side / shoulder',['unknown','left','right','bilateral','not_applicable']);
  field('environment','Environment',['training','gym','field','match','simulator','other']);field('pressure','Pressure',['unknown','unopposed','controlled','live']);field('readiness','Reported readiness',['unknown','fresh','normal','fatigued','pain']);field('conditions','Equipment, surface, approach and setup conditions');
  if(protocol.observationKeys?.includes('development_state'))for(const key of ['prompts','behavior','decision','execution','outcome','clipRef'])field(key,words(key)+(key==='clipRef'?' (optional reference)':' · enter not assessed if unknown'));
  if(protocol.candidateSnapshot.contact){field('supervisor','Supervisor name (or not recorded)');field('supervision','Supervision evidence',['not_established','qualified_reported']);field('contactLevel','Contact level',['unknown','no_contact','walkthrough','controlled','live']);field('space','Space / equipment / environment');field('prerequisites','Prerequisites observed',['not_assessed','not_demonstrated','demonstrated']);}
 }
 function renderCorrections(){
  const superseded=new Set(savedRecords.map(record=>record.supersedes).filter(Boolean));
  $('capture-correction').replaceChildren(option('','New result'),...savedRecords.filter(record=>record.protocol.id===$('capture-protocol').value&&!superseded.has(record.id)).map(record=>option(record.id,'Correct '+record.date+' · trial '+record.trial+' · '+record.id)));
 }
 function renderProtocol(){
  const protocol=catalog.protocols.find(item=>item.id===$('capture-protocol').value);if(!protocol)return;
  const movement=protocol.category!=='physical';$('protocol-setup').textContent=protocol.setup+(protocol.candidateSnapshot?' '+protocol.candidateSnapshot.validityCriteria.join(' ')+' '+protocol.candidateSnapshot.stopRule:'');$('physical-fields').hidden=movement;$('movement-fields').hidden=!movement;$('capture-value').required=!movement;$('capture-value').disabled=movement;$('capture-value').value='';$('capture-unit').textContent=protocol.unit||'';
  $('movement-fields').replaceChildren();
  for(const key of protocol.observationKeys||[]){const label=document.createElement('label'),select=document.createElement('select');label.textContent=words(key);select.dataset.observation=key;for(const value of protocol.observationValues?.[key]||['not_assessed','observed','not_observed'])select.append(option(value,words(value)));label.append(select);$('movement-fields').append(label);}
  renderContext(protocol);
  renderCorrections();
 }
 function renderProtocols(){
  const combine=catalog.combines.find(item=>item.id===$('capture-combine').value);
  $('session-label').hidden=!combine;$('capture-session').required=!!combine;if(!combine)$('capture-session').value='';
  const relevant=relevantIds();
  $('capture-protocol').replaceChildren(...catalog.protocols.filter(item=>combine?combine.protocolIds.includes(item.id):!item.candidateId||relevant.has(item.candidateId)).map(item=>option(item.id,item.name+' · '+item.category)));renderProtocol();
 }
 async function loadCatalog(){
  catalog=await api('/api/me/rugby/assessment-catalog');
  const primary=$('capture-primary').value,secondary=$('capture-secondary').value;
  for(const id of ['capture-primary','capture-secondary'])$(id).replaceChildren(option('','Not specified'),...(catalog.positionProfiles||[]).map(profile=>option(String(profile.number),profile.number+' · '+profile.name)));
  $('capture-primary').value=primary;$('capture-secondary').value=secondary;
  $('capture-combine').replaceChildren(option('','Standalone assessment'),...catalog.combines.map(item=>option(item.id,item.name)));
  $('combine-tests').replaceChildren();
  for(const protocol of catalog.protocols){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=protocol.id;label.append(input,document.createTextNode(protocol.name));$('combine-tests').append(label);}
  $('configuration').hidden=!catalog.canConfigure;renderPositionMenu();
 }
 function describe(record){
  const result=record.protocol.category==='physical'?record.value+' '+record.unit:Object.entries(record.observations).map(([key,value])=>words(key)+': '+words(value)).join('; ');
  return [record.date,record.protocol.name,result,'trial '+record.trial,words(record.source),'pain: '+(record.pain===null?'unknown':record.pain?'yes':'no'),record.combine?record.combine.name+' / '+record.combine.sessionName:'Standalone assessment',record.setupNotes,...Object.entries(record.context||{}).map(([key,value])=>words(key)+': '+words(value))].join(' · ');
 }
 async function history(){
  const selected=++revision,path=endpoint();$('capture-history').replaceChildren();
  const records=await api(path);if(selected!==revision)return records;savedRecords=records;renderCorrections();
  const superseded=new Set(records.map(record=>record.supersedes).filter(Boolean));
  const items=records.length?records.slice().reverse().map(record=>(superseded.has(record.id)?'Superseded historical result · ':'')+(record.supersedes?'Correction · ':'')+describe(record)):['No movement or physical assessment records saved through this workflow yet.'];
  $('capture-history').replaceChildren(...items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));return records;
 }
 $('capture-combine').addEventListener('change',renderProtocols);$('capture-protocol').addEventListener('change',renderProtocol);
 $('capture-athlete').addEventListener('change',()=>{savedRecords=[];pendingSubmission=null;$('capture-primary').value='';$('capture-secondary').value='';$('capture-value').value='';$('capture-notes').value='';$('capture-pain').value='unknown';$('capture-trial').value='1';renderPositionMenu();history().catch(error=>{$('status').textContent=error.message;});loadPositions().catch(error=>{$('position-status').textContent=error.message;});});
 $('capture-correction').addEventListener('change',()=>{
  const record=savedRecords.find(record=>record.id===$('capture-correction').value);if(!record)return;
  $('capture-combine').value=record.combine?.id||'';renderProtocols();$('capture-protocol').value=record.protocol.id;renderProtocol();$('capture-correction').value=record.id;$('capture-session').value=record.combine?.sessionName||'';
  $('capture-date').value=record.date;$('capture-trial').value=String(record.trial);$('capture-pain').value=record.pain===null?'unknown':record.pain?'yes':'no';$('capture-notes').value=record.setupNotes;
  if(record.protocol.category==='physical')$('capture-value').value=String(record.value);
  for(const select of $('movement-fields').querySelectorAll('select'))select.value=record.observations?.[select.dataset.observation]||'not_assessed';
  for(const [key,input] of Object.entries(contextInputs))input.value=String(record.context?.[key]??'');
 });
 for(const id of ['capture-primary','capture-secondary'])$(id).addEventListener('change',renderPositionMenu);
 $('framework-candidate').addEventListener('change',renderCandidate);
 $('position-form').addEventListener('submit',async event=>{
  event.preventDefault();const path=positionEndpoint(),target=$('capture-athlete').value,button=event.currentTarget.querySelector('button');button.disabled=true;
  try{const value={primary:Number($('capture-primary').value),secondary:$('capture-secondary').value?Number($('capture-secondary').value):null};await api(path,value);const saved=await api(path);if(saved.primary!==value.primary||saved.secondary!==value.secondary)throw Error('Position readback failed');if(target===$('capture-athlete').value)$('position-status').textContent='Position preferences saved and read back. No participation or stage assigned.';}
  catch(error){$('position-status').textContent=error.message;}finally{button.disabled=false;}
 });
 $('capture-form').addEventListener('submit',async event=>{
  event.preventDefault();$('save-capture').disabled=true;$('capture-athlete').disabled=true;
  try{
   const protocol=catalog.protocols.find(item=>item.id===$('capture-protocol').value);
   const body={protocolId:protocol.id,date:$('capture-date').value,trial:Number($('capture-trial').value),pain:$('capture-pain').value==='unknown'?null:$('capture-pain').value==='yes',setupNotes:$('capture-notes').value};
   if(protocol.category==='physical')body.value=Number($('capture-value').value);
   else body.observations=Object.fromEntries([...$('movement-fields').querySelectorAll('select')].map(select=>[select.dataset.observation,select.value]));
   if(protocol.candidateId)body.context=Object.fromEntries(Object.entries(contextInputs).map(([key,control])=>[key,key==='position'?Number(control.value):control.value]));
   if($('capture-correction').value)body.supersedes=$('capture-correction').value;
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
 $('binding-form').addEventListener('submit',event=>{event.preventDefault();saveConfig(event.currentTarget,{kind:'candidate_capture',candidateId:$('framework-candidate').value,name:$('binding-name').value,setup:$('binding-setup').value});});
 const today=new Date();$('capture-date').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 (async()=>{
  try{await loadCatalog();if(catalog.canConfigure){const athletes=await api('/api/admin/rugby/athlete-reviews');for(const athlete of athletes)$('capture-athlete').append(option(athlete.athleteId,athlete.name+' · admin recording'));const target=new URLSearchParams(location.search).get('athleteId');if(athletes.some(athlete=>athlete.athleteId===target))$('capture-athlete').value=target;}
   await loadPositions();await history();$('workspace').hidden=false;$('status').textContent='Movement, physical and rugby-skill capture is active.';
  }catch(error){$('status').textContent=error.message;}
 })();
})();
