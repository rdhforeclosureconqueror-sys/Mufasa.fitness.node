import {translateClassification} from './muscle-translation.mjs?rev=1490';
import {getActivation} from './activation-registry.mjs';
import {mountPremiumModel,MODEL_IDS} from './premium-adapter.mjs?rev=1490';
const $=id=>document.getElementById(id);
const samples={Push:{pectoralis_major:'primary',anterior_deltoid:'secondary',triceps_brachii:'secondary',rectus_abdominis:'stabilizer'},Pull:{latissimus_dorsi:'primary',biceps_brachii:'secondary'},Legs:{rectus_femoris:'primary',gluteus_maximus:'primary',gastrocnemius:'secondary'},Missing:{}};
let active;
const exerciseMode=new URLSearchParams(location.search).get('mode')==='exercise';
const params=new URLSearchParams(location.search);const experimental=exerciseMode&&params.get('experimental')==='1';let candidate=null;let groupMode=false;
if(exerciseMode){if(MODEL_IDS.includes(params.get('model')))$('model').value=params.get('model');if(['both','anterior','posterior'].includes(params.get('view')))$('view').value=params.get('view');$('models').dataset.view=$('view').value;$('sample').value='Missing';$('sample').disabled=true;$('sample').closest('label').style.display='none';}
function clear(){document.querySelectorAll('path.selected').forEach(n=>n.classList.remove('selected'));$('selection').textContent='Select a muscle';}
function render(){
 active?.dispose();active=undefined;clear();
 const model=$('model').value,key=exerciseMode?'Missing':$('sample').value;
 if(!MODEL_IDS.includes(model)||!Object.hasOwn(samples,key))throw Error('Invalid preview option');
 $('models').dataset.model=model;
 const figures=['anterior','posterior'].map(view=>document.querySelector('figure[data-model="'+model+'"][data-view="'+view+'"] svg'));
 if(figures.some(n=>!n))throw Error('Missing model artwork');
 const mappings=candidate?.candidates?.length?candidate.candidates:Object.entries(samples[key]).map(([muscleId,role])=>({muscleId,role,side:'bilateral'}));
 active=mountPremiumModel(figures,mappings,mappings.length?'unverified':'missing',r=>{
 clear();for(const svg of figures)for(const n of svg.querySelectorAll('[data-region-id]'))if(n.dataset.regionId===r.id)n.classList.add('selected');
 $('selection').textContent=r.muscleId.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())+' — '+r.side+' / '+r.role+(groupMode?' (group approximation)':' (unverified)');
 });
 if($('diagnostics'))$('diagnostics').textContent=JSON.stringify({status:active.result.status,issues:active.result.issues,regionCount:active.result.regions.length},null,2);
}
function safeRender(){try{render();const count=active.result.regions.filter(r=>['primary','secondary','stabilizer'].includes(r.role)).length;$('render-status').textContent=experimental?(count?count+' regions highlighted — approximate muscle groups.':'No mapped regions — check classification input.'):'Neutral or standalone preview: '+count+' highlighted regions.';}catch(e){$('selection').textContent='Preview failed: '+e.message;$('render-status').textContent=$('selection').textContent;}}
$('model').addEventListener('change',safeRender);$('sample').addEventListener('change',safeRender);
$('view').addEventListener('change',()=>{clear();$('models').dataset.view=$('view').value;});
$('trace').addEventListener('change',()=> $('models').classList.toggle('trace',$('trace').checked));
if(experimental){const row=Object.fromEntries(['primaryMuscles','secondaryMuscles','stabilizers'].map(key=>[key,params.getAll(key)]));const translated=translateClassification(row);candidate={candidates:translated.candidates.flatMap(g=>g.muscleIds.map(muscleId=>({muscleId,role:g.role,side:'unspecified'})))};groupMode=true;}safeRender();
