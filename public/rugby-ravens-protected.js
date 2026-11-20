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
.quins-ravens-live .decision{padding:12px;border:1px solid #bba36a;border-radius:12px;margin:10px 0}
.quins-ravens-live .decision button[aria-pressed="true"]{outline:3px solid white}
.quins-ravens-live [data-report]{background:#294334;border-radius:9px;padding:12px;line-height:1.5}
@media(prefers-reduced-motion:reduce){.quins-ravens-live [data-p],.quins-ravens-live [data-ball]{transition:none}}
</style><h3>QUIN NATION · RAVENS MF · COACH PLAYBOOK</h3>
<p>Actual coach-supplied sequence. Positions are <strong>illustrative until the original PDF geometry is matched</strong>. Attack moves LEFT → RIGHT. The white oval marks the ball.</p>
<div data-gate role="status" aria-live="polite">Checking Quin team authorization…</div>
<div data-content hidden>
<label>Play option <select data-branch><option value="wedge">DOUBLE WEDGE</option><option value="flash">FLASH off Ruck 1</option></select></label>
<svg viewBox="0 0 390 260" role="img" aria-label="RAVENS MF 15-player formation with ball possession and left-to-right attack">
<rect width="390" height="260" rx="10" fill="#174a33"/><g stroke="#accbb2" stroke-dasharray="6 7" opacity=".5"><path d="M80 12V248M160 12V248M240 12V248M320 12V248M10 85H380M10 175H380"/></g>
<path d="M18 21H367" stroke="#ffe3a2" stroke-width="4"/><path d="M355 13L370 21L355 29" stroke="#ffe3a2" stroke-width="4" fill="none"/>
<text x="18" y="44" fill="#ffe3a2" font-size="14" font-weight="800">ATTACK →</text>
<g data-defense></g><g data-players></g><ellipse data-ball rx="8" ry="5" fill="#fff" stroke="#694f27" stroke-width="2"/>
<text x="12" y="251" font-size="11" fill="#fff">Gold: attackers 1–15 · White: ball</text></svg>
<div class="pitch-controls" aria-label="RAVENS pitch playback and decisions">
<button data-play>▶ Play</button><button data-pause>Pause</button><button data-replay>↺ Replay</button>
<button data-prev>◀ Phase</button><button data-next>Next ▶</button><button data-crash>Crash</button>
<button data-wide>Move wide</button><button data-reset-defense>Reset</button>
<label style="align-self:center;font-size:.85rem"><input type="checkbox" data-defense-toggle> Defense</label>
</div>
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
let data=null,index=0,timer=null,requestId=0,crashes=0,decisions=[],recovery=0,ballTimer=null,previousStage=null,lastRuck=null;
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
 for(let n=0;n<15;n++){
  // A baseline of two defensive banks, moving in response to phase and chosen strategy.
  const row=n%8,bank=Math.floor(n/8);
  let x=bank===0?290:335,y=52+row*23;
  if(strategy==='fold'&&n>=8-maxFold&&n<8){x=carrier[0]+34;y=carrier[1]+(n-6)*12;}
  if(strategy==='rush'&&n<2){x=Math.min(360,carrier[0]+22+n*9);y=carrier[1]+(n?14:-14);}
  defenders[n].setAttribute('cx',Math.max(18,Math.min(374,x)));
  defenders[n].setAttribute('cy',Math.max(53,Math.min(235,y)));
 }
 const remaining=8-maxFold;
 $('[data-report]').textContent=!enabled?'Without Defense: study the coach sequence. Switch on defense to test your decisions.':
 'Defensive experiment: '+crashes+' crash(es), '+recovery+' defensive recovery step(s), current coach phase '+(index+1)+'/'+data.stages.length+'. '+(strategy==='fold'?maxFold+' modeled defenders have folded toward the repeated carry; '+remaining+' remain in the original outside bank.':strategy==='hold'?'Defenders hold their width despite the crashes; no automatic overload.':'Two defenders pressure the carrier; the rest retain their shape.')+
 (decisions.length?' Last decision: '+decisions.at(-1)+'.':'')+
 ' These are simplified responses, not guaranteed real-match outcomes.';
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
function pause(){if(timer!==null)clearInterval(timer);timer=null;}
function render(){if(!data)return;const p=data.stages[index];evaluateRuck();if(p.id==='ruck1'||p.id==='ruck2')lastRuck=evaluateRuck();$('[data-action-status]').textContent='Phase '+(index+1)+'/'+data.stages.length+' · '+p.title+'. '+(crashes?'Crashes: '+crashes+'. ':'')+'Watch the pitch above.';for(let n=1;n<=15;n++){const pos=p.positions[n];markers[n].setAttribute('transform','translate('+pos[0]+' '+pos[1]+')');markers[n].setAttribute('opacity',p.active.includes(n)?'1':'.6');}
animateBall(previousStage,p);previousStage=p;
$('[data-explain]').textContent='PHASE '+p.step+'/'+data.stages.length+' · '+p.title+' — '+p.instruction+(p.ballCarrier?' Ball: #'+p.ballCarrier:' Ball secured at ruck / next carrier unspecified.');
defenseReport();$('[data-prev]').disabled=index===0;$('[data-next]').disabled=index===data.stages.length-1;}
async function load(branch){pause();cancelBall();previousStage=null;const id=++requestId;data=null;index=0;$('[data-content]').hidden=true;$('[data-gate]').textContent='Checking Quin team authorization…';
const result=await window.MaatApiClient.request('/api/quins/ravens/play?branch='+encodeURIComponent(branch));
if(id!==requestId)return;
if(!result.ok){$('[data-gate]').textContent=result.diagnostics?.status===403?'Quin team enrollment required. Your account is signed in but not authorized for this playbook.':result.diagnostics?.status===401?'Sign in again to access the protected Quin playbook.':'Unable to load protected RAVENS playbook. Retry after deployment.';return;}
if(!result.payload||!Array.isArray(result.payload.stages)||!result.payload.stages.length){$('[data-gate]').textContent='Playbook response invalid.';return;}
data=result.payload;$('[data-gate]').textContent='Coach-approved RAVENS MF loaded securely.';$('[data-content]').hidden=false;render();}
$('[data-prev]').addEventListener('click',()=>{pause();index=Math.max(0,index-1);render();});
$('[data-next]').addEventListener('click',()=>{pause();index=Math.min(data.stages.length-1,index+1);render();});
$('[data-play]').addEventListener('click',()=>{pause();if(!data)return;if(index===data.stages.length-1){index=0;previousStage=null;}render();timer=setInterval(()=>{if(index===data.stages.length-1){pause();return;}index++;render();},2100);});
$('[data-pause]').addEventListener('click',pause);
$('[data-replay]').addEventListener('click',()=>{pause();cancelBall();previousStage=null;index=0;crashes=0;recovery=0;decisions=[];lastRuck=null;render();});
$('[data-branch]').addEventListener('change',e=>{crashes=0;recovery=0;decisions=[];lastRuck=null;load(e.target.value);});
$('[data-defense-toggle]').addEventListener('change',defenseReport);
$('[data-strategy]').addEventListener('change',()=>{crashes=0;recovery=0;decisions=[];defenseReport();});
$('[data-crash]').addEventListener('click',()=>chooseDecision('crash'));
$('[data-wide]').addEventListener('click',()=>chooseDecision('wide'));
$('[data-reset-defense]').addEventListener('click',()=>{crashes=0;recovery=0;decisions=[];lastRuck=null;index=0;previousStage=null;render();});
load('wedge');
})();
