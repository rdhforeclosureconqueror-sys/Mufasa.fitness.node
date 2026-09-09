(function initMotionLabAuthoringDraftStore(root, document) {
  'use strict';

  const VERSION = '1.1.0-authoring-draft-store';
  const PREFIX = 'pocketpt.motionLab.authoringDraft.v1:';
  const workingClipJson = new Map();
  const restoredAdjustment = new Map();
  let installed = false;
  let lastSnapshot = Object.freeze({ status:'idle', motionId:null, savedAt:null, firstFailingBoundary:null });

  function publish(patch){ lastSnapshot = Object.freeze({ ...lastSnapshot, ...patch }); }
  function el(id){ return document.getElementById(id); }
  function status(message, kind='ready'){ const node=el('poseEditorSaveStatus'); if(node){ node.textContent=message; node.dataset.status=kind; } }
  function editor(){ return root.PocketPTMotionLabPoseEditor; }
  function session(){ return editor()?.getActiveSession?.() || null; }
  function motionId(){ return session()?.motionSpec?.motionId || editor()?.exportAdjustment?.()?.motionId || null; }
  function key(id){ return `${PREFIX}${encodeURIComponent(String(id||''))}`; }

  function readRecord(id){
    if(!id) return null;
    try {
      const raw=root.localStorage?.getItem?.(key(id));
      if(!raw) return null;
      const parsed=JSON.parse(raw);
      if(parsed?.schemaVersion!==1 || parsed?.motionId!==id || !parsed?.clip) return null;
      return parsed;
    } catch (_) { return null; }
  }

  function serializeClip(THREE, clip){
    if(clip?.toJSON) return clip.toJSON();
    if(THREE?.AnimationClip?.toJSON) return THREE.AnimationClip.toJSON(clip);
    return null;
  }

  function parseClip(active, json){
    if(!json || !active?.THREE?.AnimationClip?.parse) return null;
    try { return active.THREE.AnimationClip.parse(json); } catch (_) { return null; }
  }

  function mergedAdjustment(id, current){
    const prior=restoredAdjustment.get(id) || readRecord(id)?.adjustment || null;
    const byKey=new Map();
    for(const source of [prior?.edits || [], current?.edits || []]){
      for(const edit of source){
        const k=`${edit.phaseId}:${edit.target}:${edit.mode}:${edit.axis}`;
        byKey.set(k, Object.freeze({ ...edit }));
      }
    }
    return Object.freeze({
      ...(prior || {}), ...(current || {}),
      schemaVersion: current?.schemaVersion || prior?.schemaVersion || 1,
      type: current?.type || prior?.type || 'motion_lab_pose_adjustment',
      motionId:id,
      exerciseId: current?.exerciseId || prior?.exerciseId || session()?.motionSpec?.exerciseId || null,
      edits:Object.freeze([...byKey.values()])
    });
  }

  function currentEditedPhase(adjustment){
    const edits=adjustment?.edits || [];
    return edits.length ? edits[edits.length-1]?.phaseId || null : null;
  }

  function seedWorkingClip(active, id){
    if(workingClipJson.has(id)) return parseClip(active, workingClipJson.get(id));
    const saved=readRecord(id);
    if(saved?.clip){ workingClipJson.set(id, saved.clip); return parseClip(active, saved.clip); }
    const source=active?.sessionClip?.clone?.() || active?.sessionClip;
    const json=serializeClip(active?.THREE, source);
    if(json) workingClipJson.set(id, json);
    return source?.clone?.() || source || null;
  }

  function findNodeForTrack(active, track){
    const owner=String(track?.name||'').split('.')[0];
    let found=null;
    active?.avatar?.traverse?.(node=>{ if(!found && (node?.uuid===owner || node?.name===owner)) found=node; });
    return found;
  }

  function patchNearest(track, time, values){
    if(!track?.times?.length || !track?.values?.length) return;
    let nearest=0, best=Infinity;
    for(let i=0;i<track.times.length;i+=1){ const d=Math.abs(Number(track.times[i])-time); if(d<best){ best=d; nearest=i; } }
    const width=values.length;
    for(let c=0;c<width;c+=1) track.values[nearest*width+c]=values[c];
  }

  function snapshotCurrentPhase(){
    const active=session(), api=editor(), id=motionId();
    if(!active || !api || !id || !active.motionSpec) return { status:'failed', code:'active_motion_required' };
    const current=api.exportAdjustment?.();
    const phaseId=currentEditedPhase(current);
    if(!phaseId) return { status:'ready', skipped:true };
    const phase=active.motionSpec.phases?.find(item=>item.id===phaseId);
    if(!phase) return { status:'failed', code:'authoring_phase_missing' };
    const clip=seedWorkingClip(active,id);
    if(!clip) return { status:'failed', code:'working_clip_unavailable' };
    const time=phase.normalizedTime * active.motionSpec.durationSeconds;
    active.avatar?.updateMatrixWorld?.(true);
    for(const track of clip.tracks || []){
      const node=findNodeForTrack(active,track);
      if(!node) continue;
      if(track.name.endsWith('.quaternion')) patchNearest(track,time,node.quaternion.toArray());
      else if(track.name.endsWith('.position')) patchNearest(track,time,node.position.toArray());
    }
    const json=serializeClip(active.THREE,clip);
    if(!json) return { status:'failed', code:'working_clip_serialization_failed' };
    workingClipJson.set(id,json);
    publish({ status:'phase_snapshotted', motionId:id, phaseId, firstFailingBoundary:null });
    return { status:'ready', motionId:id, phaseId };
  }

  function updateButtons(){
    const id=motionId(), hasSaved=Boolean(readRecord(id));
    const save=el('poseEditorSaveDraft'), load=el('poseEditorLoadDraft'), remove=el('poseEditorDeleteDraft');
    if(save) save.disabled=!id; if(load) load.disabled=!id||!hasSaved; if(remove) remove.disabled=!id||!hasSaved;
    const label=el('poseEditorSavedDraftState'); if(label) label.textContent=hasSaved?'SAVED':'NONE';
  }

  function saveDraft(){
    const api=editor(), active=session(), id=motionId();
    if(!api || !active || !id){ status('Load a generated motion before saving.','failed'); publish({status:'failed',firstFailingBoundary:'active_motion_available'}); return {status:'failed',code:'active_motion_required'}; }
    const current=api.exportAdjustment?.();
    const adjustment=mergedAdjustment(id,current);
    if(!adjustment.edits.length){ status('Make at least one pose adjustment before saving.','failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'authoring_edits_available'}); return {status:'failed',code:'authoring_edits_required'}; }
    const snap=snapshotCurrentPhase();
    if(snap.status!=='ready'){ status(`Could not snapshot the current authored phase (${snap.code}).`,'failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'multi_phase_clip_compose'}); return snap; }
    const clipJson=workingClipJson.get(id) || serializeClip(active.THREE,active.sessionClip);
    if(!clipJson){ status('Adjusted clip could not be serialized.','failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'clip_serialization'}); return {status:'failed',code:'clip_serialization_failed'}; }
    const savedAt=new Date().toISOString();
    const record=Object.freeze({ schemaVersion:1, storeVersion:VERSION, motionId:id, exerciseId:adjustment.exerciseId||active.motionSpec?.exerciseId||null, savedAt, adjustment, clip:clipJson });
    try { root.localStorage?.setItem?.(key(id),JSON.stringify(record)); }
    catch(error){ status('Browser storage rejected the authored motion.','failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'browser_storage_write'}); return {status:'failed',code:'browser_storage_write_failed',cause:String(error?.message||error)}; }
    restoredAdjustment.set(id,adjustment);
    status(`Saved authored motion draft for ${id}. ${adjustment.edits.length} structured edit(s) preserved.`);
    publish({status:'saved',motionId:id,savedAt,editCount:adjustment.edits.length,firstFailingBoundary:null}); updateButtons();
    return {status:'ready',motionId:id,savedAt,editCount:adjustment.edits.length};
  }

  function loadDraft(){
    const active=session(), id=motionId(), record=readRecord(id);
    if(!active || !id || !record){ status('No saved authored motion exists for the loaded motion.','failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'saved_draft_available'}); return {status:'failed',code:'saved_draft_missing'}; }
    const clip=parseClip(active,record.clip);
    if(!clip || !active.motionSpec){ status('Saved authored motion is unreadable.','failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'saved_clip_parse'}); return {status:'failed',code:'saved_clip_parse_failed'}; }
    clip.name=`${active.motionSpec.motionId} [SAVED AUTHORING DRAFT]`;
    const compiler=Object.freeze({ compile(){ return Object.freeze({ status:'ready', clip, diagnostics:Object.freeze({ authoredDraft:true, authoredDraftSavedAt:record.savedAt, authoredDraftStoreVersion:record.storeVersion||null, authoredDraftEditCount:record.adjustment?.edits?.length||0 }) }); } });
    active.stop?.();
    const out=active.loadMotionSpec(active.motionSpec,compiler);
    if(out?.status!=='ready'){ status(`Saved draft could not be loaded (${out?.code||'load_failed'}).`,'failed'); publish({status:'failed',motionId:id,firstFailingBoundary:'saved_draft_load'}); return out||{status:'failed',code:'saved_draft_load_failed'}; }
    workingClipJson.set(id,record.clip);
    restoredAdjustment.set(id,Object.freeze(record.adjustment || { edits:[] }));
    status(`Loaded saved authored motion from ${record.savedAt}. Previous structured edit history is preserved for the next save.`);
    publish({status:'loaded',motionId:id,savedAt:record.savedAt,editCount:record.adjustment?.edits?.length||0,firstFailingBoundary:null}); updateButtons();
    return {status:'ready',motionId:id,savedAt:record.savedAt,editCount:record.adjustment?.edits?.length||0};
  }

  function deleteDraft(){
    const id=motionId(); if(!id) return {status:'failed',code:'active_motion_required'};
    try { root.localStorage?.removeItem?.(key(id)); } catch(_) {}
    workingClipJson.delete(id); restoredAdjustment.delete(id);
    status('Saved authored motion draft deleted. Canonical Motion Spec was not changed.');
    publish({status:'deleted',motionId:id,savedAt:null,firstFailingBoundary:null}); updateButtons(); return {status:'ready',motionId:id};
  }

  function install(){
    const save=el('poseEditorSaveDraft');
    if(!save || !editor()?.getActiveSession) return null;
    if(!installed){
      save.addEventListener('click',saveDraft);
      el('poseEditorLoadDraft')?.addEventListener('click',loadDraft);
      el('poseEditorDeleteDraft')?.addEventListener('click',deleteDraft);
      el('poseEditorLoadPhase')?.addEventListener('click',()=>{ snapshotCurrentPhase(); },true);
      installed=true;
    }
    updateButtons();
    if(!root.__motionLabAuthoringDraftButtonTimer) root.__motionLabAuthoringDraftButtonTimer=root.setInterval?.(updateButtons,1000);
    publish({status:'installed',firstFailingBoundary:null});
    return root.PocketPTMotionLabAuthoringDraftStore;
  }

  root.PocketPTMotionLabAuthoringDraftStore=Object.freeze({ VERSION, install, saveDraft, loadDraft, deleteDraft, snapshotCurrentPhase, hasDraft:id=>Boolean(readRecord(id)), readDraft:readRecord, snapshot:()=>lastSnapshot });

  function waitForRuntime(){
    if(install()) return;
    root.setTimeout?.(waitForRuntime,500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',waitForRuntime,{once:true});
  else waitForRuntime();
})(window, document);
