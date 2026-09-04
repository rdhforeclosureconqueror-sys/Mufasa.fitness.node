(function initMirrorMotionPhase5(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.PocketPTMirrorMotionPhase5 = api; api.install(); }
})(typeof window !== 'undefined' ? window : globalThis, function mirrorMotionPhase5Factory(globalScope) {
  'use strict';

  const DEFAULTS = Object.freeze({ minConfidence: 0.45, maxSolveResidualRatio: 0.06 });
  const CHAINS = Object.freeze([
    ['left_leg','left_hip','left_knee','left_ankle','left_thigh','left_shin'],
    ['right_leg','right_hip','right_knee','right_ankle','right_thigh','right_shin'],
    ['left_arm','left_shoulder','left_elbow','left_wrist','left_upper_arm','left_forearm'],
    ['right_arm','right_shoulder','right_elbow','right_wrist','right_upper_arm','right_forearm']
  ]);

  const finite = v => Number.isFinite(Number(v));
  const conf = p => Number(p?.confidence ?? p?.score ?? 0) || 0;
  const distance = (a,b) => a&&b&&finite(a.x)&&finite(a.y)&&finite(b.x)&&finite(b.y) ? Math.hypot(Number(a.x)-Number(b.x), Number(a.y)-Number(b.y)) : NaN;
  const usable = (p,min) => p && finite(p.x) && finite(p.y) && conf(p) >= min && !['dropped'].includes(p.stabilityState);

  function pointMap(packet){ const m=new Map(); for(const p of packet?.keypoints||[]){ const n=p?.name||p?.part; if(n)m.set(n,p); } return m; }
  function modelLength(packet,name){ const v=Number(packet?.structural?.segmentModel?.[name]?.length); return Number.isFinite(v)&&v>1?v:NaN; }
  function anchored(packet,name){ return Boolean(packet?.exerciseContext?.anchors?.[name]); }

  function circleSolutions(root,target,l1,l2){
    const dx=Number(target.x)-Number(root.x), dy=Number(target.y)-Number(root.y), d=Math.hypot(dx,dy);
    if(!Number.isFinite(d)||d<1e-6) return { status:'DEGENERATE' };
    if(d>l1+l2 || d<Math.abs(l1-l2)) return { status:'UNREACHABLE', distance:d };
    const a=(l1*l1-l2*l2+d*d)/(2*d);
    const h2=Math.max(0,l1*l1-a*a), h=Math.sqrt(h2);
    const ux=dx/d, uy=dy/d, px=Number(root.x)+a*ux, py=Number(root.y)+a*uy;
    const rx=-uy*h, ry=ux*h;
    return { status:'OK', distance:d, points:[{x:px+rx,y:py+ry},{x:px-rx,y:py-ry}] };
  }

  function nearestSolution(points,hint){
    if(!hint || !finite(hint.x)||!finite(hint.y)) return points[0];
    return distance(points[0],hint) <= distance(points[1],hint) ? points[0] : points[1];
  }

  function createIKEngine(options={}){
    const config={...DEFAULTS,...options};
    let frames=0, solved=0, unreachable=0, skipped=0, maxResidual=0, lastIssue='NONE';
    function reset(){ frames=0; solved=0; unreachable=0; skipped=0; maxResidual=0; lastIssue='NONE'; }
    function process(packet){
      frames+=1;
      const points=(packet?.keypoints||[]).map(p=>({...p}));
      const map=pointMap({keypoints:points});
      const stats={solvedChains:0,unreachableChains:0,skippedChains:0,maxResidualPx:0};
      const pattern=packet?.exerciseContext?.pattern;
      for(const [label,rootName,jointName,endName,seg1,seg2] of CHAINS){
        const shouldSolve = (pattern==='squat' && label.endsWith('_leg') && anchored(packet,endName)) ||
          (pattern==='pushup' && ['left_leg','right_leg','left_arm','right_arm'].includes(label) && anchored(packet,endName));
        if(!shouldSolve) continue;
        const root=map.get(rootName), joint=map.get(jointName), end=map.get(endName);
        const l1=modelLength(packet,seg1), l2=modelLength(packet,seg2);
        if(!usable(root,config.minConfidence)||!usable(joint,0)||!usable(end,config.minConfidence)||!Number.isFinite(l1)||!Number.isFinite(l2)){
          skipped+=1; stats.skippedChains+=1; lastIssue=`IK_SKIPPED:${label}`; continue;
        }
        const solutions=circleSolutions(root,end,l1,l2);
        if(solutions.status!=='OK'){
          unreachable+=1; stats.unreachableChains+=1; lastIssue=`IK_${solutions.status}:${label}`; continue;
        }
        const target=nearestSolution(solutions.points,joint);
        joint.ikRawX=joint.x; joint.ikRawY=joint.y;
        joint.x=target.x; joint.y=target.y; joint.ikState='solved'; joint.ikChain=label;
        const residual=Math.max(Math.abs(distance(root,joint)-l1),Math.abs(distance(joint,end)-l2));
        joint.ikResidualPx=residual;
        solved+=1; stats.solvedChains+=1; stats.maxResidualPx=Math.max(stats.maxResidualPx,residual); maxResidual=Math.max(maxResidual,residual);
        lastIssue=`IK_SOLVED:${label}`;
      }
      const scale=Number(packet?.exerciseContext?.bodyScalePx)||Number(packet?.structural?.bodyScalePx)||NaN;
      const residualRatio=Number.isFinite(scale)&&scale>1?stats.maxResidualPx/scale:null;
      return {...packet,keypoints:points,ik:{version:1,frame:frames,pattern:pattern||'UNKNOWN',frameStats:stats,maxResidualRatio:residualRatio,lastIssue}};
    }
    function diagnostics(){ return {frames,solvedChains:solved,unreachableChains:unreachable,skippedChains:skipped,maxResidualPx:maxResidual,lastIssue}; }
    return Object.freeze({process,reset,diagnostics,config:Object.freeze({...config})});
  }

  const engine=createIKEngine();
  const state={installed:false,avatarRuntimePatched:false,rendererBound:false,processErrors:0,firstFailingBoundary:'NONE',lastPipelineStage:'BOOT'};
  let panelTimer=null;

  function updateRuntimeDiagnostics(extra={}){
    const runtime=globalScope.AvatarRuntime?.getStatus?.()||globalScope.__avatarRuntimeStatus||(globalScope.__avatarRuntimeStatus={});
    const d=engine.diagnostics();
    Object.assign(runtime,{mirrorMotionPhase:5,mirrorMotionPhase5Installed:state.installed,mirrorMotionIKPatched:state.avatarRuntimePatched,mirrorMotionIKFrames:d.frames,mirrorMotionIKSolvedChains:d.solvedChains,mirrorMotionIKUnreachableChains:d.unreachableChains,mirrorMotionIKSkippedChains:d.skippedChains,mirrorMotionIKMaxResidualPx:d.maxResidualPx,mirrorMotionIKLastIssue:d.lastIssue,mirrorMotionIKFirstFailingBoundary:state.firstFailingBoundary,mirrorMotionIKProcessErrors:state.processErrors,...extra});
    globalScope.__mirrorMotionPhase5Diagnostics={...state,...d};
  }

  function wrapRenderer(renderer){
    state.rendererBound=typeof renderer==='function'; updateRuntimeDiagnostics(); if(typeof renderer!=='function') return renderer;
    return function ikSolvedRenderer(packet){
      state.lastPipelineStage='IK_PROCESS';
      try{
        const solvedPacket=engine.process(packet); state.firstFailingBoundary='NONE'; state.lastPipelineStage='IK_READY'; updateRuntimeDiagnostics(); return renderer(solvedPacket);
      }catch(error){
        state.processErrors+=1; state.firstFailingBoundary='IK_PROCESS_ERROR'; state.lastPipelineStage='IK_PROCESS_ERROR'; updateRuntimeDiagnostics({mirrorMotionIKLastError:String(error?.message||error)}); return renderer(packet);
      }
    };
  }

  function patchAvatarRuntime(runtime){
    if(!runtime||runtime.__mirrorMotionPhase5Patched) return runtime;
    const originalBind=runtime.bindPoseFrameRenderer;
    if(typeof originalBind!=='function'){ state.firstFailingBoundary='PHASE5_AVATAR_BIND_API_MISSING'; updateRuntimeDiagnostics(); return runtime; }
    runtime.bindPoseFrameRenderer=function bindIKPoseRenderer(renderer){ return originalBind.call(runtime,wrapRenderer(renderer)); };
    if(typeof runtime.registerPoseRenderer==='function') runtime.registerPoseRenderer=function registerIKPoseRenderer(renderer){ return originalBind.call(runtime,wrapRenderer(renderer)); };
    Object.defineProperty(runtime,'__mirrorMotionPhase5Patched',{value:true,enumerable:false});
    state.avatarRuntimePatched=true; state.firstFailingBoundary='NONE'; state.lastPipelineStage='AVATAR_RUNTIME_PATCHED'; updateRuntimeDiagnostics(); return runtime;
  }

  function interceptAvatarRuntimeAssignment(){
    if(globalScope.AvatarRuntime){ patchAvatarRuntime(globalScope.AvatarRuntime); return; }
    const prior=Object.getOwnPropertyDescriptor(globalScope,'AvatarRuntime');
    if(prior&&prior.configurable===false){ state.firstFailingBoundary='PHASE5_AVATAR_RUNTIME_INTERCEPT_BLOCKED'; updateRuntimeDiagnostics(); return; }
    let value=prior?.value;
    Object.defineProperty(globalScope,'AvatarRuntime',{configurable:true,enumerable:prior?.enumerable!==false,get(){return prior?.get?prior.get.call(globalScope):value;},set(next){ if(prior?.set) prior.set.call(globalScope,next); else value=next; const current=prior?.get?prior.get.call(globalScope):value; const patched=patchAvatarRuntime(current||next); if(!prior?.set)value=patched; }});
  }

  function diagnosticsText(){ const d=engine.diagnostics(); return ['MIRROR MOTION INTELLIGENCE — PHASE 5',`First failing boundary: ${state.firstFailingBoundary}`,`Pipeline stage: ${state.lastPipelineStage}`,`Runtime patched: ${state.avatarRuntimePatched?'YES':'NO'}`,`Renderer bound: ${state.rendererBound?'YES':'NO'}`,`IK frames: ${d.frames}`,`Chains solved: ${d.solvedChains}`,`Unreachable chains: ${d.unreachableChains}`,`Skipped chains: ${d.skippedChains}`,`Max residual: ${d.maxResidualPx.toFixed(2)}px`,`Last IK issue: ${d.lastIssue}`,`Process errors: ${state.processErrors}`].join('\n'); }
  function ensureDebugPanel(){ const doc=globalScope.document; if(!doc?.body)return null; let panel=doc.getElementById('mirrorMotionPhase5Debug'); if(!panel){ panel=doc.createElement('details'); panel.id='mirrorMotionPhase5Debug'; panel.style.cssText='position:fixed;right:8px;bottom:8px;z-index:5002;max-width:min(92vw,520px);max-height:45vh;overflow:auto;background:rgba(2,6,23,.94);color:#e5e7eb;border:1px solid #22d3ee;border-radius:10px;padding:8px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;'; const s=doc.createElement('summary'); s.textContent='Mirror Motion Phase 5 Debug'; s.style.cssText='cursor:pointer;color:#67e8f9;font-weight:700;'; const pre=doc.createElement('pre'); pre.dataset.mirrorMotionPhase5Diagnostics='true'; pre.style.cssText='white-space:pre-wrap;margin:8px 0 0;'; panel.append(s,pre); doc.body.appendChild(panel);} return panel; }
  function refreshDebugPanel(){ const p=ensureDebugPanel()?.querySelector?.('[data-mirror-motion-phase5-diagnostics]'); if(p)p.textContent=diagnosticsText(); }
  function install(){ if(state.installed)return api; state.installed=true; state.lastPipelineStage='INSTALLING'; interceptAvatarRuntimeAssignment(); const mount=()=>{ensureDebugPanel();refreshDebugPanel();if(!panelTimer&&globalScope.setInterval)panelTimer=globalScope.setInterval(refreshDebugPanel,500);}; if(globalScope.document?.readyState==='loading')globalScope.document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount(); state.lastPipelineStage='INSTALLED'; updateRuntimeDiagnostics(); return api; }
  function reset(){ engine.reset(); state.processErrors=0; state.firstFailingBoundary='NONE'; state.lastPipelineStage='RESET'; updateRuntimeDiagnostics(); }

  const api=Object.freeze({DEFAULTS,CHAINS,createIKEngine,wrapRenderer,patchAvatarRuntime,diagnostics:()=>({...state,...engine.diagnostics()}),diagnosticsText,reset,install});
  return api;
});
