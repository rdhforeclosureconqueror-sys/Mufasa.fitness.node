'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../public/rugby-athlete-review.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function page(request){
 const elements={};
 function element(){return {hidden:true,value:'',textContent:'',children:[],handlers:{},append(child){this.children.push(child);},replaceChildren(...children){this.children=children;},addEventListener(event,handler){this.handlers[event]=handler;}};}
 const document={getElementById(id){return elements[id]??=element();},createElement:element,createTextNode:element,querySelector(){return {prepend(){}};}};
 for(const match of fs.readFileSync(require.resolve('../public/rugby-athlete-review.html'),'utf8').matchAll(/id="([^"]+)"/g))document.getElementById(match[1]);
 const spoken=[];const window={MaatApiClient:{request},speechSynthesis:{cancel(){},speak(value){spoken.push(value.text);}}};
 vm.runInNewContext(source,{document,window,SpeechSynthesisUtterance:function(text){this.text=text;}});
 return {elements,spoken};
}
const success=data=>({ok:true,payload:{ok:true,data}});
test('review loads actual response, renders text safely and speaks the same evidence',async()=>{
 const data={athlete:{name:'<script>athlete</script>'},summary:'Review active',readiness:{status:'HOLD',reason:'missing_history'},assessments:[{measurement:{type:'sprint_10m',value:2,unit:'seconds',date:'2026-11-27'},review:'unverified'}],legacyAssessmentCount:0,criteria:{minimumScore:4,candidateMinimumDistinctDays:2,candidateMinimumSpanDays:1,proposedDimensions:['control'],candidateContexts:['basic_control']},reviewTargetStage:'BM-01',gaps:['Coach observation needed']};
 const p=page(async path=>success(path.includes('?')?data:[{athleteId:'a',name:'Athlete'}]));await tick();
 p.elements.athlete.value='a';p.elements.stage.value='BM-01';await p.elements.selection.handlers.submit({preventDefault(){}});
 assert.equal(p.elements.result.hidden,false);assert.equal(p.elements['athlete-name'].textContent,data.athlete.name);
 assert.match(p.elements.assessments.children[0].textContent,/2 seconds/);
 p.elements.listen.handlers.click();assert.match(p.spoken[0],/Coach observation needed/);
});
test('authorization failures expose no review; empty roster has an actionable message',async()=>{
 const denied=page(async()=>({ok:false,status:403}));await tick();assert.match(denied.elements.status.textContent,/admin/);assert.equal(denied.elements.selection.hidden,true);
 const empty=page(async()=>success([]));await tick();assert.equal(empty.elements.selection.hidden,true);assert.match(empty.elements.status.textContent,/Save a profile/);
});
test('switching selection while a request is pending prevents stale evidence display',async()=>{
 let resolve;const p=page(path=>path.includes('?')?new Promise(done=>{resolve=done;}):Promise.resolve(success([{athleteId:'a',name:'A'}])));await tick();
 p.elements.athlete.value='a';p.elements.stage.value='BM-01';const pending=p.elements.selection.handlers.submit({preventDefault(){}});
 p.elements.selection.handlers.change();resolve(success({}));await pending;
 assert.equal(p.elements.result.hidden,true);assert.equal(p.elements.review.disabled,false);
});
