/* Three.js is a VIEW of the original Rugby IQ SVG engines, never a second tactics engine. */
(async function(){
'use strict';
let THREE;
try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');}
catch(e){console.warn('Three.js unavailable; original drills remain playable',e);return;}
const drills=[
 {svg:'.quins-simulator svg.quins-sim-pitch',ids:['quins-sim-carrier','quins-sim-support','quins-sim-defender','quins-sim-cover'],ball:'quins-sim-ball',title:'2v1 decision drill',controlRoot:'.quins-simulator',excludeRoot:'.quins-3v2, .quins-ravens-live'},
 {svg:'#q32-pitch',ids:['q32-a1','q32-a2','q32-a3','q32-d1','q32-d2'],ball:'q32-ball',title:'3v2 overlap drill',controlRoot:'.quins-3v2'},
 {svg:'.quins-ravens-live svg',selectors:Array.from({length:15},(_,i)=>'[data-players] [data-p="'+(i+1)+'"]'),defenseSelector:'[data-defense] circle',drillSelector:'[data-drill] circle',ballSelector:'[data-ball]',title:'Protected RAVENS MF playbook',controlRoot:'.quins-ravens-live'}
];
function init(cfg){
 const svg=document.querySelector(cfg.svg);if(!svg||svg.dataset.threeMirror)return;
 svg.dataset.threeMirror='true';
 const wrapper=document.createElement('div');wrapper.style.cssText='position:relative;width:100%;';
 svg.parentNode.insertBefore(wrapper,svg);wrapper.appendChild(svg);
 const canvas=document.createElement('div');canvas.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:12px;display:none';wrapper.appendChild(canvas);
 const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:8px 0';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='View: Three.js';toggle.setAttribute('aria-pressed','false');
 const cameraButton=document.createElement('button');cameraButton.type='button';cameraButton.textContent='Camera angle';cameraButton.hidden=true;
 controls.append(toggle,cameraButton);wrapper.parentNode.insertBefore(controls,wrapper);
 const expand=document.createElement('button');expand.type='button';expand.textContent='⛶ Expand pitch';controls.appendChild(expand);
 const portal=document.createElement('div');portal.setAttribute('role','dialog');portal.setAttribute('aria-label',cfg.title+' expanded pitch');portal.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0b1c15;color:#fff;display:none;flex-direction:column;padding:env(safe-area-inset-top) 10px env(safe-area-inset-bottom);box-sizing:border-box';
 const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:7px 0';
 const mk=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:10px;border-radius:9px;background:#e4c783;color:#10251a;font-weight:700';b.onclick=fn;toolbar.appendChild(b);return b;};
 const stage=document.createElement('div');stage.style.cssText='flex:1;min-height:0;position:relative;overflow:hidden;border:1px solid #bca36c;border-radius:12px';
 const panel=document.createElement('div');panel.style.cssText='display:none;position:absolute;z-index:3;inset:8px auto auto 8px;max-height:85%;width:min(340px,calc(100% - 16px));overflow:auto;background:#142d22;border:1px solid #bca36c;padding:12px;border-radius:12px;box-sizing:border-box';
 const count=document.createElement('div');count.style.cssText='display:none;position:absolute;inset:0;z-index:4;align-items:center;justify-content:center;background:#091c13a8;font-size:76px;font-weight:800;color:#f5d58d;pointer-events:none';
 stage.append(panel,count);portal.append(toolbar,stage);document.body.appendChild(portal);
 const sourceRoot=wrapper.parentElement;const canvasHome=document.createComment('three canvas original position');wrapper.insertBefore(canvasHome,canvas);
 let expanded=false,zoom=1,turn=0,tilt=0,pending=null;
 function close(){if(pending){clearTimeout(pending);pending=null;}count.style.display='none';panel.style.display='none';expanded=false;portal.style.display='none';wrapper.insertBefore(canvas,canvasHome.nextSibling);canvas.style.position='absolute';canvas.style.inset='0';canvas.style.height='';document.body.style.overflow=portal.dataset.prevOverflow||'';pose();}
 function open(){if(!enabled)toggle.click();expanded=true;portal.dataset.prevOverflow=document.body.style.overflow;document.body.style.overflow='hidden';portal.style.display='flex';stage.insertBefore(canvas,panel);canvas.style.position='absolute';canvas.style.inset='0';canvas.style.height='100%';pose();}
 expand.onclick=open;
 mk('✕ Close',close);mk('⚙ Controls',()=>{panel.style.display=panel.style.display==='none'?'block':'none';refreshPanel();});mk('↻ Angle',()=>{angle=(angle+1)%3;pose();});mk('＋ Zoom',()=>{zoom=Math.min(2.6,zoom+.25);pose();});mk('－ Zoom',()=>{zoom=Math.max(.7,zoom-.25);pose();});mk('⟲ Reset view',()=>{zoom=1;turn=0;tilt=0;angle=0;pose();});
 let startX=0,startY=0;stage.addEventListener('pointerdown',e=>{if(e.target.closest('button')||panel.contains(e.target))return;startX=e.clientX;startY=e.clientY;stage.setPointerCapture(e.pointerId);});stage.addEventListener('pointerup',e=>{if(!expanded||panel.contains(e.target))return;turn=Math.max(-1.2,Math.min(1.2,turn+(e.clientX-startX)*.006));tilt=Math.max(-.5,Math.min(.5,tilt+(e.clientY-startY)*.003));pose();});
 function countdownPlay(button){
  if(pending){clearTimeout(pending);pending=null;}
  panel.style.display='none';count.style.display='flex';count.textContent='2';
  pending=setTimeout(()=>{count.textContent='1';pending=setTimeout(()=>{count.style.display='none';pending=null;button.click();},1000);},1000);
 }
 function sourceButtons(){
  const scope=svg.closest(cfg.controlRoot);if(!scope)return [];
  return [...scope.querySelectorAll('button')].filter(b=>!portal.contains(b)&&!controls.contains(b)&&!b.disabled&&b.getClientRects().length>0&&(!cfg.excludeRoot||!b.closest(cfg.excludeRoot)));
 }
 function refreshPanel(){
  panel.replaceChildren();
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='✕ Close controls';dismiss.style.cssText='float:right;min-height:44px;padding:8px;background:#e4c783;color:#10251a;border-radius:8px;font-weight:800';dismiss.onclick=()=>{panel.style.display='none';};panel.appendChild(dismiss);
   const heading=document.createElement('h2');heading.textContent='MISSION CONTROL';heading.style.cssText='margin:0;color:#f3d68c;letter-spacing:.12em;font-size:18px';panel.appendChild(heading);
  const sub=document.createElement('p');sub.textContent=cfg.title+' · Choose one option in each step, then launch.';sub.style.cssText='color:#cbd8cf;font-size:14px;line-height:1.5';panel.appendChild(sub);
  const buttons=sourceButtons(),scope=svg.closest(cfg.controlRoot);
  if(!scope){sub.textContent='Controls unavailable for this drill.';return;}
   const edit=scope.querySelector('#quins-sim-edit');
   if(cfg.title.startsWith('2v1')&&edit){const resetScenario=document.createElement('button');resetScenario.type='button';resetScenario.textContent='↺ Reset scenario to change choices';resetScenario.style.cssText='width:100%;min-height:48px;margin:10px 0;background:#e4c783;color:#10251a;border-radius:10px;font-weight:800';resetScenario.onclick=()=>{edit.click();refreshPanel();};panel.appendChild(resetScenario);}
  const groups=cfg.title.startsWith('2v1')?[
   {name:'01 · SUPPORT LANE',hint:'Where will your teammate run?',match:/place support (inside|outside)/i},
   {name:'02 · DEFENSIVE DRAW',hint:'Which direction will you commit the defender?',match:/draw defenders (inside|outside)/i},
   {name:'03 · FINISHING ACTION',hint:'Choose the move to execute.',match:/position & pass|draw & pass|dummy & go outside|dummy & cut inside|kick & chase/i}
  ]:[{name:'SCENARIO ACTIONS',hint:'Select the controls for this drill.',match:/./}];
  const used=new Set();
  for(const group of groups){
   const section=document.createElement('section');section.style.cssText='margin:12px 0;padding:13px;border:1px solid #668978;border-radius:14px;background:linear-gradient(135deg,#1e4132,#10291f)';
   const title=document.createElement('h3');title.textContent=group.name;title.style.cssText='margin:0;color:#f3d68c;font-size:15px;letter-spacing:.07em';section.appendChild(title);
   const hint=document.createElement('p');hint.textContent=group.hint;hint.style.cssText='margin:5px 0 12px;font-size:13px;color:#c5d6ca';section.appendChild(hint);
   const options=document.createElement('div');options.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px';
   for(const b of buttons){const label=(b.textContent||'').trim();if(used.has(b)||!group.match.test(label)||/camera angle|view:|debug|play scenario|replay|change plan/i.test(label))continue;used.add(b);
    const proxy=document.createElement('button');proxy.type='button';proxy.textContent=label;proxy.style.cssText='min-height:48px;padding:9px 7px;border-radius:10px;border:1px solid #ad9460;background:#345b44;color:#fff2cb;font-size:14px;font-weight:750;white-space:normal;text-align:center';
    const active=()=>b.getAttribute('aria-pressed')==='true'||b.classList.contains('active')||b.classList.contains('selected');
    if(active()){proxy.style.background='#e4c783';proxy.style.color='#11271c';proxy.textContent='✓ '+label;}
    proxy.onclick=()=>{b.click();refreshPanel();};options.appendChild(proxy);
   }
   if(options.childElementCount){section.appendChild(options);panel.appendChild(section);}
  }
  const selectors=[...scope.querySelectorAll('select')].filter(el=>el.getClientRects().length>0);
  if(!cfg.title.startsWith('2v1'))for(const select of selectors.slice(0,2)){const copy=select.cloneNode(true);copy.value=select.value;copy.style.cssText='width:100%;margin:8px 0;padding:10px';copy.onchange=()=>{select.value=copy.value;select.dispatchEvent(new Event('change',{bubbles:true}));};panel.appendChild(copy);}
  const launch=document.createElement('button');launch.type='button';launch.textContent='▶ EXECUTE SCENARIO · 2s COUNTDOWN';launch.style.cssText='width:100%;margin-top:12px;padding:15px 8px;border:1px solid #f4df9b;border-radius:12px;background:#e4c783;color:#11271c;font-weight:900;letter-spacing:.02em';
  launch.onclick=()=>{const play=buttons.find(b=>/play scenario|start drill|^play$/i.test((b.textContent||'').trim()));if(play&&!play.disabled)countdownPlay(play);else{sub.textContent='Choose support, defender draw and finishing action first. If controls are locked, use Reset scenario above.';}};
  panel.appendChild(launch);
 }
 mk('▶ Play / Replay',()=>{if(cfg.title.startsWith('2v1')){const scope=svg.closest(cfg.controlRoot);const replay=scope?.querySelector('#quins-sim-watch');if(replay&&!replay.hidden){panel.style.display='none';count.style.display='none';scope.dispatchEvent(new Event('quins:replay-selected'));return;}}const buttons=sourceButtons();const replay=buttons.find(x=>/watch again|replay/i.test((x.textContent||'').trim()));const play=buttons.find(x=>/play scenario|start drill|^play$/i.test((x.textContent||'').trim()));const target=replay||play;if(target)countdownPlay(target);else{panel.style.display='block';refreshPanel();}});
 mk('Change scenario',()=>{if(cfg.title.startsWith('2v1')){const scope=svg.closest(cfg.controlRoot);scope?.querySelector('#quins-sim-edit')?.click();}panel.style.display='block';refreshPanel();});
 document.addEventListener('keydown',e=>{if(expanded&&e.key==='Escape')close();});
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x14291f);
 const camera=new THREE.PerspectiveCamera(48,1,.1,300);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.domElement.style.cssText='display:block;width:100%;height:100%';canvas.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x496b55,2));
 const field=new THREE.Mesh(new THREE.PlaneGeometry(34,21),new THREE.MeshLambertMaterial({color:0x286547}));field.rotation.x=-Math.PI/2;scene.add(field);
 for(let x=-15;x<=15;x+=10){const line=new THREE.Mesh(new THREE.BoxGeometry(.045,.025,20),new THREE.MeshBasicMaterial({color:0xb6d2b9}));line.position.set(x,.025,0);scene.add(line);}
 // Rugby H-posts at each end of the teaching pitch (illustrative scale).
 const postMaterial=new THREE.MeshStandardMaterial({color:0xf2e6c6});
 for(const end of [-16.6,16.6]){
  for(const z of [-2.6,2.6]){const upright=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,5.5,8),postMaterial);upright.position.set(end,2.75,z);scene.add(upright);}
  const crossbar=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,5.2,8),postMaterial);crossbar.rotation.x=Math.PI/2;crossbar.position.set(end,2.8,0);scene.add(crossbar);
 }
 const pieces={};const ball=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),new THREE.MeshStandardMaterial({color:0xffedba}));scene.add(ball);
 const sources=cfg.selectors?cfg.selectors.map(selector=>({selector,defender:false})):cfg.ids.map(id=>({id,defender:id.includes('defender')||id.includes('cover')||id.includes('-d')}));
 if(cfg.defenseSelector)for(let i=0;i<15;i++)sources.push({selector:cfg.defenseSelector,index:i,defender:true});
 if(cfg.drillSelector)for(let i=0;i<15;i++)sources.push({selector:cfg.drillSelector,index:i,defender:i>=8});
 sources.forEach((source,i)=>{const defender=source.defender;const id='piece-'+i;const obj=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,1.55,10),new THREE.MeshStandardMaterial({color:defender?0xd76b6d:0xe6c77b}));body.position.y=.82;obj.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.36,12,10),new THREE.MeshStandardMaterial({color:0xd9a47b}));head.position.y=1.85;obj.add(head);scene.add(obj);pieces[id]=obj;source.object=obj;});
 let angle=0,enabled=false,raf=0;
 function pose(){const poses=[[0,37,37],[-27,35,31],[0,48,.1]];const [x,y,z]=poses[angle];camera.position.set((x*Math.cos(turn)-z*Math.sin(turn))/zoom,(y+tilt*12)/zoom,(x*Math.sin(turn)+z*Math.cos(turn))/zoom);camera.lookAt(0,0,0);}
 pose();
 function point(el){
  if(!el)return null;
  const r=el.getBoundingClientRect(),b=svg.getBoundingClientRect();if(!b.width||!b.height)return null;
  // SVG stays mounted in its original layout. Read node centers in its own viewBox.
  // This keeps native scenario event handlers and coordinates unchanged in fullscreen.
  const vb=svg.viewBox.baseVal;
  if(!vb||!vb.width||!vb.height)return null;
  const ctm=svg.getScreenCTM();if(!ctm)return null;
  const local=new DOMPoint(r.left+r.width/2,r.top+r.height/2).matrixTransform(ctm.inverse());
  return {x:((local.x-vb.x)/vb.width-.5)*32,z:((local.y-vb.y)/vb.height-.5)*20};
 }
 function frame(){
  if(!enabled)return;
  const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  for(const source of sources){const el=source.id?document.getElementById(source.id):source.index===undefined?svg.querySelector(source.selector):svg.querySelectorAll(source.selector)[source.index];
   const visible=el&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none';
   source.object.visible=!!visible;if(visible){const p=point(el);if(p)source.object.position.set(p.x,0,p.z);}
  }
  const ballEl=cfg.ballSelector?svg.querySelector(cfg.ballSelector):document.getElementById(cfg.ball);
  ball.visible=!!ballEl&&getComputedStyle(ballEl).visibility!=='hidden'&&getComputedStyle(ballEl).opacity!=='0';
  const p=point(ballEl);if(p)ball.position.set(p.x,1.35,p.z);
  renderer.render(scene,camera);raf=requestAnimationFrame(frame);
 }
 toggle.onclick=()=>{enabled=!enabled;canvas.style.display=enabled?'block':'none';svg.style.opacity=enabled?'0':'';svg.style.pointerEvents=enabled?'none':'';toggle.textContent=enabled?'View: Original nodes':'View: Three.js';toggle.setAttribute('aria-pressed',String(enabled));cameraButton.hidden=!enabled;if(enabled)frame();else cancelAnimationFrame(raf);};
 cameraButton.onclick=()=>{angle=(angle+1)%3;pose();};
}
let attempts=0;const check=()=>{drills.forEach(init);if(++attempts<30&&drills.some(d=>!document.querySelector(d.svg)))setTimeout(check,500)};check();
})();