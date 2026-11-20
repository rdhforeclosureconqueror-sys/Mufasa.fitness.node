(function(){
'use strict';
const host=document.querySelector('.quins-simulator');if(!host)return;
const root=document.createElement('section');root.className='quins-3v2';root.innerHTML=`
<style>
.quins-3v2{margin:24px 0;padding:15px;border:1px solid #638469;border-radius:14px;background:#1b3025;color:#f1f4eb}
.quins-3v2 h3{margin:6px 0}.quins-3v2 p{line-height:1.45}
.quins-3v2 svg{width:100%;height:auto;display:block;background:#16412e;border:1px solid #64846a;border-radius:12px;touch-action:none}
.quins-3v2 .actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
.quins-3v2 button{padding:11px 7px;min-height:48px;border-radius:10px;font-weight:750;background:#ddc586;color:#17251a;border:0}
.quins-3v2 button[aria-pressed=true]{outline:3px solid white;outline-offset:1px}
.quins-3v2 button:disabled{opacity:.45}.quins-3v2 .status{padding:12px;border:1px solid #6c8a70;border-radius:10px;min-height:48px}
.quins-3v2 .piece{cursor:grab;touch-action:none}.quins-3v2 .piece circle{stroke:#f6e6b5;stroke-width:2}.quins-3v2 .piece text{font-size:12px;font-weight:800;text-anchor:middle;pointer-events:none;fill:#193325}
.quins-3v2 .piece[data-ball=true] circle{stroke:white;stroke-width:4}
.quins-3v2 .hint{font-size:.84rem;color:#d2ddd2}
</style>
<div class="quins-sim-progress">RUGBY IQ · 3 V 2 · BUILD THE OVERLAP</div>
<h3>Three attackers. Two defenders. You create the space.</h3>
<p>Drag any gold attacker to set your spacing. Tap the attacker who starts with the ball, choose who receives it, then watch the two defenders react. The ball must move backward or flat—not forward.</p>
<svg viewBox="0 0 360 230" aria-label="Draggable three attacker two defender rugby scenario" id="q32-pitch">
<rect width="360" height="230" rx="12" fill="#16412e"/>
<g stroke="#aac7aa" opacity=".4" stroke-dasharray="5 6"><path d="M12 35H348M12 195H348M120 15V215M240 15V215"/></g>
<path id="q32-pass" stroke="#f7e2a4" stroke-width="2.5" stroke-dasharray="5 5" opacity="0"/>
<g id="q32-a1" class="piece"><circle r="17" fill="#e4c67f"/><text y="4">A1</text></g>
<g id="q32-a2" class="piece"><circle r="17" fill="#e4c67f"/><text y="4">A2</text></g>
<g id="q32-a3" class="piece"><circle r="17" fill="#e4c67f"/><text y="4">A3</text></g>
<g id="q32-d1"><circle r="16" fill="#db7773"/><text y="4" fill="white" text-anchor="middle" font-size="12" font-weight="800">D1</text></g>
<g id="q32-d2"><circle r="16" fill="#db7773"/><text y="4" fill="white" text-anchor="middle" font-size="12" font-weight="800">D2</text></g>
<ellipse id="q32-ball" rx="7" ry="4" fill="#fff3c6" stroke="#684e28" stroke-width="1.5"/>
<text x="12" y="222" font-size="10" fill="white">ATTACK →</text>
</svg>
<div class="actions" id="q32-owners"><button data-owner="a1" aria-pressed="true">Ball starts A1</button><button data-owner="a2">Ball starts A2</button><button data-owner="a3">Ball starts A3</button></div>
<div class="actions" id="q32-targets"><button data-target="a1">Pass to A1</button><button data-target="a2" aria-pressed="true">Pass to A2</button><button data-target="a3">Pass to A3</button><button data-target="carry">Keep & run</button></div>
<h3>Build your attacking sequence</h3>
<p class="hint">Choose the draw and finishing move for phase one. If you pass, configure phase two for the receiver. The defense reacts; you do not control it.</p>
<div class="actions"><button data-draw="inside" aria-pressed="true">Draw defenders inside</button><button data-draw="outside">Draw defenders outside</button></div>
<div class="actions"><button data-action="pass" aria-pressed="true">Draw &amp; pass</button><button data-action="dummy-outside">Dummy &amp; go outside</button><button data-action="dummy-inside">Dummy &amp; cut inside</button><button data-action="carry">Advance / keep</button><button data-action="kick">Kick &amp; chase</button></div>
<div class="actions"><button data-kick="left">Kick left</button><button data-kick="center" aria-pressed="true">Kick center</button><button data-kick="right">Kick right</button></div>
<h3>Phase two · After the first catch</h3>
<div class="actions"><button data-next="pass" aria-pressed="true">Pass again</button><button data-next="carry">Keep &amp; run</button><button data-next="dummy-outside">Dummy outside</button><button data-next="dummy-inside">Cut inside</button><button data-next="kick">Kick &amp; chase</button></div>
<div class="actions"><button data-final="a1">Next pass A1</button><button data-final="a2">Next pass A2</button><button data-final="a3" aria-pressed="true">Next pass A3</button></div>
<p class="hint" id="q32-plan-summary">Phase 1: draw inside, pass to A2. Phase 2: pass to A3.</p>
<div class="actions"><button id="q32-play">▶ Play 3v2</button><button id="q32-replay" disabled>↺ Watch again</button><button id="q32-reset">✎ Reset positions</button><button id="q32-edit">Change formation</button></div>
<p class="status" id="q32-status" role="status" aria-live="polite">Set three attackers and choose ball holder and target. Drag players directly on the pitch.</p>
<p class="hint">Coaching model: defenders step up to the ball threat and protect separate channels. Good spacing creates options; a forward pass or a marked receiver is not rewarded. Watch Again replays the same setup.</p>
`;
host.insertAdjacentElement('afterend',root);
const $=id=>root.querySelector('#q32-'+id);
const svg=$('pitch'),ball=$('ball'),status=$('status');
const start={a1:{x:80,y:115},a2:{x:53,y:62},a3:{x:53,y:173}};
const pos=JSON.parse(JSON.stringify(start)),def={d1:{x:242,y:92},d2:{x:242,y:157}};
let owner='a1',target='a2',draw='inside',action='pass',kick='center',next='pass',finalTarget='a3',phase='setup',timers=[],frame=null,drag=null,playing=false;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const el=id=>$((id));
function drawPlayer(id){el(id).setAttribute('transform','translate('+pos[id].x+' '+pos[id].y+')');}
function drawDefense(){for(const id of ['d1','d2'])el(id).setAttribute('transform','translate('+def[id].x+' '+def[id].y+')');}
function ballAt(x,y){ball.setAttribute('cx',x);ball.setAttribute('cy',y);}
function follow(id){ballAt(pos[id].x+17,pos[id].y-7);}
function render(){for(const id of Object.keys(pos))drawPlayer(id);drawDefense();if(owner!=='flight')follow(owner);for(const b of root.querySelectorAll('[data-owner]'))b.setAttribute('aria-pressed',String(b.dataset.owner===owner));for(const b of root.querySelectorAll('[data-target]'))b.setAttribute('aria-pressed',String(b.dataset.target===target));for(const id of Object.keys(pos))el(id).dataset.ball=String(owner===id);}
function cancel(){for(const t of timers)clearTimeout(t);timers=[];if(frame!==null)cancelAnimationFrame(frame);frame=null;}
function later(fn,ms){timers.push(setTimeout(fn,ms));}
function tween(duration,update,done){const t0=performance.now();const tick=now=>{if(!playing)return;const p=clamp((now-t0)/duration,0,1);update(p);if(p<1)frame=requestAnimationFrame(tick);else{frame=null;if(done)done();}};frame=requestAnimationFrame(tick);}
function step(moves,ms,done){const initial={};for(const [id] of Object.entries(moves))initial[id]=id in pos?{...pos[id]}:{...def[id]};tween(ms,p=>{for(const [id,to] of Object.entries(moves)){const a=initial[id],v={x:a.x+(to.x-a.x)*p,y:a.y+(to.y-a.y)*p};if(id in pos)pos[id]=v;else def[id]=v;}render();},done);}
function planSummary(){ $('plan-summary').textContent='Phase 1: '+draw+', '+action+(action==='pass'?' to '+target.toUpperCase():'')+(action==='kick'?' '+kick:'')+' · Phase 2: '+next+(next==='pass'?' to '+finalTarget.toUpperCase():''); }
function chooseOwner(id){if(phase!=='setup')return;owner=id;if(target===owner)target=owner==='a1'?'a2':'a1';render();planSummary();status.textContent=id.toUpperCase()+' starts with the ball. Drag attackers to adjust their spacing.';}
function chooseTarget(id){if(phase!=='setup')return;target=id;render();planSummary();status.textContent=id==='carry'?'Carrier will keep and run.':'Planned pass to '+id.toUpperCase()+'.';}
for(const [attribute,read,write] of [['draw',()=>draw,v=>draw=v],['action',()=>action,v=>action=v],['kick',()=>kick,v=>kick=v],['next',()=>next,v=>next=v],['final',()=>finalTarget,v=>finalTarget=v]]){root.querySelectorAll('[data-'+attribute+']').forEach(b=>b.addEventListener('click',()=>{if(phase!=='setup')return;write(b.dataset[attribute]);root.querySelectorAll('[data-'+attribute+']').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));planSummary();}));}
root.querySelectorAll('[data-owner]').forEach(b=>b.addEventListener('click',()=>chooseOwner(b.dataset.owner)));
root.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>chooseTarget(b.dataset.target)));
for(const id of Object.keys(pos)){const node=el(id);node.addEventListener('pointerdown',e=>{if(phase!=='setup')return;drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};node.setPointerCapture(e.pointerId);});node.addEventListener('pointermove',e=>{if(!drag||drag.id!==id||drag.pointer!==e.pointerId)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());pos[id].x=clamp(local.x,28,190);pos[id].y=clamp(local.y,28,195);drag.moved=true;render();});node.addEventListener('pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;const moved=drag.moved;drag=null;if(!moved)chooseOwner(id);else status.textContent='Formation updated. '+id.toUpperCase()+' repositioned.';});node.addEventListener('pointercancel',()=>{drag=null;});}
function snapshot(){return {pos:JSON.parse(JSON.stringify(pos)),owner,target,draw,action,kick,next,finalTarget};}
let saved=null;
function restore(s){cancel();playing=false;phase='setup';Object.assign(pos,JSON.parse(JSON.stringify(s.pos)));owner=s.owner;target=s.target;draw=s.draw||'inside';action=s.action||'pass';kick=s.kick||'center';next=s.next||'pass';finalTarget=s.finalTarget||'a3';for(const [key,value] of Object.entries({draw,action,kick,next,final:finalTarget}))root.querySelectorAll('[data-'+key+']').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));planSummary();def.d1={x:242,y:92};def.d2={x:242,y:157};$('pass').setAttribute('opacity',0);$('replay').disabled=true;$('play').disabled=false;render();}
function run(s){
restore(s);saved=s;phase='running';playing=true;$('play').disabled=true;$('replay').disabled=true;
let carrier=s.owner;let failed=false;let passes=0;
const say=t=>{status.textContent=t;};
function complete(t){playing=false;phase='result';$('replay').disabled=false;$('play').disabled=true;say(t+(failed?' · Review the spacing and decision.':' · Play complete.'));}
function travel(id,x,y,ms,done){step({[id]:{x:clamp(x,28,330),y:clamp(y,28,195)}},ms,done);}
function pass(to,done){
if(!to||to===carrier){failed=true;complete('INVALID PASS · Select another attacker to receive.');return;}
const from=carrier;
const origin={x:pos[from].x+17,y:pos[from].y-7},destination={x:pos[to].x+17,y:pos[to].y-7};
if(destination.x>origin.x+1){failed=true;complete('FORWARD PASS · '+to.toUpperCase()+' is ahead of the ball at release. Reposition the receiver behind or level.');return;}
passes++;owner='flight';$('pass').setAttribute('d','M'+origin.x+' '+origin.y+'L'+destination.x+' '+destination.y);$('pass').setAttribute('opacity','.6');
say('PASS '+passes+' · Ball travels backwards from '+from.toUpperCase()+' to '+to.toUpperCase()+'.');
tween(850,p=>ballAt(origin.x+(destination.x-origin.x)*p,origin.y+(destination.y-origin.y)*p),()=>{
owner=to;carrier=to;$('pass').setAttribute('opacity','0');render();
say('CATCH · '+to.toUpperCase()+' has possession. '+(passes===1?'Second phase begins.':'Support breaks into space.'));
done();
});
}
function finishAction(kind,recipient,done){
if(kind==='pass'){pass(recipient,done);return;}
if(kind==='kick'){
const direction=kick==='left'?-60:kick==='right'?60:0;
const origin={x:pos[carrier].x+17,y:pos[carrier].y-7};
owner='flight';say('KICK & CHASE · Ball kicked '+kick+' into space behind the stepped-up defenders.');
tween(950,p=>ballAt(origin.x+Math.min(125,340-origin.x)*p,origin.y+direction*p),()=>{failed=true;complete('KICK COMPLETE · Ball is loose ahead. Chase and regather are not yet simulated; no automatic try awarded.');});return;
}
const dy=kind==='dummy-outside'?-25:kind==='dummy-inside'?25:0;
say(kind==='carry'?'KEEP & RUN · Carrier advances with possession.':'DUMMY · Carrier feints and attacks '+(dy<0?'outside':'inside')+'.');
travel(carrier,pos[carrier].x+62,pos[carrier].y+dy,760,()=>{const distance=Math.min(...Object.values(def).map(d=>Math.hypot(d.x-pos[carrier].x,d.y-pos[carrier].y)));complete(distance<36?'CONTACT · Defender covers the carrier.':'SPACE · Carrier advances beyond the defensive line.');});
}
say('APPROACH · '+carrier.toUpperCase()+' advances with the ball. Three attackers against two defenders.');
travel(carrier,pos[carrier].x+38,pos[carrier].y,650,()=>{
const inside=s.draw==='inside'?1:-1;
say('DRAW '+s.draw.toUpperCase()+' · Both defenders step up to protect the threatened channel.');
const y=pos[carrier].y;
step({d1:{x:210,y:clamp(y-22*inside,30,190)},d2:{x:210,y:clamp(y+22*inside,30,190)}},650,()=>{
say('COUNTERSTEP · Carrier fixes the defense and releases before contact if passing.');
travel(carrier,pos[carrier].x+15,pos[carrier].y-16*inside,450,()=>{
finishAction(s.action,s.target,()=>{
if(s.action!=='pass'){complete('First phase complete.');return;}
say('PHASE TWO · '+carrier.toUpperCase()+' chooses the next move.');
travel(carrier,pos[carrier].x+18,pos[carrier].y,420,()=>finishAction(s.next,s.finalTarget,()=>{
travel(carrier,pos[carrier].x+65,pos[carrier].y,680,()=>complete('SECOND PASS COMPLETE · '+carrier.toUpperCase()+' accelerates with possession.'));
}));
});
});
});
});
}

$('play').addEventListener('click',()=>{if(phase==='setup')run(snapshot());});
$('replay').addEventListener('click',()=>{if(saved)run(saved);});
$('edit').addEventListener('click',()=>{if(saved){restore(saved);status.textContent='Edit the saved formation, ball starter and pass target, then Play.';}});
$('reset').addEventListener('click',()=>{restore({pos:start,owner:'a1',target:'a2',draw:'inside',action:'pass',kick:'center',next:'pass',finalTarget:'a3'});status.textContent='Reset. Drag any attacker to create your 3v2 formation.';saved=null;});
render();planSummary();
})();