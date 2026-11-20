/* Three.js is a VIEW of the original Rugby IQ SVG engines, never a second tactics engine. */
(async function(){
'use strict';
let THREE;
try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');}
catch(e){console.warn('Three.js unavailable; original drills remain playable',e);return;}
const drills=[
 {svg:'.quins-simulator svg.quins-sim-pitch',ids:['quins-sim-carrier','quins-sim-support','quins-sim-defender','quins-sim-cover'],ball:'quins-sim-ball',title:'2v1 decision drill'},
 {svg:'#q32-pitch',ids:['q32-a1','q32-a2','q32-a3','q32-d1','q32-d2'],ball:'q32-ball',title:'3v2 overlap drill'},
 {svg:'.quins-ravens-live svg',selectors:Array.from({length:15},(_,i)=>'[data-players] [data-p="'+(i+1)+'"]'),defenseSelector:'[data-defense] circle',drillSelector:'[data-drill] circle',ballSelector:'[data-ball]',title:'Protected RAVENS MF playbook'}
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
 const home=document.createComment('rugby pitch original position');wrapper.parentNode.insertBefore(home,wrapper);
 let expanded=false,zoom=1,turn=0,tilt=0,pending=null;
 function close(){if(pending){clearTimeout(pending);pending=null;}count.style.display='none';panel.style.display='none';expanded=false;portal.style.display='none';home.parentNode.insertBefore(wrapper,home.nextSibling);wrapper.style.cssText='position:relative;width:100%';document.body.style.overflow=portal.dataset.prevOverflow||'';pose();}
 function open(){if(!enabled)toggle.click();expanded=true;portal.dataset.prevOverflow=document.body.style.overflow;document.body.style.overflow='hidden';portal.style.display='flex';stage.insertBefore(wrapper,panel);wrapper.style.cssText='position:absolute;inset:0;width:100%;height:100%';svg.style.width='100%';svg.style.height='100%';pose();}
 expand.onclick=open;
 mk('✕ Close',close);mk('⚙ Controls',()=>{panel.style.display=panel.style.display==='none'?'block':'none';refreshPanel();});mk('↻ Angle',()=>{angle=(angle+1)%3;pose();});mk('＋ Zoom',()=>{zoom=Math.min(2.6,zoom+.25);pose();});mk('－ Zoom',()=>{zoom=Math.max(.7,zoom-.25);pose();});mk('⟲ Reset view',()=>{zoom=1;turn=0;tilt=0;angle=0;pose();});
 let startX=0,startY=0;stage.addEventListener('pointerdown',e=>{if(e.target.closest('button')||panel.contains(e.target))return;startX=e.clientX;startY=e.clientY;stage.setPointerCapture(e.pointerId);});stage.addEventListener('pointerup',e=>{if(!expanded||panel.contains(e.target))return;turn=Math.max(-1.2,Math.min(1.2,turn+(e.clientX-startX)*.006));tilt=Math.max(-.5,Math.min(.5,tilt+(e.clientY-startY)*.003));pose();});
 function refreshPanel(){
  panel.replaceChildren();const heading=document.createElement('strong');heading.textContent='Scenario controls · '+cfg.title;panel.appendChild(heading);
  const note=document.createElement('p');note.textContent='Use the original rugby controls. Play closes this panel and starts after a two-second countdown.';panel.appendChild(note);
  const scope=home.parentElement?.parentElement||document.body;
  const buttons=[...scope.querySelectorAll('button')].filter(b=>!portal.contains(b)&&!controls.contains(b)&&!b.disabled&&b.offsetParent!==null);
  const selects=[...scope.querySelectorAll('select')].filter(el=>!portal.contains(el)&&el.offsetParent!==null);
  for(const select of selects.slice(0,4)){const label=document.createElement('label');label.textContent=select.getAttribute('aria-label')||'Play option';label.style.cssText='display:block;margin:10px 0';const copy=select.cloneNode(true);copy.value=select.value;copy.style.cssText='display:block;max-width:100%;padding:8px';copy.onchange=()=>{select.value=copy.value;select.dispatchEvent(new Event('change',{bubbles:true}));};label.appendChild(copy);panel.appendChild(label);}
  for(const b of buttons.slice(0,35)){const label=(b.textContent||'').trim();if(!label||/camera angle|view:|debug/i.test(label))continue;const proxy=document.createElement('button');proxy.type='button';proxy.textContent=label;proxy.style.cssText='display:inline-block;margin:5px;padding:10px;background:#e4c783;color:#10251a;border-radius:8px;font-weight:bold';proxy.onclick=()=>{if(/play|start|replay/i.test(label)){panel.style.display='none';count.style.display='flex';count.textContent='2';pending=setTimeout(()=>{count.textContent='1';pending=setTimeout(()=>{count.style.display='none';pending=null;b.click();},1000);},1000);}else{b.click();refreshPanel();}};panel.appendChild(proxy);}
 }
 mk('▶ Play / Replay',()=>{panel.style.display='block';refreshPanel();});
 mk('Change scenario',()=>{panel.style.display='block';refreshPanel();});
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
  return {x:((r.left+r.width/2-b.left)/b.width-.5)*32,z:((r.top+r.height/2-b.top)/b.height-.5)*20};
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