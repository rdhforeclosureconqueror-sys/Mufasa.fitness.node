(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMovementCaptureDebug = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RECORDINGS_KEY = 'pocketpt.motionLegoRecordings.v1';
  const CUSTOM_KEY = 'pocketpt.customMovementDefinitions.v1';
  const STAGE_ORDER = Object.freeze([
    'trainer_host', 'recorder_module', 'recorder_ui', 'roadmap_module', 'roadmap_ui',
    'studio_module', 'studio_ui', 'pose_runtime', 'pose_frame', 'recording_started',
    'frames_captured', 'local_evidence_saved', 'capture_view_tagged', 'checkpoints_generated',
    'custom_movement_created'
  ]);

  function safeJson(storage, key, fallback = []) {
    try { const value = JSON.parse(storage?.getItem?.(key) || 'null'); return value ?? fallback; } catch (_) { return fallback; }
  }
  function recordingView(recording) { return recording?.meta?.captureView || recording?.captureView || null; }
  function latestFor(recordings, primitiveId) { return (recordings || []).find((item) => !primitiveId || item?.meta?.primitiveId === primitiveId) || null; }
  function check(id, ok, detail, expected = true) { return Object.freeze({ id, ok:Boolean(ok), detail:detail || '', expected:Boolean(expected) }); }

  function deriveChecks(input = {}) {
    const attempted = input.attempted || {};
    const recorderState = input.recorderState || {};
    const runtimeLatest = input.runtimeLatest || null;
    const savedLatest = input.savedLatest || null;
    return Object.freeze([
      check('trainer_host', input.trainerHost, 'private coach-template builder DOM exists'),
      check('recorder_module', input.recorderModule, 'PocketPTMovementRecorder loaded'),
      check('recorder_ui', input.recorderUi, 'Movement Lego Recorder DOM exists'),
      check('roadmap_module', input.roadmapModule, 'PocketPTMovementRecordingRoadmap loaded'),
      check('roadmap_ui', input.roadmapUi, 'Foundation Movement Recording Roadmap DOM exists'),
      check('studio_module', input.studioModule, 'PocketPTMovementCaptureStudio loaded'),
      check('studio_ui', input.studioUi, 'Paired View + Pose Checkpoint Studio DOM exists'),
      check('pose_runtime', input.poseRuntime, 'canonical PoseRuntime exists'),
      check('pose_frame', input.poseFrame, 'canonical pose-runtime frame observed after this capture attempt', attempted.capture),
      check('recording_started', recorderState.state === 'RECORDING' || Boolean(runtimeLatest), `recorder state: ${recorderState.state || 'unknown'}`, attempted.capture),
      check('frames_captured', Number(recorderState.frameCount || runtimeLatest?.summary?.frameCount || 0) > 0, `new capture frames: ${Number(recorderState.frameCount || runtimeLatest?.summary?.frameCount || 0)}`, attempted.capture),
      check('local_evidence_saved', Boolean(savedLatest), 'new recording exists in bounded local evidence store', attempted.save),
      check('capture_view_tagged', ['front','side'].includes(recordingView(savedLatest)), `captureView: ${recordingView(savedLatest) || 'missing'}`, attempted.save),
      check('checkpoints_generated', Array.isArray(savedLatest?.poseCheckpoints) && savedLatest.poseCheckpoints.length > 0, `checkpoints: ${savedLatest?.poseCheckpoints?.length || 0}`, attempted.save),
      check('custom_movement_created', Boolean(input.customCreated), `custom definitions: ${Number(input.customDefinitionCount || 0)}`, attempted.custom)
    ]);
  }

  function findFirstFailure(checks) {
    for (const id of STAGE_ORDER) {
      const item = (checks || []).find((entry) => entry.id === id);
      if (item?.expected && !item.ok) return item;
    }
    return null;
  }

  function installStyles(document) {
    if (document.getElementById('movementCaptureDebugStyles')) return;
    const style = document.createElement('style');
    style.id = 'movementCaptureDebugStyles';
    style.textContent = `.mcd{margin-top:12px;border:1px solid #475569;border-radius:12px;background:#020617;padding:10px}.mcd summary{cursor:pointer;font-weight:800;color:#fde68a}.mcd-first{margin:8px 0;padding:8px;border-radius:8px;background:#0f172a;font-size:.8rem}.mcd-list{display:grid;gap:4px;font-size:.75rem}.mcd-row{display:grid;grid-template-columns:20px minmax(110px,.8fr) 1fr;gap:6px;padding:4px;border-bottom:1px solid #1e293b}.mcd-ok{color:#86efac}.mcd-fail{color:#fca5a5}.mcd-wait{color:#94a3b8}.mcd-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.mcd-actions button{font-size:.75rem}`;
    document.head?.appendChild(style);
  }

  function bootstrap(global) {
    const document = global.document;
    const trainerHost = document?.querySelector?.('[data-coach-template-builder]');
    if (!trainerHost || document.getElementById('movementCaptureDebugPanel')) return null;
    installStyles(document);

    const state = global.__movementCaptureDebugState = global.__movementCaptureDebugState || {
      loadedAt:new Date().toISOString(), attempted:{capture:false,save:false,custom:false},
      poseFrameCount:0, poseFrameCountAtCapture:0, lastPoseAt:null, lastEvent:'debug_loaded',
      baselineEvidenceIds:[], baselineCustomIds:[], capturePrimitiveId:null, lastSnapshot:null
    };
    const panel = document.createElement('details');
    panel.id='movementCaptureDebugPanel'; panel.className='mcd'; panel.open=false;
    panel.innerHTML=`<summary>Movement Capture Debug · First-Failure Trace</summary><div id="mcdFirst" class="mcd-first">Checking pipeline…</div><div id="mcdList" class="mcd-list"></div><div class="mcd-actions"><button type="button" id="mcdRun">Run Motion Debug Check</button><button type="button" id="mcdCopy" class="secondary">Copy Debug Snapshot</button></div>`;
    const studio=document.getElementById('movementCaptureStudio'); (studio || trainerHost).appendChild(panel);

    function currentPrimitive() { return state.capturePrimitiveId || document.getElementById('mlrPrimitive')?.value || global.__movementLegoRecorder?.getState?.()?.meta?.primitiveId || null; }
    function snapshot() {
      const recordings=safeJson(global.localStorage,RECORDINGS_KEY,[]), custom=safeJson(global.localStorage,CUSTOM_KEY,[]);
      const primitiveId=currentPrimitive();
      const recorderState=global.__movementLegoRecorder?.getState?.() || {};
      const runtimeCandidate=recorderState.latest || global.__movementLegoRecorder?.latest || null;
      const baselineIds=new Set(state.baselineEvidenceIds || []);
      const runtimeLatest=runtimeCandidate && !baselineIds.has(runtimeCandidate.recordingId) ? runtimeCandidate : null;
      const savedLatest=(recordings || []).find((item)=>item?.meta?.primitiveId===primitiveId && !baselineIds.has(item?.recordingId)) || null;
      const customBaseline=new Set(state.baselineCustomIds || []);
      const customCreated=custom.some((item)=>!customBaseline.has(item?.id || item?.primitiveId));
      const checks=deriveChecks({
        trainerHost:Boolean(document.querySelector?.('[data-coach-template-builder]')),
        recorderModule:Boolean(global.PocketPTMovementRecorder), recorderUi:Boolean(document.getElementById('motionLegoRecorder')),
        roadmapModule:Boolean(global.PocketPTMovementRecordingRoadmap), roadmapUi:Boolean(document.getElementById('movementRecordingRoadmap')),
        studioModule:Boolean(global.PocketPTMovementCaptureStudio), studioUi:Boolean(document.getElementById('movementCaptureStudio')),
        poseRuntime:Boolean(global.PoseRuntime), poseFrame:state.poseFrameCount > state.poseFrameCountAtCapture,
        recorderState, runtimeLatest, savedLatest, attempted:state.attempted,
        customCreated, customDefinitionCount:custom.length
      });
      const firstFailure=findFirstFailure(checks);
      const report=Object.freeze({
        schemaVersion:1, at:new Date().toISOString(), primitiveId,
        firstFailure:firstFailure ? {id:firstFailure.id,detail:firstFailure.detail} : null,
        checks, poseFrameCount:state.poseFrameCount, poseFramesSinceCapture:Math.max(0,state.poseFrameCount-state.poseFrameCountAtCapture), lastPoseAt:state.lastPoseAt,
        recorder:{state:recorderState.state || null,frameCount:recorderState.frameCount || 0,newRuntimeRecordingId:runtimeLatest?.recordingId || null},
        evidence:{totalLocalRecordings:recordings.length,newSavedRecordingId:savedLatest?.recordingId || null,latestCaptureView:recordingView(savedLatest),checkpointCount:savedLatest?.poseCheckpoints?.length || 0},
        customDefinitions:custom.length, boot:global.__bootCoreState ? {...global.__bootCoreState} : null, lastEvent:state.lastEvent
      });
      state.lastSnapshot=report; global.__movementCaptureDebugSnapshot=report; return report;
    }

    function render() {
      const report=snapshot(), first=document.getElementById('mcdFirst'), list=document.getElementById('mcdList');
      if(first) first.innerHTML=report.firstFailure ? `<strong class="mcd-fail">FIRST FAILURE: ${report.firstFailure.id}</strong><br>${report.firstFailure.detail}` : `<strong class="mcd-ok">NO EXPECTED FAILURE DETECTED</strong><br>Pipeline is healthy through the stages attempted so far.`;
      if(list) list.innerHTML=report.checks.map((item)=>{const symbol=!item.expected?'·':item.ok?'✓':'✕';const cls=!item.expected?'mcd-wait':item.ok?'mcd-ok':'mcd-fail';return `<div class="mcd-row ${cls}"><span>${symbol}</span><strong>${item.id}</strong><span>${item.expected?item.detail:`waiting · ${item.detail}`}</span></div>`;}).join('');
      return report;
    }

    global.addEventListener?.('pose-runtime:frame',()=>{state.poseFrameCount+=1;state.lastPoseAt=new Date().toISOString();if(state.attempted.capture&&state.poseFrameCount%15===0)render();});
    document.addEventListener('click',(event)=>{
      if(event.target?.id==='mlrStart'){
        const primitiveId=document.getElementById('mlrPrimitive')?.value || null;
        state.attempted.capture=true; state.attempted.save=false; state.capturePrimitiveId=primitiveId;
        state.poseFrameCountAtCapture=state.poseFrameCount;
        state.baselineEvidenceIds=safeJson(global.localStorage,RECORDINGS_KEY,[]).filter((item)=>!primitiveId||item?.meta?.primitiveId===primitiveId).map((item)=>item?.recordingId).filter(Boolean);
        state.lastEvent='record_clicked'; global.setTimeout?.(render,80);
      }
      if(event.target?.id==='mlrSave'){state.attempted.save=true;state.lastEvent='save_clicked';global.setTimeout?.(render,180);}
      if(event.target?.id==='mcsCreateCustom'){
        state.attempted.custom=true;state.baselineCustomIds=safeJson(global.localStorage,CUSTOM_KEY,[]).map((item)=>item?.id||item?.primitiveId).filter(Boolean);state.lastEvent='custom_create_clicked';global.setTimeout?.(render,100);
      }
    },true);
    document.getElementById('mcdRun')?.addEventListener('click',render);
    document.getElementById('mcdCopy')?.addEventListener('click',async()=>{try{await global.navigator?.clipboard?.writeText?.(JSON.stringify(render(),null,2));}catch(_){}});

    function integrateDiagnostics(){
      const original=global.__collectDiagnosticReport;
      if(typeof original!=='function'||original.__movementCaptureWrapped)return false;
      const wrapped=function(){const base=original();return{...(base||{}),movementCapture:snapshot()};};
      wrapped.__movementCaptureWrapped=true;global.__collectDiagnosticReport=wrapped;return true;
    }
    integrateDiagnostics(); global.setTimeout?.(integrateDiagnostics,1000); global.setTimeout?.(integrateDiagnostics,3000);
    global.__runMovementCaptureDebug=render; global.setTimeout?.(render,150);
    return Object.freeze({state,snapshot,render});
  }

  if(typeof window!=='undefined'&&window.document){if(window.document.readyState==='loading')window.document.addEventListener('DOMContentLoaded',()=>bootstrap(window),{once:true});else bootstrap(window);}
  return Object.freeze({STAGE_ORDER,deriveChecks,findFirstFailure,bootstrap});
});
