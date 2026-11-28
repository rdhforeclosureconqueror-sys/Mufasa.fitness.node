'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
const {createAssessmentCapture}=require('../src/rugby/assessmentCapture');
const {createAuthorizationResolver,parseAuthorizationConfig}=require('../src/lib/authorization');
const source=fs.readFileSync(require.resolve('../public/rugby-assessments.js'),'utf8');
const html=fs.readFileSync(require.resolve('../public/rugby-assessments.html'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function page({denied=false,failReadback=false}={}){
 const elements={},users={owner:{userId:'owner'},athlete:{userId:'athlete',rugbyProfile:{position:'wing'}}},requests=[];
 const actor={userId:'owner',email:'admin@example.test',provider:'firebase',providerVerified:true};
 const service=createAssessmentCapture({userStore:{listUsers:()=>Object.values(users),loadUser:id=>structuredClone(users[id]||{userId:id}),updateUser(id,fn){users[id]=fn(structuredClone(users[id]||{userId:id}));}},authorizationResolver:createAuthorizationResolver(parseAuthorizationConfig({ADMIN_EMAILS:actor.email})),now:()=>new Date().toISOString()});
 function element(tag='div'){
  return {tag,hidden:true,value:'',children:[],dataset:{},handlers:{},disabled:false,checked:false,textContent:'',
   append(...children){this.children.push(...children);if(this.tag==='select'&&this.children.length===children.length)this.value=children[0]?.value||'';},
   replaceChildren(...children){this.children=children;if(this.tag==='select')this.value=children[0]?.value||'';},
   addEventListener(event,handler){this.handlers[event]=handler;},
   querySelector(){return this.button??=element('button');},
   querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...(child.children||[])]);return all.filter(child=>selector==='select'?child.tag==='select':child.tag==='input'&&child.checked);}
  };
 }
 const document={getElementById:id=>elements[id],createElement:element,createTextNode:text=>({textContent:text})};
 for(const match of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g))elements[match[2]]=element(match[1]);
 elements['capture-athlete'].append(element('option'));
 elements['capture-trial'].value='1';elements['capture-pain'].value='unknown';elements['new-protocol-unit'].value='seconds';
 let posted=false;
 const window={RugbyWorkspaceSession:{require:async()=>({ok:true})},MaatApiClient:{request:async(path,options)=>{
  requests.push({path,options});if(denied)return {ok:false,status:403,payload:{error:{message:'Verified sign-in required'}}};
  try{
   let data;
   if(path==='/api/me/rugby/assessment-catalog')data=service.catalog(actor);
   else if(path==='/api/admin/rugby/athlete-reviews')data=[{athleteId:'athlete',name:'Athlete'}];
   else if(path==='/api/admin/rugby/assessment-catalog')data=service.configure(actor,JSON.parse(options.body));
   else if(path.endsWith('/assessment-positions')){
    const id=path.includes('/athletes/')?path.split('/')[5]:actor.userId;
    data=options?.method==='POST'?service.savePositions(actor,id,JSON.parse(options.body)):service.getPositions(actor,id);
   }
   else{
    const id=path.includes('/athletes/')?path.split('/')[5]:actor.userId;
    if(options?.method==='POST'){posted=true;data=service.record(actor,id,JSON.parse(options.body));}
    else if(failReadback&&posted)throw Error('Readback unavailable');
    else data=service.read(actor,id);
   }
   return {ok:true,payload:{ok:true,data}};
  }catch(error){return {ok:false,status:error.status||500,payload:{error:{message:error.message}}};}
 }}};
 vm.runInNewContext(source,{document,window,Date,URLSearchParams,location:{search:''},crypto:{randomUUID}});
 return {elements,users,requests,service,actor,submit:async id=>{await elements[id].handlers.submit({preventDefault(){},currentTarget:elements[id]});await tick();}};
}
test('physical and movement capture save through the actual service and read back into history',async()=>{
 const p=page();await tick();assert.equal(p.elements.workspace.hidden,false);
 const e=p.elements;e['capture-value'].value='2.2';e['capture-notes'].value='Standing start, stopwatch, dry grass.';
 await p.submit('capture-form');assert.equal(p.users.owner.rugbyAssessmentRecords[0].value,2.2);assert.match(e.status.textContent,/saved and read back/);
 e['capture-protocol'].value='overhead_squat';e['capture-protocol'].handlers.change();assert.equal(e['capture-value'].disabled,true);
 await p.submit('capture-form');assert.equal(p.users.owner.rugbyAssessmentRecords[1].protocol.category,'movement');assert.match(e['capture-history'].children[0].textContent,/squat_depth|squat depth/);
});
test('admin configures a new physical test and combine and sees them in capture selectors',async()=>{
 const p=page();await tick();const e=p.elements;e['new-protocol-name'].value='Vertical jump';e['new-protocol-unit'].value='cm';e['new-protocol-setup'].value='Record reach and jump method consistently.';
 await p.submit('protocol-form');assert.match(e['config-status'].textContent,/saved and verified/);
 const selected=e['combine-tests'].children.find(label=>label.children[1].textContent==='Vertical jump').children[0];selected.checked=true;
 e['new-combine-name'].value='Pre-season combine';e['new-combine-setup'].value='Use identical equipment for repeat testing.';
 await p.submit('combine-form');assert.equal(e['capture-combine'].children[1].textContent,'Pre-season combine');
 e['capture-combine'].value=e['capture-combine'].children[1].value;e['capture-combine'].handlers.change();assert.equal(e['capture-protocol'].children.length,1);assert.match(e['capture-protocol'].children[0].textContent,/Vertical jump/);assert.equal(e['capture-session'].required,true);
});
test('readback failures are not presented as successful saves; retry does not duplicate the persisted record',async()=>{
 const p=page({failReadback:true});await tick();p.elements['capture-value'].value='2';p.elements['capture-notes'].value='Standing start, dry grass.';
 await p.submit('capture-form');assert.match(p.elements.status.textContent,/Readback unavailable/);
 await p.submit('capture-form');assert.equal(p.users.owner.rugbyAssessmentRecords.length,1);assert.equal(p.elements['save-capture'].disabled,false);
});
test('denied access keeps the workspace hidden and renders an actionable error',async()=>{
 const p=page({denied:true});await tick();assert.equal(p.elements.workspace.hidden,true);assert.match(p.elements.status.textContent,/Verified sign-in required/);
});
test('position preferences save through the service and filter relevant primary/secondary menus',async()=>{
 const p=page();await tick();const e=p.elements;
 assert.equal(e['capture-primary'].children.length,16);
 e['capture-primary'].value='9';e['capture-primary'].handlers.change();
 assert.ok(e['framework-candidate'].children.some(option=>option.value==='scrum_half_service'));
 assert.equal(e['framework-candidate'].children.some(option=>option.value==='lineout_throw'),false);
 e['capture-secondary'].value='15';e['capture-secondary'].handlers.change();
 assert.ok(e['framework-candidate'].children.some(option=>option.value==='aerial_backfield'));
 await p.submit('position-form');assert.equal(p.users.owner.rugbyAssessmentPositions.primary,9);assert.equal(p.users.owner.rugbyAssessmentPositions.secondary,15);assert.equal(p.users.owner.rugbyAssessmentPositions.participationAuthorized,false);assert.match(e['position-status'].textContent,/saved and read back/);
});
test('framework registration and structured skill capture round-trip without numeric scores or approval',async()=>{
 const p=page();await tick();const e=p.elements;e['capture-primary'].value='9';e['capture-primary'].handlers.change();
 e['framework-candidate'].value='scrum_half_service';e['framework-candidate'].handlers.change();e['binding-setup'].value='Ground service from fixed positions, same ball, both directions and fixed cues.';
 await p.submit('binding-form');
 const protocol=p.service.catalog(p.actor).protocols.find(protocol=>protocol.candidateId==='scrum_half_service');assert.ok(protocol);assert.notEqual(protocol.id,'scrum_half_service');
 e['capture-protocol'].value=protocol.id;e['capture-protocol'].handlers.change();assert.equal(e['capture-value'].disabled,true);
 const controls=Object.fromEntries(e['context-fields'].children.flatMap(child=>child.children||[]).filter(child=>child.dataset?.context).map(child=>[child.dataset.context,child]));
 const context={position:'9',role:'Scrum-half',side:'bilateral',environment:'field',pressure:'controlled',readiness:'normal',conditions:'Dry grass, fixed service point and identical ball.',prompts:'Pass on cue',behavior:'Looked before pass',decision:'Left receiver selected',execution:'Accurate pass',outcome:'Receiver maintained pace',clipRef:'clip:one'};
 for(const [key,value] of Object.entries(context))controls[key].value=value;
 e['movement-fields'].children[0].children[0].value='introduced';e['capture-notes'].value='Both-side service observed at the fixed setup.';
 await p.submit('capture-form');const saved=p.users.owner.rugbyAssessmentRecords[0];assert.equal(saved.protocol.candidateId,'scrum_half_service');assert.equal(saved.context.position,9);assert.equal(saved.value,undefined);assert.equal(saved.independentlyVerified,false);assert.match(e['capture-history'].children[0].textContent,/Left receiver selected/);
 e['capture-correction'].value=saved.id;e['capture-correction'].handlers.change();
 const correctedControls=e['context-fields'].children.flatMap(child=>child.children||[]).filter(child=>child.dataset?.context);correctedControls.find(child=>child.dataset.context==='execution').value='Pass needed receiver adjustment';
 await p.submit('capture-form');assert.equal(p.users.owner.rugbyAssessmentRecords.length,2);assert.equal(p.users.owner.rugbyAssessmentRecords[1].supersedes,saved.id);assert.equal(p.users.owner.rugbyAssessmentRecords[0].context.execution,'Accurate pass');assert.match(e['capture-history'].children[1].textContent,/Superseded historical/);
});
