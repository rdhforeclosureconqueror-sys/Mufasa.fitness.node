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
<div class="decision"><label><input type="checkbox" data-defense-toggle> With Defense</label>
<label> Defense response <select data-strategy><option value="fold">Fold toward repeated carries</option><option value="hold">Hold width / disciplined line</option><option value="rush">Rush ball carrier</option></select></label>
<div><button data-crash>Simulate crash</button><button data-wide>Move ball wide</button><button data-reset-defense>Reset defensive experiment</button></div>
<div data-report role="status" aria-live="polite">Turn on defense to experiment. Each crash can draw defenders, but the result depends on defensive strategy and recovery.</div></div>
<div><button data-prev>Previous</button><button data-next>Next phase</button><button data-play>▶ Play</button><button data-pause>Pause</button><button data-replay>Watch again</button></div>
<div data-ball-status role="status" aria-live="polite">Ball movement: ready</div><div data-explain role="status" aria-live="polite"></div><p style="font-size:.83rem">Restricted Quin training. FLASH is a coach-sourced option; unspecified carrier movement is not invented.</p>
</div>`;
host.prepend(root);
const $=s=>root.querySelector(s),svgNS='http://www.w3.org/2000/svg',doc=root.ownerDocument,players=$('[data-players]'),markers={};
for(let n=1;n<=15;n++){const g=doc.createElementNS(svgNS,'g');g.setAttribute('data-p',String(n));const c=doc.createElementNS(svgNS,'circle');c.setAttribute('r','12');c.setAttribute('fill','#e4c77d');c.setAttribute('stroke','#152b1f');c.setAttribute('stroke-width','2');const t=doc.createElementNS(svgNS,'text');t.textContent=n;t.setAttribute('text-anchor','middle');t.setAttribute('y','4');t.setAttribute('fill','#152b1f');t.setAttribute('font-size','11');t.setAttribute('font-weight','800');g.append(c,t);players.appendChild(g);markers[n]=g;}
let data=null,index=0,timer=null,requestId=0,crashes=0,decisions=[],recovery=0,ballTimer=null,previousStage=null;
const defenseGroup=$('[data-defense]'),defenders=[];
for(let n=0;n<15;n++){
 const c=doc.createElementNS(svgNS,'circle');c.setAttribute('r','9');c.setAttribute('fill','#d87571');c.setAttribute('stroke','#fff0e0');c.setAttribute('stroke-width','1.5');defenseGroup.appendChild(c);defenders.push(c);
}
function defenseReport(){
 const enabled=$('[data-defense-toggle]').checked,strategy=$('[data-strategy]').value;
 defenseGroup.setAttribute('visibility',enabled?'visible':'hidden');
 const stage=data?.stages[index],carrier=stage?.ballCarrier?stage.positions[stage.ballCarrier]:[230,139];
 const maxFold=strategy==='fold'?Math.max(0,Math.min(4,crashes)-recovery):strategy==='rush'?Math.max(0,Math.min(2,crashes)-recovery):0;
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
 if(!data||!$('[data-defense-toggle]').checked)return;
 pause();
 if(action==='crash'){
  // Move through the actual coach-approved hit-up/ruck sequence; do not
  // fabricate extra tactical stages or ball carriers.
  const ruck=data.stages.findIndex((p,i)=>i>index&&p.id==='ruck1');
  const edgeRuck=data.stages.findIndex((p,i)=>i>index&&p.id==='ruck2');
  const nextRuck=ruck>=0?ruck:edgeRuck;
  if(nextRuck<0){
   decisions.push('no further coach-authored ruck; replay to explore again');
   defenseReport();return;
  }
  crashes++;
  recovery=Math.max(0,recovery-1);
  index=nextRuck;
  decisions.push('carry into '+data.stages[index].title+'; defense reacts to the collision');
 }else{
  const wide=data.stages.findIndex((p,i)=>i>index&&p.id==='edge');
  if(wide<0){
   decisions.push('no later coach-authored wide carry in this branch');
   defenseReport();return;
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
function render(){if(!data)return;const p=data.stages[index];for(let n=1;n<=15;n++){const pos=p.positions[n];markers[n].setAttribute('transform','translate('+pos[0]+' '+pos[1]+')');markers[n].setAttribute('opacity',p.active.includes(n)?'1':'.6');}
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
$('[data-replay]').addEventListener('click',()=>{pause();cancelBall();previousStage=null;index=0;crashes=0;recovery=0;decisions=[];render();});
$('[data-branch]').addEventListener('change',e=>{crashes=0;recovery=0;decisions=[];load(e.target.value);});
$('[data-defense-toggle]').addEventListener('change',defenseReport);
$('[data-strategy]').addEventListener('change',()=>{crashes=0;recovery=0;decisions=[];defenseReport();});
$('[data-crash]').addEventListener('click',()=>chooseDecision('crash'));
$('[data-wide]').addEventListener('click',()=>chooseDecision('wide'));
$('[data-reset-defense]').addEventListener('click',()=>{crashes=0;decisions=[];defenseReport();});
load('wedge');
})();
