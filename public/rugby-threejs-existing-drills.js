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
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x14291f);
 const camera=new THREE.PerspectiveCamera(48,1,.1,300);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));canvas.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x496b55,2));
 const field=new THREE.Mesh(new THREE.PlaneGeometry(34,21),new THREE.MeshLambertMaterial({color:0x286547}));field.rotation.x=-Math.PI/2;scene.add(field);
 for(let x=-15;x<=15;x+=10){const line=new THREE.Mesh(new THREE.BoxGeometry(.045,.025,20),new THREE.MeshBasicMaterial({color:0xb6d2b9}));line.position.set(x,.025,0);scene.add(line);}
 const pieces={};const ball=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),new THREE.MeshStandardMaterial({color:0xffedba}));scene.add(ball);
 const sources=cfg.selectors?cfg.selectors.map(selector=>({selector,defender:false})):cfg.ids.map(id=>({id,defender:id.includes('defender')||id.includes('cover')||id.includes('-d')}));
 if(cfg.defenseSelector)for(let i=0;i<15;i++)sources.push({selector:cfg.defenseSelector,index:i,defender:true});
 if(cfg.drillSelector)for(let i=0;i<15;i++)sources.push({selector:cfg.drillSelector,index:i,defender:i>=8});
 sources.forEach((source,i)=>{const defender=source.defender;const id='piece-'+i;const obj=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,1.55,10),new THREE.MeshStandardMaterial({color:defender?0xd76b6d:0xe6c77b}));body.position.y=.82;obj.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.36,12,10),new THREE.MeshStandardMaterial({color:0xd9a47b}));head.position.y=1.85;obj.add(head);scene.add(obj);pieces[id]=obj;source.object=obj;});
 let angle=0,enabled=false,raf=0;
 function pose(){const poses=[[0,32,28],[-29,23,20],[0,42,.1]];camera.position.set(...poses[angle]);camera.lookAt(0,0,0);}
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