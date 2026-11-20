(function(){
'use strict';
const host=document.getElementById('quins-structure-lesson');if(!host)return;
const root=document.createElement('section');root.className='quins-ravens-live';
root.innerHTML=`<style>
.quins-ravens-live{background:#162d22;color:#f4f1df;border:1px solid #bba36a;border-radius:16px;padding:16px;margin:20px 0}
.quins-ravens-live svg{display:block;width:100%;height:auto;background:#174a33;border-radius:12px}
.quins-ravens-live button,.quins-ravens-live select{min-height:48px;margin:5px 4px 5px 0;padding:10px;border-radius:9px;background:#ddc482;color:#17291f;font-weight:800}
.quins-ravens-live [data-explain]{background:#294334;border-radius:10px;padding:12px;min-height:95px;line-height:1.5}
.quins-ravens-live [data-p]{transition:transform 750ms ease}
.quins-ravens-live [data-ball]{transition:transform 650ms ease}.quins-ravens-live [data-ball].in-flight{stroke:#a85f26;stroke-width:3}
.quins-ravens-live button:disabled{opacity:.45}
.quins-ravens-live [data-defense] circle{transition:cx 650ms ease,cy 650ms ease}
.quins-ravens-live .pitch-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}
.quins-ravens-live .pitch-controls button{min-width:0;width:100%;margin:0;padding:9px 3px;font-size:clamp(12px,3.1vw,16px);overflow-wrap:anywhere}
.quins-ravens-live .pitch-views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}.quins-ravens-live .pitch-views button{min-width:0;width:100%;margin:0;padding:8px 2px;font-size:clamp(12px,3.2vw,16px)}.quins-ravens-live .pitch-views button[aria-pressed="true"]{background:#fff2c0;outline:2px solid #fff}
.quins-ravens-live .decision{padding:12px;border:1px solid #bba36a;border-radius:12px;margin:10px 0}
.quins-ravens-live .decision button[aria-pressed="true"]{outline:3px solid white}
.quins-ravens-live [data-report]{background:#294334;border-radius:9px;padding:12px;line-height:1.5}
@media(prefers-reduced-motion:reduce){.quins-ravens-live [data-p],.quins-ravens-live [data-ball]{transition:none}}
</style><h3>QUIN NATION · RAVENS MF · COACH PLAYBOOK</h3>
<p>Actual coach-supplied sequence. Positions are <strong>source-informed approximations from coach-supplied diagrams</strong>, not surveyed field distances. Attack moves LEFT → RIGHT in this rotated teaching view. Read the coach diagrams bottom-up: scrum → Ruck 1 → Ruck 2. The white oval marks the ball.</p>
<div data-gate role="status" aria-live="polite">Checking Quin team authorization…</div>
<div data-content hidden>
<label>Play option <select data-branch><option value="wedge">DOUBLE WEDGE</option><option value="flash">FLASH off Ruck 1</option></select></label>
<div class="pitch-views" role="group" aria-label="Choose rugby learning view"><button data-view="forwards" aria-pressed="true">Forwards</button><button data-view="backs" aria-pressed="false">Backs</button><button data-view="full" aria-pressed="false">Full XV</button></div>
<div data-view-explain role="status" aria-live="polite">FORWARDS · Watch the carry, cleaning support and #9 distribution.</div>
<svg viewBox="0 0 390 260" role="img" aria-label="RAVENS MF 15-player formation with ball possession and left-to-right attack">
<rect width="390" height="260" rx="10" fill="#174a33"/><g stroke="#accbb2" stroke-dasharray="6 7" opacity=".5"><path d="M80 12V248M160 12V248M240 12V248M320 12V248M10 85H380M10 175H380"/></g>
<path d="M18 21H367" stroke="#ffe3a2" stroke-width="4"/><path d="M355 13L370 21L355 29" stroke="#ffe3a2" stroke-width="4" fill="none"/>
<text x="18" y="44" fill="#ffe3a2" font-size="14" font-weight="800">ATTACK →</text>
<rect data-gap x="260" y="70" width="55" height="110" fill="#e9d58c" fill-opacity=".16" stroke="#f5d77e" stroke-dasharray="5 5" visibility="hidden"/><g data-drill visibility="hidden"></g><g data-defense></g><g data-players></g><ellipse data-ball rx="8" ry="5" fill="#fff" stroke="#694f27" stroke-width="2"/>
<text x="12" y="251" font-size="11" fill="#fff">Gold: attackers 1–15 · White: ball</text></svg>
<div class="decision" data-realign-panel><strong>RUCK REALIGNMENT · Generic teaching drill</strong><p>This is a generic rugby example, <strong>not</strong> the coach-approved RAVENS formation. Follow the carry → tackle → ruck → fold → release sequence to see both units reorganize.</p>
<div class="pitch-controls"><button data-realign-start>Start drill</button><button data-realign-next>Next step</button><button data-realign-exit>Return to playbook</button></div>
<div data-realign-status role="status" aria-live="polite">Ready: attacking pod and backline face an organized defense.</div></div>
<div data-playback-clock role="status" aria-live="polite" style="padding:8px 10px;margin-top:8px;border:1px solid #bba36a;border-radius:9px">Ruck clock ready</div>
<div class="pitch-controls" aria-label="RAVENS pitch playback and decisions">
<button data-play>▶ Play</button><button data-pause>Pause</button><button data-replay>↺ Replay</button>
<button data-prev>◀ Phase</button><button data-next>Next ▶</button><button data-crash>Crash</button>
<button data-wide>Move wide</button><button data-reset-defense>Reset</button>
<label style="align-self:center;font-size:.85rem"><input type="checkbox" data-defense-toggle> Defense</label>
</div>
<div class="decision" data-chain-panel><strong>FAST-BALL CHAIN · Create the gap</strong>
<p><strong>Fast ball:</strong> playable ball released quickly after the tackle (≤3s coaching target). <strong>Fold:</strong> defenders moving around the ruck to rebuild their line. <strong>Overload:</strong> more available attackers than defenders in a channel. <strong>Line break:</strong> a carrier passes through the defensive line.</p>
<label>Attack channel <select data-chain-side><option value="same">Repeat same side</option><option value="switch">Switch sides</option></select></label>
<label>Defense <select data-chain-defense><option value="fold">Slow to fold</option><option value="disciplined">Disciplined recovery</option></select></label>
<div><button data-chain-fast>Win fast ball</button><button data-chain-slow>Slow ball</button><button data-chain-attack>Attack the gap</button><button data-chain-reset>Reset chain</button></div>
<div data-chain-result role="status" aria-live="polite">Win consecutive fast rucks to test whether defensive compression creates a usable gap. No automatic line break.</div></div>
<div class="decision" data-ruck-panel><strong>RUCK LAB · support and speed</strong><p>Adjust support at the tackle to compare fast ball, slow ball, and turnover risk. This is a training model, not a law or guaranteed match outcome.</p>
<label><input type="checkbox" data-auto-support checked> Calculate support from pitch positions</label><div data-arrivals role="status" aria-live="polite">Pitch-based support estimates appear at a ruck.</div>
<label>Attack support <select data-support><option value="1">1 available</option><option value="2" selected>2 available</option><option value="3">3 available</option><option value="4">4 available</option></select></label>
<label>Defenders competing <select data-contest><option value="0">0</option><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
<label>#9 / back arrival <select data-distributor><option value="near" selected>Near ruck</option><option value="late">Late arrival</option><option value="absent">No back available</option></select></label>
<button data-evaluate-ruck>Evaluate ruck</button>
<div data-ruck-result role="status" aria-live="polite">Choose a tackle scenario and evaluate support.</div></div>
<div data-action-status role="status" aria-live="polite" style="padding:8px;background:#294334;border-radius:8px">Tap Play for the coach sequence, or Crash / Move wide to explore a decision.</div>
<div class="decision"><label>Defense response <select data-strategy><option value="fold">Fold toward repeated carries</option><option value="hold">Hold width / disciplined line</option><option value="rush">Rush ball carrier</option></select></label>
<div data-clock-defense role="status" aria-live="polite">Defensive recovery follows modeled ruck release time.</div><div data-report role="status" aria-live="polite">Turn on defense to see modeled reactions.</div></div>
<div data-ball-status role="status" aria-live="polite">Ball movement: ready</div><div data-explain role="status" aria-live="polite"></div><p style="font-size:.83rem">Restricted Quin training. FLASH is a coach-sourced option; unspecified carrier movement is not invented.</p>
</div>`;
host.prepend(root);
const $=s=>root.querySelector(s),svgNS='http://www.w3.org/2000/svg',doc=root.ownerDocument,players=$('[data-players]'),markers={};
for(let n=1;n<=15;n++){const g=doc.createElementNS(svgNS,'g');g.setAttribute('data-p',String(n));const c=doc.createElementNS(svgNS,'circle');c.setAttribute('r','12');c.setAttribute('fill','#e4c77d');c.setAttribute('stroke','#152b1f');c.setAttribute('stroke-width','2');const t=doc.createElementNS(svgNS,'text');t.textContent=n;t.setAttribute('text-anchor','middle');t.setAttribute('y','4');t.setAttribute('fill','#152b1f');t.setAttribute('font-size','11');t.setAttribute('font-weight','800');g.append(c,t);players.appendChild(g);markers[n]=g;}
let data=null,index=0,timer=null,requestId=0,crashes=0,decisions=[],recovery=0,ballTimer=null,previousStage=null,lastRuck=null,playToken=0,pitchView='forwards',drillStep=-1;
const defenseGroup=$('[data-defense]'),defenders=[];
function evaluateRuck(){
 const stage=data?.stages[index],isRuck=stage?.id==='ruck1'||stage?.id==='ruck2';
 const auto=$('[data-auto-support]').checked&&isRuck;
 const contest=Number($('[data-contest]').value);
 let support=Number($('[data-support]').value),distributor=$('[data-distributor]').value;
 let arrivalPenalty=0;
 if(auto){
  // Diagram coordinates are illustrative, so these are teaching-model travel
  // estimates, not measured field metres or verified player speeds.
  const prev=data.stages[Math.max(0,index-1)];
  const anchor=(prev.ballCarrier&&prev.positions[prev.ballCarrier])||stage.positions[9]||[195,130];
  const distances=Object.entries(stage.positions).map(([number,point])=>({
   number:Number(number),distance:Math.hypot(point[0]-anchor[0],point[1]-anchor[1])
  })).filter(p=>p.number!==9&&p.number!==prev.ballCarrier&&p.number<=8)
    .sort((a,b)=>a.distance-b.distance);
  const arrivals=distances.slice(0,4).map(p=>({number:p.number,seconds:Number((p.distance/34).toFixed(1))}));
  support=arrivals.filter(p=>p.seconds<=2).length;
  const nine=stage.positions[9],nineTime=nine?Math.hypot(nine[0]-anchor[0],nine[1]-anchor[1])/34:Infinity;
  distributor=nineTime<=2?'near':nineTime<=3.5?'late':'absent';
  arrivalPenalty=arrivals.length?Math.min(2,arrivals[0].seconds*.3):2;
  $('[data-arrivals]').textContent='Modeled forward arrivals: '+arrivals.map(p=>'#'+p.number+' '+p.seconds.toFixed(1)+'s').join(' · ')+'. #9 '+(Number.isFinite(nineTime)?nineTime.toFixed(1)+'s':'not located')+'. Effective support within 2s: '+support+'.';
 }else{
  $('[data-arrivals]').textContent=isRuck?'Manual scenario selected.':'Advance to a ruck for automatic pitch-based support; manual scenario applies until then.';
 }
 $('[data-support]').disabled=auto;$('[data-distributor]').disabled=auto;
 // Explicit coaching model: proximity and legal arrival are represented by the
 // selected 'available' support count, not raw player counts anywhere on pitch.
 const effective=Math.max(0,support-1); // first support secures initial contact
 const pressure=Math.max(0,contest-effective);
 const time=Number((1.5+Math.max(0,2-support)*0.8+contest*0.55+pressure*1.1+(distributor==='near'?0:distributor==='late'?1.2:1.8)+arrivalPenalty).toFixed(1));
 const lost=contest>=3&&support<=1;
 const quality=lost?'TURNOVER RISK':time<=3?'FAST BALL':'SLOW BALL';
 const wide=!lost&&distributor!=='absent'&&support>=2;
 $('[data-ruck-result]').textContent=quality+' · modeled '+time.toFixed(1)+'s to distribution. '+(lost?'Opposition outnumbers available support; ball security at risk.':wide?'Back available: wide distribution is an option.':'No immediate wide release; likely close-range carry or wait for a back.')+(isRuck?' Current coach phase is a ruck.':' Scenario preview: advance to a ruck to apply this lesson.')+' This is illustrative; tackle entry, legality, skill, and player speed also matter.';
 return {time,quality,wide,lost,support,distributor};
}
$('[data-evaluate-ruck]').addEventListener('click',evaluateRuck);
$('[data-auto-support]').addEventListener('change',evaluateRuck);
for(let n=0;n<15;n++){
 const c=doc.createElementNS(svgNS,'circle');c.setAttribute('r','9');c.setAttribute('fill','#d87571');c.setAttribute('stroke','#fff0e0');c.setAttribute('stroke-width','1.5');defenseGroup.appendChild(c);defenders.push(c);
}
function applyPitchView(){
 const isForwards=pitchView==='forwards',isBacks=pitchView==='backs';
 for(let n=1;n<=15;n++){
  // Scrum-half bridges the units; show #9 in both focused lessons.
  const visible=!isForwards&&!isBacks||(isForwards?n<=9:n>=9);
  markers[n].setAttribute('visibility',visible?'visible':'hidden');
 }
 // Limit visual defensive clutter in focused modes while preserving the
 // same underlying defense state and positions across all three views.
 defenders.forEach((d,i)=>d.setAttribute('visibility',pitchView==='full'||(isForwards?i<5:i>=8)?'visible':'hidden'));
 $('[data-view-explain]').textContent=isForwards?'FORWARDS · #1–8 plus #9. Secure the tackle, win clean ball, release quickly.':isBacks?'BACKS · #9–15. Keep depth and width, read the fold, attack a genuine gap.':'FULL XV · All 15 attackers and 15 defenders. Connect the complete coach sequence.';
 root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===pitchView)));
}
root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{pitchView=b.dataset.view;applyPitchView();}));
// Generic drill geometry is independent of protected coach-supplied positions.
const drillGroup=$('[data-drill]'),drillDots=[];
const drillFrames=[
 {label:'SET SHAPE · Forwards form a carrying pod, #9 and backs hold depth.',a:[[70,120],[56,94],[56,146],[42,118],[98,120],[112,80],[142,60],[172,45]],d:[[242,80],[242,105],[242,130],[242,155],[242,180],[282,100],[282,145]]},
 {label:'CARRY AND TACKLE · The carrier meets a defender. Support closes on the tackle.',a:[[155,120],[116,101],[116,142],[92,118],[128,120],[132,76],[160,58],[190,42]],d:[[167,120],[230,98],[230,150],[246,170],[246,188],[282,100],[282,145]]},
 {label:'RUCK · Two cleaners arrive, #9 sets at the base; defenders establish the offside line.',a:[[160,120],[148,108],[148,134],[122,119],[132,120],[143,78],[172,58],[204,44]],d:[[184,119],[195,95],[195,151],[215,173],[237,190],[278,110],[278,152]]},
 {label:'REALIGN · Forwards reset into a pod; defenders fold while backs maintain width and depth.',a:[[166,120],[156,110],[156,132],[120,121],[139,119],[160,74],[196,56],[233,42]],d:[[204,119],[211,96],[211,148],[228,174],[245,190],[263,100],[280,145]]},
 {label:'RELEASE · #9 distributes toward #10; defenders who have not folded leave potential space.',a:[[168,120],[154,109],[154,133],[120,121],[138,118],[179,75],[225,57],[264,43]],d:[[207,119],[215,95],[215,150],[231,175],[247,190],[264,105],[282,150]]}
];
for(let i=0;i<15;i++){const c=doc.createElementNS(svgNS,'circle');c.setAttribute('r',i<8?'10':'9');c.setAttribute('stroke','#132a1e');c.setAttribute('stroke-width','1.5');c.setAttribute('fill',i<8?'#e4c77d':'#d87571');c.style.transition='cx 700ms ease,cy 700ms ease';drillGroup.appendChild(c);drillDots.push(c);}
function showDrill(step){
 drillStep=step;
 const active=step>=0,frame=drillFrames[step];
 drillGroup.setAttribute('visibility',active?'visible':'hidden');
 players.setAttribute('visibility',active?'hidden':'visible');
 defenseGroup.setAttribute('visibility',active?'hidden':$('[data-defense-toggle]').checked?'visible':'hidden');
 $('[data-ball]').setAttribute('visibility',active?'hidden':'visible');
 $('[data-gap]').setAttribute('visibility','hidden');
 if(active){
  frame.a.concat(frame.d).forEach((p,i)=>{drillDots[i].setAttribute('cx',p[0]);drillDots[i].setAttribute('cy',p[1]);});
  $('[data-realign-status]').textContent='Step '+(step+1)+'/5 · '+frame.label+' Generic coaching illustration; not a verified match formation.';
 }else{$('[data-realign-status]').textContent='Returned to the protected coach playbook.';render();}
}
$('[data-realign-start]').addEventListener('click',()=>{pause();showDrill(0);});
$('[data-realign-next]').addEventListener('click',()=>{pause();showDrill(Math.min(4,drillStep<0?0:drillStep+1));});
$('[data-realign-exit]').addEventListener('click',()=>{pause();showDrill(-1);});
function defenseReport(){
 const enabled=$('[data-defense-toggle]').checked,strategy=$('[data-strategy]').value;
 defenseGroup.setAttribute('visibility',enabled?'visible':'hidden');
 const stage=data?.stages[index],carrier=stage?.ballCarrier?stage.positions[stage.ballCarrier]:[230,139];
 const ruckStage=stage?.id==='ruck1'||stage?.id==='ruck2';
 const ruck=ruckStage?evaluateRuck():lastRuck;
 const resetSteps=ruck?Math.max(0,Math.floor(Math.max(0,ruck.time-3)/1.2)):0;
 const maxFold=strategy==='fold'?Math.max(0,Math.min(4,crashes)-recovery-resetSteps):strategy==='rush'?Math.max(0,Math.min(2,crashes)-recovery-resetSteps):0;
 const speed=ruck?.lost?'TURNOVER RISK':ruck?.quality||'NO RUCK YET';
 $('[data-clock-defense]').textContent='Ruck clock: '+(ruck?ruck.time.toFixed(1)+'s':'not started')+' · '+speed+'. '+(ruck?.lost?'Defensive contest threatens possession.':ruck?resetSteps+' additional modeled defender(s) recover to the outside bank after the 3s target.':'Advance to a ruck to compare fast and slow ball.');
 // Rebuild the defensive line relative to the current breakdown, rather
 // than keeping defenders parked in two static columns at the far edge.
 // These positions illustrate folding and offside-line recovery, not a
 // coach-authored opposition system or measured metres.
 const priorRuck=[...data.stages.slice(0,index+1)].reverse().find(p=>p.id==='ruck1'||p.id==='ruck2');
 const ruckAnchor=priorRuck?.positions[priorRuck.id==='ruck1'?12:14]||carrier;
 const lineX=Math.max(65,Math.min(340,ruckAnchor[0]+30));
 const fast=ruck&&ruck.time<=3;
 const foldCount=strategy==='hold'?0:strategy==='rush'?Math.min(2,maxFold+1):maxFold;
 const recoverCount=fast?Math.max(3,7-resetSteps):Math.max(6,8-resetSteps);
 const ordered=[...Array(15).keys()];
 for(let n=0;n<15;n++){
  const slot=n%8,bank=Math.floor(n/8);
  const spread=(slot-3.5)*24;
  const fold=n<foldCount;
  const isRecovering=n>=foldCount&&n<foldCount+recoverCount;
  let x=lineX+(bank*19)+(fold?-7:0)+(isRecovering?0:fast?35:13);
  let y=ruckAnchor[1]+spread+(bank?12:0);
  if(fold){x=lineX+7;y=ruckAnchor[1]+(n-(foldCount-1)/2)*17;}
  if(strategy==='rush'&&n<2){x=lineX-10;y=ruckAnchor[1]+(n?12:-12);}
  defenders[n].setAttribute('cx',Math.max(18,Math.min(374,x)));
  defenders[n].setAttribute('cy',Math.max(53,Math.min(235,y)));
 }
 const remaining=15-foldCount;
 $('[data-report]').textContent=!enabled?'Without Defense: study the coach sequence. Switch on defense to test your decisions.':
 'Defensive experiment: '+crashes+' crash(es), '+recovery+' defensive recovery step(s), current coach phase '+(index+1)+'/'+data.stages.length+'. '+(strategy==='fold'?foldCount+' modeled defenders have folded toward the breakdown; '+remaining+' are reorganizing into defensive width.':strategy==='hold'?'Defenders hold their width while shifting the defensive line with the breakdown; no automatic overload.':'Two defenders pressure the carrier while the remaining defenders realign around the breakdown.')+
 (decisions.length?' Last decision: '+decisions.at(-1)+'.':'')+
 ' These are simplified responses, not guaranteed real-match outcomes.';
 applyPitchView();
}
function chooseDecision(action){
 if(!data)return;
 const ruck=evaluateRuck();
 if(action==='wide'&&!ruck.wide){$('[data-action-status]').textContent='Wide release unavailable in this modeled scenario: bring #9/a back closer and secure the ruck first.';return;}
 if(ruck.lost){$('[data-action-status]').textContent='Turnover risk: insufficient support against competing defenders. Adjust the support count and retry.';return;}
 pause();
 if(!$('[data-defense-toggle]').checked){$('[data-defense-toggle]').checked=true;}
 $('[data-action-status]').textContent='Applying '+(action==='crash'?'crash':'wide')+' decision to the coach sequence.';
 if(action==='crash'){
  // Move through the actual coach-approved hit-up/ruck sequence; do not
  // fabricate extra tactical stages or ball carriers.
  const ruck=data.stages.findIndex((p,i)=>i>index&&p.id==='ruck1');
  const edgeRuck=data.stages.findIndex((p,i)=>i>index&&p.id==='ruck2');
  const nextRuck=ruck>=0?ruck:edgeRuck;
  if(nextRuck<0){
   decisions.push('no further coach-authored ruck; replay to explore again');
   defenseReport();$('[data-action-status]').textContent='No later recorded ruck. Tap Replay to start another experiment.';return;
  }
  crashes++;
  recovery=Math.max(0,recovery-1);
  index=nextRuck;
  decisions.push('carry into '+data.stages[index].title+'; defense reacts to the collision');
 }else{
  const wide=data.stages.findIndex((p,i)=>i>index&&p.id==='edge');
  if(wide<0){
   decisions.push('no later coach-authored wide carry in this branch');
   defenseReport();$('[data-action-status]').textContent='No later recorded wide carry. Tap Replay to start another experiment.';return;
  }
  index=wide;
  recovery++;
  decisions.push('advance to coach-authored wide carry; defense begins recovering');
 }
 render();
}
function cancelBall(){if(ballTimer!==null)clearTimeout(ballTimer);ballTimer=null;$('[data-ball]').classList.remove('in-flight');}
function animateBall(from,to){
 cancelBall();
 const oval=$('[data-ball]'),status=$('[data-ball-status]');
 if(!to.ballCarrier){oval.setAttribute('opacity','0');status.textContent='Ball secured at ruck; no unverified pass shown.';return;}
 const dest=to.positions[to.ballCarrier];
 const target='translate('+(dest[0]+14)+' '+(dest[1]-7)+')';
 if(!from||!from.ballCarrier||from.ballCarrier===to.ballCarrier){
  oval.setAttribute('transform',target);oval.setAttribute('opacity','1');
  status.textContent=from&&from.ballCarrier===to.ballCarrier?'#'+to.ballCarrier+' retains possession.':'Ball with #'+to.ballCarrier+' after ruck.';
  return;
 }
 const origin=from.positions[from.ballCarrier];
 oval.style.transition='none';
 oval.setAttribute('transform','translate('+(origin[0]+14)+' '+(origin[1]-7)+')');
 oval.setAttribute('opacity','1');oval.classList.add('in-flight');
 status.textContent='Ball transfer #'+from.ballCarrier+' → #'+to.ballCarrier+' (illustrative flight).';
 oval.getBoundingClientRect();
 oval.style.transition='';
 oval.setAttribute('transform',target);
 ballTimer=setTimeout(()=>{oval.classList.remove('in-flight');ballTimer=null;},700);
}
function pause(){playToken++;if(timer!==null)clearTimeout(timer);timer=null;}
function render(){if(!data)return;if(drillStep>=0)return;const p=data.stages[index];evaluateRuck();if(p.id==='ruck1'||p.id==='ruck2')lastRuck=evaluateRuck();$('[data-action-status]').textContent='Phase '+(index+1)+'/'+data.stages.length+' · '+p.title+'. '+(crashes?'Crashes: '+crashes+'. ':'')+'Watch the pitch above.';for(let n=1;n<=15;n++){const pos=p.positions[n];markers[n].setAttribute('transform','translate('+pos[0]+' '+pos[1]+')');markers[n].setAttribute('opacity',p.active.includes(n)?'1':'.6');}
animateBall(previousStage,p);previousStage=p;
$('[data-explain]').textContent='PHASE '+p.step+'/'+data.stages.length+' · '+p.title+' — '+p.instruction+(p.ballCarrier?' Ball: #'+p.ballCarrier:' Ball secured at ruck / next carrier unspecified.');
defenseReport();applyPitchView();$('[data-playback-clock]').textContent=lastRuck?'Last ruck: '+lastRuck.time.toFixed(1)+'s · '+lastRuck.quality+' · defense '+(lastRuck.time<=3?'under pressure':'has time to recover'):'No ruck yet · watch the coach sequence';$('[data-prev]').disabled=index===0;$('[data-next]').disabled=index===data.stages.length-1;}
async function load(branch){pause();cancelBall();previousStage=null;const id=++requestId;data=null;index=0;$('[data-content]').hidden=true;$('[data-gate]').textContent='Checking Quin team authorization…';
const result=await window.MaatApiClient.request('/api/quins/ravens/play?branch='+encodeURIComponent(branch));
if(id!==requestId)return;
if(!result.ok){$('[data-gate]').textContent=result.diagnostics?.status===403?'Quin team enrollment required. Your account is signed in but not authorized for this playbook.':result.diagnostics?.status===401?'Sign in again to access the protected Quin playbook.':'Unable to load protected RAVENS playbook. Retry after deployment.';return;}
if(!result.payload||!Array.isArray(result.payload.stages)||!result.payload.stages.length){$('[data-gate]').textContent='Playbook response invalid.';return;}
data=result.payload;$('[data-gate]').textContent='Coach-approved RAVENS MF loaded securely.';$('[data-content]').hidden=false;render();}
$('[data-prev]').addEventListener('click',()=>{pause();index=Math.max(0,index-1);lastRuck=null;render();});
$('[data-next]').addEventListener('click',()=>{pause();index=Math.min(data.stages.length-1,index+1);render();});
$('[data-play]').addEventListener('click',()=>{
 pause();if(!data||drillStep>=0)return;
 if(index===data.stages.length-1){index=0;previousStage=null;lastRuck=null;}
 render();const token=playToken;
 function next(){
  if(token!==playToken||!data||index>=data.stages.length-1){timer=null;return;}
  const stage=data.stages[index];
  const atRuck=stage.id==='ruck1'||stage.id==='ruck2';
  const wait=atRuck?Math.max(1200,Math.min(8000,(lastRuck||evaluateRuck()).time*1000)):2100;
  $('[data-playback-clock]').textContent=atRuck?'Ruck contest · '+(wait/1000).toFixed(1)+'s modeled release · defenders recovering':'Running phase '+(index+1)+'/'+data.stages.length;
  timer=setTimeout(()=>{
   if(token!==playToken)return;
   index++;render();next();
  },wait);
 }
 next();
});
$('[data-pause]').addEventListener('click',pause);
$('[data-replay]').addEventListener('click',()=>{pause();cancelBall();previousStage=null;index=0;crashes=0;recovery=0;decisions=[];lastRuck=null;render();});
$('[data-branch]').addEventListener('change',e=>{crashes=0;recovery=0;decisions=[];lastRuck=null;load(e.target.value);});
$('[data-defense-toggle]').addEventListener('change',defenseReport);
$('[data-strategy]').addEventListener('change',()=>{crashes=0;recovery=0;decisions=[];defenseReport();});
$('[data-crash]').addEventListener('click',()=>chooseDecision('crash'));
$('[data-wide]').addEventListener('click',()=>chooseDecision('wide'));
$('[data-reset-defense]').addEventListener('click',()=>{crashes=0;recovery=0;decisions=[];lastRuck=null;index=0;previousStage=null;render();});
// Teaching sandbox, separate from the source-faithful RAVENS phase order.
let chainFast=0,chainSeconds=0,chainCompressed=0,chainOutcome='No gap assessed';
function chainRender(){
 const side=$('[data-chain-side]').value,discipline=$('[data-chain-defense]').value==='disciplined';
 const reset=discipline?chainFast:0;
 const net=Math.max(0,chainCompressed-reset);
 const channel=side==='same'?'near-ruck seam':'outside channel';
 const chance=net>=2?'Gap available':net===1?'Potential mismatch':'Defense organized';
 $('[data-chain-result]').textContent='Consecutive fast balls: '+chainFast+' · modeled elapsed time: '+chainSeconds.toFixed(1)+'s · defenders drawn in: '+chainCompressed+' · defenders recovered: '+reset+' · '+chance+' at '+channel+'. '+chainOutcome+'. Fast ball alone never guarantees a break.';
 if(data&&$('[data-defense-toggle]').checked){
  const defense=defenders.slice(0,Math.min(net,4));
  defense.forEach((c,i)=>{c.setAttribute('cx',side==='same'?230:260);c.setAttribute('cy',side==='same'?115+i*13:105+i*14);});
 }
}
function chainStep(fast){
 if(!data)return;
 pause();
 if(!$('[data-defense-toggle]').checked)$('[data-defense-toggle]').checked=true;
 const ruck=evaluateRuck();
 const seconds=fast?Math.min(3,Math.max(1.5,ruck.time)):Math.max(4.5,ruck.time);
 chainSeconds+=seconds;
 if(fast&&!ruck.lost){
  chainFast++;
  if($('[data-chain-defense]').value==='fold')chainCompressed=Math.min(5,chainCompressed+1);
  chainOutcome='Hypothetical fast release: support secures the tackle; #9 releases the ball. Backline must preserve width and depth';
 }else{
  chainFast=0;chainCompressed=Math.max(0,chainCompressed-1);
  chainOutcome=ruck.lost?'Turnover risk: insufficient effective support':'Slow release lets the defensive line fold and reset';
 }
 chainRender();
}
$('[data-chain-fast]').addEventListener('click',()=>chainStep(true));
$('[data-chain-slow]').addEventListener('click',()=>chainStep(false));
$('[data-chain-attack]').addEventListener('click',()=>{
 const disciplined=$('[data-chain-defense]').value==='disciplined';
 const net=Math.max(0,chainCompressed-(disciplined?chainFast:0));
 $('[data-gap]').setAttribute('visibility',chainFast>=2&&net>=2?'visible':'hidden');$('[data-gap]').setAttribute('x',$('[data-chain-side]').value==='same'?'220':'300');
 chainOutcome=chainFast>=2&&net>=2?'Modeled gap: the backline can attack '+($('[data-chain-side]').value==='same'?'the near-ruck seam':'outside space')+'. Possible line break if the carrier beats the remaining cover':'No reliable gap: carry, recycle, or change the point of attack';
 chainRender();
});
$('[data-chain-reset]').addEventListener('click',()=>{chainFast=0;chainSeconds=0;chainCompressed=0;chainOutcome='Chain reset';$('[data-gap]').setAttribute('visibility','hidden');chainRender();});
$('[data-chain-side]').addEventListener('change',chainRender);
$('[data-chain-defense]').addEventListener('change',chainRender);
load('wedge');
})();
