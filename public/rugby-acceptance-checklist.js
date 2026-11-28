'use strict';
(()=>{
 const key='rugby-hq-personal-checklist-v1';
 const steps=[
  ['signin','Open Assessments and combines while signed in. Confirm it loads without an authorization error.'],
  ['position','Save a primary and optional secondary rugby position. Refresh and confirm both remain.'],
  ['menus','Change the primary position and confirm the relevant assessment menu changes. Restore your intended position.'],
  ['procedure','As admin, register a clearly labelled practice assessment procedure. Confirm it appears in the entry dropdown.'],
  ['physical','Save a physical test result with its actual unit, date, trial and setup. Reload and confirm the same values appear.'],
  ['movement','Save a movement assessment or structured rugby observation. Confirm each observation and context survives reloading.'],
  ['combine','Save a result against a named combine and session. Confirm the review retains that context.'],
  ['review','Open Athlete review for the same athlete. Confirm the new records appear and the older pilot entries are not presented as trusted evidence.'],
  ['correction','Correct a practice result. Confirm history retains the original and the current review uses the replacement.'],
  ['priority','Open Development priorities. Select supporting records, a development question, your finding, reasoning, alternative explanation and retest plan. Save a working priority.'],
  ['readback','Reload Development priorities. Confirm your saved reasoning, supporting records and selected exercise options remain. Confirm it has not assigned a workout or changed a stage.'],
  ['audio','In Athlete review, tap Read this review aloud. Confirm speech works on your device and describes the records you selected.'],
  ['mobile','On your phone, scroll every section and use the buttons. Confirm Debug does not cover the last controls.']
 ];
 let checked={},persistent=true;try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))checked=saved;}catch{persistent=false;}
 const inputs=[];const progress=()=>{document.getElementById('progress').textContent=inputs.filter(input=>input.checked).length+' of '+steps.length+' checked. '+(persistent?'Saved in this browser.':'Browser storage unavailable; ticks last only while this page stays open.');};
 function save(){try{localStorage.setItem(key,JSON.stringify(Object.fromEntries(inputs.map(input=>[input.value,input.checked]))));}catch{persistent=false;}progress();}
 for(const [id,description] of steps){const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='checkbox';input.value=id;input.checked=checked[id]===true;span.textContent=description;label.append(input,span);inputs.push(input);input.addEventListener('change',save);document.getElementById('checks').append(label);}
 document.getElementById('reset').addEventListener('click',()=>{for(const input of inputs)input.checked=false;save();});progress();
})();
