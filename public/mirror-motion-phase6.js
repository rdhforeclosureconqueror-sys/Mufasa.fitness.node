(function initMirrorMotionPhase6(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.PocketPTMirrorMotionPhase6=api;api.install();}
})(typeof window!=='undefined'?window:globalThis,function mirrorMotionPhase6Factory(globalScope){
  'use strict';

  const DEFAULTS=Object.freeze({
    baseAlpha:0.42,minAlpha:0.18,maxAlpha:0.94,
    velocityGain:0.24,accelerationGain:0.08,
    lowConfidencePenalty:0.16,nominalFrameMs:33.333,maxFrameMs:120,
    responsiveJoints:Object.freeze(['left_wrist','right_wrist','left_ankle','right_ankle']),
    stableJoints:Object.freeze(['left_hip','right_hip','left_shoulder','right_shoulder'])
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finite=v=>Number.isFinite(Number(v));
  const confidence=p=>Number(p?.confidence??p?.score??0)||0;
  const pointName=p=>p?.name||p?.part||null;
  const packetTime=(packet,fallback)=>{for(const value of [packet?.timestampMs,packet?.timestamp,packet?.timeMs,packet?.ts]){const n=Number(value);if(Number.isFinite(n))return n;}return fallback;};

  function createLiveCurveEngine(options={}){
    const config={...DEFAULTS,...options};
    const history=new Map();
    let frames=0,tunedPoints=0,anchorBypasses=0,uncertainBypasses=0,scaleBypasses=0,resets=0,lastPattern=null,lastTimestamp=null;
    let alphaSum=0,alphaSamples=0,suppressionSum=0,latencySum=0,lastIssue='NONE';

    function reset(reason='MANUAL'){history.clear();lastTimestamp=null;lastPattern=null;resets+=1;lastIssue=`CURVE_RESET:${reason}`;}
    function phaseBias(packet){const phase=String(packet?.exerciseContext?.phase||'');if(/TRANSITION/.test(phase))return 0.10;if(/JACK_OPEN|JACK_CLOSED/.test(phase))return 0.08;if(/BOTTOM/.test(phase))return -0.06;return 0;}
    function jointBias(name){if(config.responsiveJoints.includes(name))return 0.08;if(config.stableJoints.includes(name))return -0.05;return 0;}
    function process(packet){
      frames+=1;
      const now=packetTime(packet,lastTimestamp==null?0:lastTimestamp+config.nominalFrameMs);
      let dtMs=lastTimestamp==null?config.nominalFrameMs:clamp(now-lastTimestamp,1,config.maxFrameMs);
      if(lastTimestamp!=null&&now<lastTimestamp){reset('TIMESTAMP_BACKWARD');dtMs=config.nominalFrameMs;}
      lastTimestamp=Math.max(now,lastTimestamp==null?now:lastTimestamp);
      const pattern=packet?.exerciseContext?.pattern||'UNKNOWN';
      if(lastPattern&&pattern!==lastPattern)reset('EXERCISE_CHANGED');
      lastPattern=pattern;
      const scaleCandidate=Number(packet?.exerciseContext?.bodyScalePx)||Number(packet?.structural?.bodyScalePx);
      const scale=Number.isFinite(scaleCandidate)&&scaleCandidate>1?scaleCandidate:null;
      const anchored=packet?.exerciseContext?.anchors||{};
      const frameStats={tunedPoints:0,anchorBypasses:0,uncertainBypasses:0,scaleBypasses:0};
      const points=(packet?.keypoints||[]).map(source=>{
        const p={...source},name=pointName(p);
        if(!name||!finite(p.x)||!finite(p.y))return p;
        if(anchored[name]){history.set(name,{x:Number(p.x),y:Number(p.y),vx:0,vy:0});anchorBypasses+=1;frameStats.anchorBypasses+=1;p.curveState='anchor_passthrough';return p;}
        if(['dropped','coasted'].includes(p.stabilityState)){history.delete(name);uncertainBypasses+=1;frameStats.uncertainBypasses+=1;p.curveState='uncertain_passthrough';return p;}
        if(scale==null){history.delete(name);scaleBypasses+=1;frameStats.scaleBypasses+=1;p.curveState='scale_unavailable_passthrough';return p;}
        const prev=history.get(name);
        if(!prev){history.set(name,{x:Number(p.x),y:Number(p.y),vx:0,vy:0});p.curveState='seeded';p.curveAlpha=1;return p;}
        const dt=dtMs/1000;
        const rawDx=Number(p.x)-prev.x,rawDy=Number(p.y)-prev.y;
        const rawVx=rawDx/dt,rawVy=rawDy/dt;
        const speed=Math.hypot(rawVx,rawVy)/scale;
        const acceleration=Math.hypot(rawVx-prev.vx,rawVy-prev.vy)/scale;
        const confidencePenalty=(1-clamp(confidence(p),0,1))*config.lowConfidencePenalty;
        const alpha=clamp(config.baseAlpha+jointBias(name)+phaseBias(packet)+Math.min(.32,speed*config.velocityGain)+Math.min(.14,acceleration*config.accelerationGain)-confidencePenalty,config.minAlpha,config.maxAlpha);
        const outX=prev.x+(Number(p.x)-prev.x)*alpha,outY=prev.y+(Number(p.y)-prev.y)*alpha;
        const suppression=Math.max(0,Math.hypot(rawDx,rawDy)-Math.hypot(outX-prev.x,outY-prev.y));
        const lagDistance=Math.hypot(Number(p.x)-outX,Number(p.y)-outY),rawSpeedPx=Math.hypot(rawVx,rawVy);
        const estimatedLatencyMs=rawSpeedPx>1?Math.min(500,(lagDistance/rawSpeedPx)*1000):0;
        p.curveRawX=p.x;p.curveRawY=p.y;p.x=outX;p.y=outY;p.curveAlpha=alpha;p.curveState='adaptive';
        p.curveSpeedBodyPerSec=speed;p.curveAccelerationBodyPerSec2=acceleration;p.curveEstimatedLatencyMs=estimatedLatencyMs;
        history.set(name,{x:outX,y:outY,vx:(outX-prev.x)/dt,vy:(outY-prev.y)/dt});
        tunedPoints+=1;frameStats.tunedPoints+=1;alphaSum+=alpha;alphaSamples+=1;suppressionSum+=suppression;latencySum+=estimatedLatencyMs;
        return p;
      });
      lastIssue=scale==null?'BODY_SCALE_UNAVAILABLE':'CURVE_APPLIED';
      return {...packet,keypoints:points,liveCurve:{version:2,frame:frames,pattern,dtMs,frameStats,averageAlpha:alphaSamples?alphaSum/alphaSamples:null,averageSuppressionPx:alphaSamples?suppressionSum/alphaSamples:0,estimatedLatencyMs:alphaSamples?latencySum/alphaSamples:0,lastIssue}};
    }
    function diagnostics(){return{frames,tunedPoints,anchorBypasses,uncertainBypasses,scaleBypasses,resets,historyPoints:history.size,averageAlpha:alphaSamples?alphaSum/alphaSamples:null,averageSuppressionPx:alphaSamples?suppressionSum/alphaSamples:0,estimatedLatencyMs:alphaSamples?latencySum/alphaSamples:0,lastIssue};}
    return Object.freeze({process,reset,diagnostics,config:Object.freeze({...config})});
  }

  const engine=createLiveCurveEngine();
  const state={installed:false,avatarRuntimePatched:false,rendererBound:false,processErrors:0,firstFailingBoundary:'NONE',lastPipelineStage:'BOOT',observedTrackerResets:null,contextResets:0};
  let panelTimer=null;
  function trackerResetCount(){const direct=Number(globalScope.PocketPTMirrorMotionPhase2?.diagnostics?.()?.trackerResets);if(Number.isFinite(direct))return direct;const fallback=Number(globalScope.__mirrorMotionDiagnostics?.trackerResets);return Number.isFinite(fallback)?fallback:null;}
  function syncReset(){const count=trackerResetCount();if(count==null)return;if(state.observedTrackerResets==null){state.observedTrackerResets=count;return;}if(count!==state.observedTrackerResets){state.observedTrackerResets=count;engine.reset('PHASE2_TRACKER_RESET');state.contextResets+=1;}}
  function updateRuntimeDiagnostics(extra={}){const runtime=globalScope.AvatarRuntime?.getStatus?.()||globalScope.__avatarRuntimeStatus||(globalScope.__avatarRuntimeStatus={}),d=engine.diagnostics();Object.assign(runtime,{mirrorMotionPhase:6,mirrorMotionPhase6Installed:state.installed,mirrorMotionCurvePatched:state.avatarRuntimePatched,mirrorMotionCurveFrames:d.frames,mirrorMotionCurveTunedPoints:d.tunedPoints,mirrorMotionCurveAnchorBypasses:d.anchorBypasses,mirrorMotionCurveUncertainBypasses:d.uncertainBypasses,mirrorMotionCurveScaleBypasses:d.scaleBypasses,mirrorMotionCurveAverageAlpha:d.averageAlpha,mirrorMotionCurveSuppressionPx:d.averageSuppressionPx,mirrorMotionCurveEstimatedLatencyMs:d.estimatedLatencyMs,mirrorMotionCurveContextResets:state.contextResets,mirrorMotionCurveLastIssue:d.lastIssue,mirrorMotionCurveFirstFailingBoundary:state.firstFailingBoundary,mirrorMotionCurveProcessErrors:state.processErrors,...extra});globalScope.__mirrorMotionPhase6Diagnostics={...state,...d};}
  function wrapRenderer(renderer){state.rendererBound=typeof renderer==='function';updateRuntimeDiagnostics();if(typeof renderer!=='function')return renderer;return function liveCurveRenderer(packet){state.lastPipelineStage='CURVE_PROCESS';try{syncReset();const curved=engine.process(packet);state.firstFailingBoundary='NONE';state.lastPipelineStage='CURVE_READY';updateRuntimeDiagnostics();return renderer(curved);}catch(error){state.processErrors+=1;state.firstFailingBoundary='CURVE_PROCESS_ERROR';state.lastPipelineStage='CURVE_PROCESS_ERROR';updateRuntimeDiagnostics({mirrorMotionCurveLastError:String(error?.message||error)});return renderer(packet);}};}
  function patchAvatarRuntime(runtime){if(!runtime||runtime.__mirrorMotionPhase6Patched)return runtime;const originalBind=runtime.bindPoseFrameRenderer;if(typeof originalBind!=='function'){state.firstFailingBoundary='PHASE6_AVATAR_BIND_API_MISSING';updateRuntimeDiagnostics();return runtime;}runtime.bindPoseFrameRenderer=function bindCurveRenderer(renderer){return originalBind.call(runtime,wrapRenderer(renderer));};if(typeof runtime.registerPoseRenderer==='function')runtime.registerPoseRenderer=function registerCurveRenderer(renderer){return originalBind.call(runtime,wrapRenderer(renderer));};Object.defineProperty(runtime,'__mirrorMotionPhase6Patched',{value:true,enumerable:false});state.avatarRuntimePatched=true;state.lastPipelineStage='AVATAR_RUNTIME_PATCHED';updateRuntimeDiagnostics();return runtime;}
  function interceptAvatarRuntimeAssignment(){if(globalScope.AvatarRuntime){patchAvatarRuntime(globalScope.AvatarRuntime);return;}const prior=Object.getOwnPropertyDescriptor(globalScope,'AvatarRuntime');if(prior&&prior.configurable===false){state.firstFailingBoundary='PHASE6_AVATAR_RUNTIME_INTERCEPT_BLOCKED';updateRuntimeDiagnostics();return;}let value=prior?.value;Object.defineProperty(globalScope,'AvatarRuntime',{configurable:true,enumerable:prior?.enumerable!==false,get(){return prior?.get?prior.get.call(globalScope):value;},set(next){if(prior?.set)prior.set.call(globalScope,next);else value=next;const current=prior?.get?prior.get.call(globalScope):value;const patched=patchAvatarRuntime(current||next);if(!prior?.set)value=patched;}});}
  function diagnosticsText(){const d=engine.diagnostics();return['MIRROR MOTION INTELLIGENCE — PHASE 6',`First failing boundary: ${state.firstFailingBoundary}`,`Pipeline stage: ${state.lastPipelineStage}`,`Runtime patched: ${state.avatarRuntimePatched?'YES':'NO'}`,`Renderer bound: ${state.rendererBound?'YES':'NO'}`,`Curve frames: ${d.frames}`,`Tuned points: ${d.tunedPoints}`,`Anchor bypasses: ${d.anchorBypasses}`,`Uncertain bypasses: ${d.uncertainBypasses}`,`Scale bypasses: ${d.scaleBypasses}`,`Average alpha: ${d.averageAlpha==null?'n/a':d.averageAlpha.toFixed(3)}`,`Average suppression: ${d.averageSuppressionPx.toFixed(2)}px`,`Estimated curve latency: ${d.estimatedLatencyMs.toFixed(1)}ms`,`Context resets: ${state.contextResets}`,`Last curve issue: ${d.lastIssue}`,`Process errors: ${state.processErrors}`].join('\n');}
  function ensureDebugPanel(){const doc=globalScope.document;if(!doc?.body)return null;let panel=doc.getElementById('mirrorMotionPhase6Debug');if(!panel){panel=doc.createElement('details');panel.id='mirrorMotionPhase6Debug';panel.style.cssText='position:fixed;right:8px;bottom:8px;z-index:5003;max-width:min(92vw,520px);max-height:45vh;overflow:auto;background:rgba(2,6,23,.94);color:#e5e7eb;border:1px solid #a78bfa;border-radius:10px;padding:8px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;';const s=doc.createElement('summary');s.textContent='Mirror Motion Phase 6 Debug';s.style.cssText='cursor:pointer;color:#c4b5fd;font-weight:700;';const pre=doc.createElement('pre');pre.dataset.mirrorMotionPhase6Diagnostics='true';pre.style.cssText='white-space:pre-wrap;margin:8px 0 0;';panel.append(s,pre);doc.body.appendChild(panel);}return panel;}
  function refreshDebugPanel(){const p=ensureDebugPanel()?.querySelector?.('[data-mirror-motion-phase6-diagnostics]');if(p)p.textContent=diagnosticsText();}
  function install(){if(state.installed)return api;state.installed=true;state.lastPipelineStage='INSTALLING';interceptAvatarRuntimeAssignment();const mount=()=>{ensureDebugPanel();refreshDebugPanel();if(!panelTimer&&globalScope.setInterval)panelTimer=globalScope.setInterval(refreshDebugPanel,500);};if(globalScope.document?.readyState==='loading')globalScope.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();state.lastPipelineStage='INSTALLED';updateRuntimeDiagnostics();return api;}
  function reset(){engine.reset('MANUAL');state.processErrors=0;state.firstFailingBoundary='NONE';state.lastPipelineStage='RESET';updateRuntimeDiagnostics();}
  const api=Object.freeze({DEFAULTS,createLiveCurveEngine,wrapRenderer,patchAvatarRuntime,diagnostics:()=>({...state,...engine.diagnostics()}),diagnosticsText,reset,install});
  return api;
});