(function(){
'use strict';
const host=document.getElementById('quins-structure-lesson');if(!host)return;
const root=document.createElement('section');root.className='quins-watch-first';
root.innerHTML=`<style>
.quins-watch-first{margin:18px 0;padding:16px;border:1px solid #bda76b;border-radius:16px;background:#162e23;color:#f2f5ee}
.quins-watch-first h3{margin:4px 0}.quins-watch-first p{line-height:1.5}.quins-watch-first svg{width:100%;height:auto;background:#174632;border-radius:12px;border:1px solid #67816c}
.quins-watch-first button{min-height:48px;margin:5px 5px 5px 0;padding:12px;border-radius:10px;background:#ddc384;color:#132a20;font-weight:800}
.quins-watch-first .ball{fill:#fff8df;stroke:#5a3b1d;stroke-width:2}
.quins-watch-first .attacker{fill:#ddc384;stroke:#10271c;stroke-width:2}.quins-watch-first .defender{fill:#d87776;stroke:#fff;stroke-width:2}
.quins-watch-first .arrow{stroke:#fff1b2;stroke-width:4;fill:none;stroke-linecap:round;stroke-linejoin:round}
.quins-watch-first [data-narration]{background:#294636;padding:12px;border-radius:9px;min-height:70px}
.quins-watch-first button:disabled{opacity:.45}
</style><h3>WATCH FIRST · How a rugby pass creates space</h3>
<p>This is a <strong>generic teaching example, not an official Quin play</strong>. Watch the ball move left to right, see the defender commit, and learn why the pass happens before contact. Then explore your own decisions in the sandbox below.</p>
<svg viewBox="0 0 380 240" role="img" aria-label="Rugby example: attackers moving left to right with one ball carrier, support runner and two defenders">
<defs><marker id="quins-demo-tip" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#fff1b2" stroke-width="1.5"/></marker></defs>
<rect x="1" y="1" width="378" height="238" rx="12" fill="#174632"/>
<g stroke="#a4c4aa" stroke-dasharray="5 7" opacity=".45"><path d="M80 10V230M160 10V230M240 10V230M320 10V230M10 70H370M10 160H370"/></g>
<path d="M18 22H358" stroke="#fff1b2" stroke-width="4" marker-end="url(#quins-demo-tip)"/>
<text x="20" y="43" fill="#fff1b2" font-size="15" font-weight="800">ATTACK DIRECTION →</text>
<path data-route d="M100 124L178 124" class="arrow" stroke-dasharray="7 7" opacity=".4"/>
<path data-pass d="M178 124L151 187" class="arrow" stroke-dasharray="6 6" opacity="0"/>
<g data-c><circle class="attacker" r="17"/><text text-anchor="middle" y="5" font-weight="800" fill="#10271c">C</text></g>
<g data-s><circle class="attacker" r="17"/><text text-anchor="middle" y="5" font-weight="800" fill="#10271c">S</text></g>
<g data-d1><circle class="defender" r="17"/><text text-anchor="middle" y="5" font-weight="800" fill="white">D1</text></g>
<g data-d2><circle class="defender" r="17"/><text text-anchor="middle" y="5" font-weight="800" fill="white">D2</text></g>
<ellipse data-ball class="ball" rx="8" ry="5"/>
<text x="14" y="226" font-size="11" fill="#fff">C = carrier · S = support · D = defender</text>
</svg>
<div><button data-start>▶ Watch example</button><button data-step>Next step</button><button data-again>↺ Watch again</button><button data-stop>Pause</button></div>
<p data-narration role="status" aria-live="polite"></p>
<p style="font-size:.84rem;color:#c7d7ca">Explore after watching: What if the carrier holds the ball? What if the defender drifts toward support? What if the pass comes earlier? The sandbox below lets you test alternatives.</p>`;
host.prepend(root);
const $=s=>root.querySelector(s),set=(s,x,y)=>$(s).setAttribute('transform',`translate(${x} ${y})`);
const frames=[
 {label:'1 / 5 · SETUP',n:'Carrier C starts with the ball. Support S stays behind and wider. Attack moves LEFT → RIGHT. Defenders are ahead, with clear separation.',c:[95,122],s:[65,187],d1:[255,123],d2:[305,183],ball:[107,116],owner:'c'},
 {label:'2 / 5 · APPROACH',n:'Both attackers advance. The carrier threatens the inside shoulder. The defenders have not made contact.',c:[139,122],s:[107,187],d1:[252,123],d2:[304,183],ball:[151,116],owner:'c'},
 {label:'3 / 5 · DRAW',n:'The carrier advances and holds D1 in the inside channel. D2 stays wider. Watch the space open outside.',c:[176,122],s:[145,187],d1:[233,123],d2:[298,183],ball:[188,116],owner:'c'},
 {label:'4 / 5 · PASS BEFORE CONTACT',n:'C releases the ball BACKWARD to S before reaching D1. The white oval shows the ball; the dashed line shows its path.',c:[184,122],s:[162,187],d1:[227,123],d2:[291,183],ball:[172,159],owner:'flight'},
 {label:'5 / 5 · SUPPORT RECEIVES',n:'S catches behind the carrier and attacks the open channel. D2 can still recover; this example demonstrates a decision, not a guaranteed score.',c:[187,122],s:[218,187],d1:[222,123],d2:[282,183],ball:[230,181],owner:'s'}
];let idx=0,timer=null;
function stop(){if(timer!==null){clearInterval(timer);timer=null;}}
function render(){const f=frames[idx];set('[data-c]',...f.c);set('[data-s]',...f.s);set('[data-d1]',...f.d1);set('[data-d2]',...f.d2);set('[data-ball]',...f.ball);$('[data-pass]').setAttribute('opacity',idx===3?'1':'0');$('[data-route]').setAttribute('opacity',idx<3?'.4':'0');$('[data-narration]').textContent=f.label+' — '+f.n;$('[data-step]').disabled=idx===frames.length-1;}
function next(){if(idx<frames.length-1){idx++;render();}else stop();}
$('[data-step]').addEventListener('click',()=>{stop();next();});
$('[data-start]').addEventListener('click',()=>{stop();idx=0;render();timer=setInterval(()=>{if(idx===frames.length-1){stop();return;}next();},2300);});
$('[data-again]').addEventListener('click',()=>{stop();idx=0;render();});
$('[data-stop]').addEventListener('click',stop);
render();
})();
