(function initMirrorMotionPhase4(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.PocketPTMirrorMotionPhase4 = api;
    api.install();
  }
})(typeof window !== 'undefined' ? window : globalThis, function mirrorMotionPhase4Factory(globalScope) {
  'use strict';

  const DEFAULTS = Object.freeze({
    minConfidence: 0.55,
    squatKneeBentDeg: 145,
    squatDeepDeg: 115,
    horizontalTorsoRatio: 1.35,
    pushupBodyLineToleranceRatio: 0.8,
    pushupEnterFrames: 3,
    pushupExitFrames: 2,
    anchorMaxDriftRatio: 0.18,
    anchorCorrectionGain: 0.82,
    anchorCorrectionMinRatio: 0.015,
    jackOpenAnkleRatio: 1.55,
    jackClosedAnkleRatio: 0.95
  });

  const ALIASES = Object.freeze({
    'bodyweight squat':'squat','bodyweight_squat':'squat','bodyweight-squat':'squat','squat':'squat',
    'push-up':'pushup','push up':'pushup','push_up':'pushup','pushup':'pushup',
    'jumping jack':'jumping_jack','jumping-jack':'jumping_jack','jumping_jack':'jumping_jack',
    'lunge':'lunge'
  });

  const finite = v => Number.isFinite(Number(v));
  const confidence = p => Number(p?.confidence ?? p?.score ?? 0) || 0;
  const usable = (p, threshold) => p && finite(p.x) && finite(p.y) && confidence(p) >= threshold && !['dropped','coasted'].includes(p.stabilityState);
  const dist = (a,b) => usable(a,0) && usable(b,0) ? Math.hypot(Number(a.x)-Number(b.x), Number(a.y)-Number(b.y)) : NaN;
  const midpoint = (a,b) => ({ x:(Number(a.x)+Number(b.x))/2, y:(Number(a.y)+Number(b.y))/2 });
  const angle = (a,b,c) => {
    if (![a,b,c].every(p => usable(p,0))) return NaN;
    const bax=Number(a.x)-Number(b.x), bay=Number(a.y)-Number(b.y), bcx=Number(c.x)-Number(b.x), bcy=Number(c.y)-Number(b.y);
    const denom=Math.hypot(bax,bay)*Math.hypot(bcx,bcy); if(!denom) return NaN;
    const cosine=Math.max(-1,Math.min(1,(bax*bcx+bay*bcy)/denom));
    return Math.acos(cosine)*180/Math.PI;
  };

  function normalizeExercise(value) {
    const key=String(value||'').trim().toLowerCase().replace(/[–—]/g,'-');
    return ALIASES[key] || ALIASES[key.replace(/\s+/g,'_')] || null;
  }

  function normalizeExerciseMeta(candidate) {
    return normalizeExercise(candidate?.movementPattern || candidate?.pattern || candidate?.exerciseId || candidate?.id || candidate?.name || candidate);
  }

  function selectedExercise() {
    // The progression runtime is the canonical current-exercise authority once a
    // workout is running. __selectedExercise is only a compatibility snapshot and
    // may still name the first strength block later in a multi-exercise workout.
    const progression = globalScope.WorkoutProgressionRuntime?.getCurrentExerciseMeta?.();
    const current = normalizeExerciseMeta(progression);
    if (current) return current;
    const direct = normalizeExercise(globalScope.__selectedExercise);
    if (direct) return direct;
    const active=globalScope.ACTIVE_WORKOUT;
    return normalizeExerciseMeta(active?.currentExercise || active?.exercise || active?.blocks?.strength?.[0]);
  }

  function pointMap(packet) {
    const map=new Map();
    for(const point of packet?.keypoints||[]){ const name=point?.name||point?.part; if(name) map.set(name,point); }
    return map;
  }

  function bodyScale(map) {
    const ls=map.get('left_shoulder'), rs=map.get('right_shoulder'), lh=map.get('left_hip'), rh=map.get('right_hip');
    const shoulder=dist(ls,rs), hip=dist(lh,rh);
    const torso=[ls,rs,lh,rh].every(p=>usable(p,0)) ? dist(midpoint(ls,rs), midpoint(lh,rh)) : NaN;
    // Left/right width collapses in a side-on push-up. Torso length remains a
    // useful body-size reference, so use the strongest trustworthy projection.
    const values=[shoulder,hip,torso].filter(Number.isFinite).filter(v=>v>1);
    return values.length ? Math.max(...values) : NaN;
  }

  function createExerciseContextEngine(options={}) {
    const config={...DEFAULTS,...options};
    let phase='UNKNOWN', pattern=null, frames=0, anchorCorrections=0, anchorReleases=0, lastIssue='NONE', anchors={};
    let pushupHorizontalStreak=0, pushupTransitionStreak=0, pushupContactActive=false;

    function reset(){
      phase='UNKNOWN'; pattern=null; frames=0; anchorCorrections=0; anchorReleases=0; lastIssue='NONE'; anchors={};
      pushupHorizontalStreak=0; pushupTransitionStreak=0; pushupContactActive=false;
    }

    function classify(map, requestedPattern) {
      const ls=map.get('left_shoulder'), rs=map.get('right_shoulder'), lh=map.get('left_hip'), rh=map.get('right_hip');
      const lk=map.get('left_knee'), rk=map.get('right_knee'), la=map.get('left_ankle'), ra=map.get('right_ankle'), lw=map.get('left_wrist'), rw=map.get('right_wrist');
      const scale=bodyScale(map);
      const torso=[ls,rs,lh,rh].every(p=>usable(p,config.minConfidence)) ? {shoulder:midpoint(ls,rs),hip:midpoint(lh,rh)} : null;
      const torsoHorizontal=torso ? Math.abs(torso.shoulder.x-torso.hip.x) > Math.abs(torso.shoulder.y-torso.hip.y)*config.horizontalTorsoRatio : false;
      const ankleMid=usable(la,config.minConfidence)&&usable(ra,config.minConfidence) ? midpoint(la,ra) : null;
      const lowerBodyAligned=torso && ankleMid && Number.isFinite(scale) ? Math.abs(ankleMid.y-torso.hip.y) <= scale*config.pushupBodyLineToleranceRatio : false;
      const horizontalBody=torsoHorizontal && lowerBodyAligned;
      const kneeAngles=[angle(lh,lk,la),angle(rh,rk,ra)].filter(Number.isFinite);
      const kneeAvg=kneeAngles.length ? kneeAngles.reduce((a,b)=>a+b,0)/kneeAngles.length : NaN;
      const ankleSep=dist(la,ra), shoulderSep=dist(ls,rs);
      const wristsHigh=usable(lw,config.minConfidence)&&usable(rw,config.minConfidence)&&usable(ls,config.minConfidence)&&usable(rs,config.minConfidence)&&Number(lw.y)<Number(ls.y)&&Number(rw.y)<Number(rs.y);

      if(requestedPattern==='pushup') return { phase:horizontalBody?'PUSHUP_HORIZONTAL':'PUSHUP_TRANSITION', scale, kneeAvg };
      if(requestedPattern==='squat') {
        if(!Number.isFinite(kneeAvg)) return {phase:'SQUAT_UNKNOWN',scale,kneeAvg};
        if(kneeAvg<=config.squatDeepDeg) return {phase:'SQUAT_BOTTOM',scale,kneeAvg};
        if(kneeAvg<config.squatKneeBentDeg) return {phase:'SQUAT_BENT',scale,kneeAvg};
        return {phase:'SQUAT_STANDING',scale,kneeAvg};
      }
      if(requestedPattern==='jumping_jack') {
        if(Number.isFinite(ankleSep)&&Number.isFinite(shoulderSep)&&shoulderSep>1){
          const ratio=ankleSep/shoulderSep;
          if(ratio>=config.jackOpenAnkleRatio&&wristsHigh) return {phase:'JACK_OPEN',scale,ankleRatio:ratio};
          if(ratio<=config.jackClosedAnkleRatio&&!wristsHigh) return {phase:'JACK_CLOSED',scale,ankleRatio:ratio};
          return {phase:'JACK_TRANSITION',scale,ankleRatio:ratio};
        }
        return {phase:'JACK_UNKNOWN',scale};
      }
      return {phase:horizontalBody?'HORIZONTAL_BODY':'UPRIGHT_BODY',scale,kneeAvg};
    }

    function setAnchor(name,point){ if(usable(point,config.minConfidence)) anchors[name]={x:Number(point.x),y:Number(point.y)}; }
    function releaseAnchors(reason){ if(Object.keys(anchors).length) anchorReleases+=1; anchors={}; lastIssue=`ANCHORS_RELEASED:${reason}`; }

    function applyAnchor(map,name,scale,stats){
      const point=map.get(name), anchor=anchors[name];
      if(!anchor||!usable(point,config.minConfidence)||!Number.isFinite(scale)) return;
      const drift=Math.hypot(Number(point.x)-anchor.x,Number(point.y)-anchor.y), maxDrift=scale*config.anchorMaxDriftRatio;
      if(drift>maxDrift){ delete anchors[name]; anchorReleases+=1; lastIssue=`ANCHOR_RELEASED_EXCESS_DRIFT:${name}`; return; }
      point.exerciseRawX=point.x; point.exerciseRawY=point.y; point.exerciseAnchor=name;
      const correctionFloor=Math.max(0,scale*config.anchorCorrectionMinRatio);
      if(drift>correctionFloor){
        point.x=Number(point.x)+(anchor.x-Number(point.x))*config.anchorCorrectionGain;
        point.y=Number(point.y)+(anchor.y-Number(point.y))*config.anchorCorrectionGain;
        point.exerciseConstraintState='contact_anchor_corrected';
        stats.anchorCorrections+=1; anchorCorrections+=1; lastIssue=`CONTACT_CORRECTED:${name}`;
      } else {
        point.exerciseConstraintState='contact_anchor_maintained';
      }
    }

    function resetPushupState(){ pushupHorizontalStreak=0; pushupTransitionStreak=0; pushupContactActive=false; }

    function process(packet, requestedPattern=null){
      frames+=1;
      const points=(packet?.keypoints||[]).map(p=>({...p})); const map=pointMap({keypoints:points});
      const nextPattern=requestedPattern || selectedExercise();
      if(pattern && pattern!==nextPattern){ releaseAnchors('EXERCISE_CHANGED'); resetPushupState(); }
      pattern=nextPattern;
      const classification=classify(map,pattern);
      phase=classification.phase;
      const stats={anchorCorrections:0,anchoredContacts:Object.keys(anchors).length};

      if(pattern==='squat'){
        resetPushupState();
        if(!anchors.left_ankle&&['SQUAT_STANDING','SQUAT_BENT'].includes(phase)) setAnchor('left_ankle',map.get('left_ankle'));
        if(!anchors.right_ankle&&['SQUAT_STANDING','SQUAT_BENT'].includes(phase)) setAnchor('right_ankle',map.get('right_ankle'));
        applyAnchor(map,'left_ankle',classification.scale,stats); applyAnchor(map,'right_ankle',classification.scale,stats);
      } else if(pattern==='pushup'){
        if(classification.phase==='PUSHUP_HORIZONTAL'){
          pushupHorizontalStreak+=1; pushupTransitionStreak=0;
          if(!pushupContactActive && pushupHorizontalStreak>=Math.max(1,config.pushupEnterFrames)) pushupContactActive=true;
        } else {
          pushupTransitionStreak+=1; pushupHorizontalStreak=0;
          if(pushupContactActive && pushupTransitionStreak>=Math.max(1,config.pushupExitFrames)){
            if(Object.keys(anchors).length) releaseAnchors('PUSHUP_TRANSITION_CONFIRMED');
            pushupContactActive=false;
          }
        }
        phase=pushupContactActive?'PUSHUP_HORIZONTAL':'PUSHUP_TRANSITION';
        if(pushupContactActive){
          for(const name of ['left_wrist','right_wrist','left_ankle','right_ankle']) if(!anchors[name]) setAnchor(name,map.get(name));
          for(const name of ['left_wrist','right_wrist','left_ankle','right_ankle']) applyAnchor(map,name,classification.scale,stats);
        }
      } else {
        resetPushupState();
        if(Object.keys(anchors).length) releaseAnchors('NON_ANCHORED_EXERCISE');
      }

      stats.anchoredContacts=Object.keys(anchors).length;
      return {...packet,keypoints:points,exerciseContext:{version:3,pattern:pattern||'UNKNOWN',phase,bodyScalePx:Number.isFinite(classification.scale)?classification.scale:null,kneeAngleDeg:Number.isFinite(classification.kneeAvg)?classification.kneeAvg:null,pushupHorizontalStreak,pushupTransitionStreak,frameStats:stats,anchors:{...anchors},lastIssue}};
    }

    function diagnostics(){ return {frames,pattern:pattern||'UNKNOWN',phase,anchorCorrections,anchorReleases,anchoredContacts:Object.keys(anchors).length,pushupHorizontalStreak,pushupTransitionStreak,pushupContactActive,lastIssue}; }
    return Object.freeze({process,reset,diagnostics,config:Object.freeze({...config})});
  }

  const engine=createExerciseContextEngine();
  const state={installed:false,avatarRuntimePatched:false,rendererBound:false,processErrors:0,contextResets:0,lastContextResetReason:'NONE',observedPhase2TrackerResets:null,firstFailingBoundary:'NONE',lastPipelineStage:'BOOT'};
  let panelTimer=null;

  function upstreamTrackerResetCount(){
    const direct=Number(globalScope.PocketPTMirrorMotionPhase2?.diagnostics?.()?.trackerResets);
    if(Number.isFinite(direct)) return direct;
    const fallback=Number(globalScope.__mirrorMotionDiagnostics?.trackerResets);
    return Number.isFinite(fallback)?fallback:null;
  }

  function syncUpstreamReset(){
    const count=upstreamTrackerResetCount(); if(count==null) return false;
    if(state.observedPhase2TrackerResets==null){ state.observedPhase2TrackerResets=count; return false; }
    if(count===state.observedPhase2TrackerResets) return false;
    state.observedPhase2TrackerResets=count; engine.reset(); state.contextResets+=1; state.lastContextResetReason='PHASE2_TRACKER_RESET'; state.lastPipelineStage='EXERCISE_CONTEXT_RESET'; return true;
  }

  function updateRuntimeDiagnostics(extra={}){
    const runtime=globalScope.AvatarRuntime?.getStatus?.()||globalScope.__avatarRuntimeStatus||(globalScope.__avatarRuntimeStatus={}); const d=engine.diagnostics();
    Object.assign(runtime,{mirrorMotionPhase:4,mirrorMotionPhase4Installed:state.installed,mirrorMotionExercisePatched:state.avatarRuntimePatched,mirrorMotionExercisePattern:d.pattern,mirrorMotionExercisePhase:d.phase,mirrorMotionExerciseAnchoredContacts:d.anchoredContacts,mirrorMotionExerciseAnchorCorrections:d.anchorCorrections,mirrorMotionExerciseAnchorReleases:d.anchorReleases,mirrorMotionExercisePushupHorizontalStreak:d.pushupHorizontalStreak,mirrorMotionExercisePushupTransitionStreak:d.pushupTransitionStreak,mirrorMotionExerciseContextResets:state.contextResets,mirrorMotionExerciseContextResetReason:state.lastContextResetReason,mirrorMotionExerciseLastIssue:d.lastIssue,mirrorMotionExerciseFirstFailingBoundary:state.firstFailingBoundary,mirrorMotionExerciseProcessErrors:state.processErrors,...extra});
    globalScope.__mirrorMotionPhase4Diagnostics={...state,...d};
  }

  function wrapRenderer(renderer){
    state.rendererBound=typeof renderer==='function'; updateRuntimeDiagnostics(); if(typeof renderer!=='function') return renderer;
    return function exerciseAwareRenderer(structuralPacket){
      state.lastPipelineStage='EXERCISE_CONTEXT_PROCESS';
      try{ syncUpstreamReset(); const constrained=engine.process(structuralPacket); state.firstFailingBoundary='NONE'; state.lastPipelineStage='EXERCISE_CONTEXT_READY'; updateRuntimeDiagnostics(); return renderer(constrained); }
      catch(error){ state.processErrors+=1; state.firstFailingBoundary='EXERCISE_CONTEXT_PROCESS_ERROR'; state.lastPipelineStage='EXERCISE_CONTEXT_PROCESS_ERROR'; updateRuntimeDiagnostics({mirrorMotionExerciseLastError:String(error?.message||error)}); return renderer(structuralPacket); }
    };
  }

  function patchAvatarRuntime(runtime){
    if(!runtime||runtime.__mirrorMotionPhase4Patched) return runtime;
    const originalBind=runtime.bindPoseFrameRenderer;
    if(typeof originalBind!=='function'){ state.firstFailingBoundary='PHASE4_AVATAR_BIND_API_MISSING'; updateRuntimeDiagnostics(); return runtime; }
    runtime.bindPoseFrameRenderer=function bindExerciseAwarePoseRenderer(renderer){ return originalBind.call(runtime,wrapRenderer(renderer)); };
    if(typeof runtime.registerPoseRenderer==='function') runtime.registerPoseRenderer=function registerExerciseAwarePoseRenderer(renderer){ return originalBind.call(runtime,wrapRenderer(renderer)); };
    Object.defineProperty(runtime,'__mirrorMotionPhase4Patched',{value:true,enumerable:false}); state.avatarRuntimePatched=true; state.firstFailingBoundary='NONE'; state.lastPipelineStage='AVATAR_RUNTIME_PATCHED'; updateRuntimeDiagnostics(); return runtime;
  }

  function interceptAvatarRuntimeAssignment(){
    if(globalScope.AvatarRuntime){ patchAvatarRuntime(globalScope.AvatarRuntime); return; }
    const prior=Object.getOwnPropertyDescriptor(globalScope,'AvatarRuntime');
    if(prior&&prior.configurable===false){ state.firstFailingBoundary='PHASE4_AVATAR_RUNTIME_INTERCEPT_BLOCKED'; updateRuntimeDiagnostics(); return; }
    let fallbackValue=prior?.value;
    Object.defineProperty(globalScope,'AvatarRuntime',{configurable:true,enumerable:prior?.enumerable!==false,get(){return prior?.get?prior.get.call(globalScope):fallbackValue;},set(next){ if(prior?.set) prior.set.call(globalScope,next); else fallbackValue=next; const current=prior?.get?prior.get.call(globalScope):fallbackValue; const patched=patchAvatarRuntime(current||next); if(!prior?.set) fallbackValue=patched; }});
  }

  function diagnosticsText(){ const d=engine.diagnostics(); return ['MIRROR MOTION INTELLIGENCE — PHASE 4',`First failing boundary: ${state.firstFailingBoundary}`,`Pipeline stage: ${state.lastPipelineStage}`,`Runtime patched: ${state.avatarRuntimePatched?'YES':'NO'}`,`Renderer bound: ${state.rendererBound?'YES':'NO'}`,`Exercise pattern: ${d.pattern}`,`Exercise phase: ${d.phase}`,`Anchored contacts: ${d.anchoredContacts}`,`Anchor corrections: ${d.anchorCorrections}`,`Anchor releases: ${d.anchorReleases}`,`Push-up enter streak: ${d.pushupHorizontalStreak}`,`Push-up exit streak: ${d.pushupTransitionStreak}`,`Context resets: ${state.contextResets}`,`Last context reset: ${state.lastContextResetReason}`,`Last exercise issue: ${d.lastIssue}`,`Process errors: ${state.processErrors}`].join('\n'); }

  function ensureDebugPanel(){
    const doc=globalScope.document; if(!doc?.body) return null; let panel=doc.getElementById('mirrorMotionPhase4Debug');
    if(!panel){ panel=doc.createElement('details'); panel.id='mirrorMotionPhase4Debug'; panel.style.cssText='position:fixed;right:8px;bottom:8px;z-index:5002;max-width:min(92vw,520px);max-height:42vh;overflow:auto;background:rgba(2,6,23,.94);color:#e5e7eb;border:1px solid #38bdf8;border-radius:10px;padding:8px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;'; const summary=doc.createElement('summary'); summary.textContent='Mirror Motion Phase 4 Debug'; summary.style.cssText='cursor:pointer;color:#7dd3fc;font-weight:700;'; const pre=doc.createElement('pre'); pre.dataset.mirrorMotionPhase4Diagnostics='true'; pre.style.cssText='white-space:pre-wrap;margin:8px 0 0;'; panel.append(summary,pre); doc.body.appendChild(panel); }
    return panel;
  }
  function refreshDebugPanel(){ const p=ensureDebugPanel(); const pre=p?.querySelector?.('[data-mirror-motion-phase4-diagnostics]'); if(pre) pre.textContent=diagnosticsText(); }

  function install(){ if(state.installed) return api; state.installed=true; state.lastPipelineStage='INSTALLING'; interceptAvatarRuntimeAssignment(); const mount=()=>{ensureDebugPanel();refreshDebugPanel();if(!panelTimer&&globalScope.setInterval) panelTimer=globalScope.setInterval(refreshDebugPanel,500);}; if(globalScope.document?.readyState==='loading') globalScope.document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount(); state.lastPipelineStage='INSTALLED'; updateRuntimeDiagnostics(); return api; }
  function reset(){ engine.reset(); state.processErrors=0; state.contextResets=0; state.lastContextResetReason='NONE'; state.observedPhase2TrackerResets=null; state.firstFailingBoundary='NONE'; state.lastPipelineStage='RESET'; updateRuntimeDiagnostics(); }

  const api=Object.freeze({DEFAULTS,ALIASES,createExerciseContextEngine,normalizeExercise,selectedExercise,wrapRenderer,patchAvatarRuntime,diagnostics:()=>({...state,...engine.diagnostics()}),diagnosticsText,reset,install});
  return api;
});
