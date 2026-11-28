'use strict';
(()=>{
 const $=id=>document.getElementById(id);let revision=0,spoken='';
 async function request(path){
  const response=await window.MaatApiClient.request(path);
  if(!response.ok||response.payload?.ok!==true)throw Error(response.status===403?'Verified admin access is required.':response.status===401?'Please sign in to review athletes.':'Could not load saved athlete records. Please retry.');
  return response.payload.data;
 }
 const words=value=>String(value||'unknown').replaceAll('_',' ');
 function list(id,items){$(id).replaceChildren(...items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
 function clear(){revision++;$('result').hidden=true;spoken='';window.speechSynthesis?.cancel();}
 $('selection').addEventListener('change',clear);
 $('selection').addEventListener('submit',async event=>{
  event.preventDefault();clear();const selected=revision;$('review').disabled=true;$('status').textContent='Loading saved evidence…';
  try{
   const data=await request('/api/admin/rugby/athlete-reviews/'+encodeURIComponent($('athlete').value)+'?stageId='+encodeURIComponent($('stage').value));
   if(selected!==revision)return;
   const positionLine=data.positions?.primary?'Assessment menu positions: primary '+data.positions.primary+(data.positions.secondary?', secondary '+data.positions.secondary:'')+'.':'';
   $('athlete-name').textContent=data.athlete.name;$('summary').textContent=data.summary+(positionLine?' '+positionLine:'');
   const readiness='Readiness: '+words(data.readiness.status)+'. '+words(data.readiness.reason)+'.';$('readiness').textContent=readiness;
   const assessments=data.assessments.map(item=>item.measurement?words(item.measurement.type)+': '+item.measurement.value+' '+item.measurement.unit+', '+item.measurement.date+'. Coach review: '+words(item.review)+'.':'A linked measurement is unavailable and cannot be used.');
   for(const item of data.developmentAssessments||[]){
    const result=item.protocol.category==='physical'?item.value+' '+item.unit:Object.entries(item.observations).map(([key,value])=>words(key)+': '+words(value)).join('; ');
    const context=Object.entries(item.context||{}).map(([key,value])=>words(key)+': '+words(value)).join('; ');
    assessments.push(item.date+' · '+item.protocol.name+' · '+result+' · '+words(item.source)+' · pain: '+(item.pain===null?'unknown':item.pain?'yes':'no')+'. '+(item.combine?item.combine.name+' / '+item.combine.sessionName+'. ':'')+item.setupNotes+(context?' Context: '+context+'. Review required.':''));
   }
   $('capture-link').href='/rugby-assessments.html?athleteId='+encodeURIComponent(data.athlete.athleteId);
   if(!assessments.length)assessments.push('No linked assessment evidence recorded yet.');list('assessments',assessments);
   $('legacy').textContent=data.legacyAssessmentCount?data.legacyAssessmentCount+' older or unlinked assessment records remain outside this review.':'';
   const c=data.criteria;const criteria='Inspecting '+data.reviewTargetStage+'. Minimum score '+c.minimumScore+'. Observe on '+c.candidateMinimumDistinctDays+' different days across at least '+c.candidateMinimumSpanDays+' days. Dimensions: '+c.proposedDimensions.map(words).join(', ')+'. Contexts: '+c.candidateContexts.map(words).join(', ')+'.';
   $('criteria').textContent=criteria;list('gaps',data.gaps);
   spoken=[data.athlete.name,data.summary,positionLine,readiness,...assessments,criteria,'These are candidate requirements.',...data.gaps].join(' ');
   $('listen').hidden=!window.speechSynthesis;$('result').hidden=false;$('status').textContent='Review loaded from saved records. Athlete stage unchanged.';
  }catch(error){if(selected===revision)$('status').textContent=error.message;}finally{$('review').disabled=false;}
 });
 $('listen').addEventListener('click',()=>{window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(spoken));});
 request('/api/admin/rugby/athlete-reviews').then(athletes=>{
  for(const athlete of athletes){const option=document.createElement('option');option.value=athlete.athleteId;option.textContent=athlete.name;$('athlete').append(option);}
  $('selection').hidden=!athletes.length;$('status').textContent=athletes.length?'Choose an athlete and a stage to inspect.':'No saved Rugby athlete records yet. Save a profile or assessment in Rugby HQ first.';
 }).catch(error=>{$('status').textContent=error.message;});
})();
