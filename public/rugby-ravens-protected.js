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
.quins-ravens-live [data-ball]{transition:transform 750ms ease}
.quins-ravens-live button:disabled{opacity:.45}
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
<g data-players></g><ellipse data-ball rx="8" ry="5" fill="#fff" stroke="#694f27" stroke-width="2"/>
<text x="12" y="251" font-size="11" fill="#fff">Gold: attackers 1–15 · White: ball</text></svg>
<div><button data-prev>Previous</button><button data-next>Next phase</button><button data-play>▶ Play</button><button data-pause>Pause</button><button data-replay>Watch again</button></div>
<div data-explain role="status" aria-live="polite"></div><p style="font-size:.83rem">Restricted Quin training. FLASH is a coach-sourced option; unspecified carrier movement is not invented.</p>
</div>`;
host.prepend(root);
const $=s=>root.querySelector(s),svgNS='http://www.w3.org/2000/svg',doc=root.ownerDocument,players=$('[data-players]'),markers={};
for(let n=1;n<=15;n++){const g=doc.createElementNS(svgNS,'g');g.setAttribute('data-p',String(n));const c=doc.createElementNS(svgNS,'circle');c.setAttribute('r','12');c.setAttribute('fill','#e4c77d');c.setAttribute('stroke','#152b1f');c.setAttribute('stroke-width','2');const t=doc.createElementNS(svgNS,'text');t.textContent=n;t.setAttribute('text-anchor','middle');t.setAttribute('y','4');t.setAttribute('fill','#152b1f');t.setAttribute('font-size','11');t.setAttribute('font-weight','800');g.append(c,t);players.appendChild(g);markers[n]=g;}
let data=null,index=0,timer=null,requestId=0;
function pause(){if(timer!==null)clearInterval(timer);timer=null;}
function render(){if(!data)return;const p=data.stages[index];for(let n=1;n<=15;n++){const pos=p.positions[n];markers[n].setAttribute('transform','translate('+pos[0]+' '+pos[1]+')');markers[n].setAttribute('opacity',p.active.includes(n)?'1':'.6');}
const ball=p.ballCarrier?p.positions[p.ballCarrier]:null;$('[data-ball]').setAttribute('opacity',ball?'1':'0');if(ball)$('[data-ball]').setAttribute('transform','translate('+(ball[0]+14)+' '+(ball[1]-7)+')');
$('[data-explain]').textContent='PHASE '+p.step+'/'+data.stages.length+' · '+p.title+' — '+p.instruction+(p.ballCarrier?' Ball: #'+p.ballCarrier:' Ball secured at ruck / next carrier unspecified.');
$('[data-prev]').disabled=index===0;$('[data-next]').disabled=index===data.stages.length-1;}
async function load(branch){pause();const id=++requestId;data=null;index=0;$('[data-content]').hidden=true;$('[data-gate]').textContent='Checking Quin team authorization…';
const result=await window.MaatApiClient.request('/api/quins/ravens/play?branch='+encodeURIComponent(branch));
if(id!==requestId)return;
if(!result.ok){$('[data-gate]').textContent=result.diagnostics?.status===403?'Quin team enrollment required. Your account is signed in but not authorized for this playbook.':result.diagnostics?.status===401?'Sign in again to access the protected Quin playbook.':'Unable to load protected RAVENS playbook. Retry after deployment.';return;}
if(!result.payload||!Array.isArray(result.payload.stages)||!result.payload.stages.length){$('[data-gate]').textContent='Playbook response invalid.';return;}
data=result.payload;$('[data-gate]').textContent='Coach-approved RAVENS MF loaded securely.';$('[data-content]').hidden=false;render();}
$('[data-prev]').addEventListener('click',()=>{pause();index=Math.max(0,index-1);render();});
$('[data-next]').addEventListener('click',()=>{pause();index=Math.min(data.stages.length-1,index+1);render();});
$('[data-play]').addEventListener('click',()=>{pause();if(!data)return;if(index===data.stages.length-1)index=0;render();timer=setInterval(()=>{if(index===data.stages.length-1){pause();return;}index++;render();},2100);});
$('[data-pause]').addEventListener('click',pause);
$('[data-replay]').addEventListener('click',()=>{pause();index=0;render();});
$('[data-branch]').addEventListener('change',e=>load(e.target.value));
load('wedge');
})();
