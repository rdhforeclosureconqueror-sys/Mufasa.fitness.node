(function initMotionLabMotionDirectionAuthoring(root, document) {
  'use strict';

  const VERSION = '1.2.0-motion-scoped-direction-humanize';
  const SAMPLE_COUNT = 7;
  const TARGET_BONES = Object.freeze({
    left_foot: Object.freeze(['mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot']),
    right_foot: Object.freeze(['mixamorig:RightUpLeg','mixamorig:RightLeg','mixamorig:RightFoot']),
    left_hand: Object.freeze(['mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand']),
    right_hand: Object.freeze(['mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand']),
    left_hip: Object.freeze(['mixamorig:LeftUpLeg']), right_hip: Object.freeze(['mixamorig:RightUpLeg']),
    left_knee: Object.freeze(['mixamorig:LeftLeg']), right_knee: Object.freeze(['mixamorig:RightLeg']),
    left_shoulder: Object.freeze(['mixamorig:LeftArm']), right_shoulder: Object.freeze(['mixamorig:RightArm']),
    left_elbow: Object.freeze(['mixamorig:LeftForeArm']), right_elbow: Object.freeze(['mixamorig:RightForeArm']),
    hips: Object.freeze(['mixamorig:Hips']), spine: Object.freeze(['mixamorig:Spine']), head: Object.freeze(['mixamorig:Head'])
  });

  let installed = false;
  let intents = [];
  let workingClip = null;
  let phaseObserver = null;
  let activeMotionId = null;
  let lastSnapshot = Object.freeze({ status: 'idle', motionId: null, transitionCount: 0, firstFailingBoundary: null });

  function el(id) { return document.getElementById(id); }
  function editor() { return root.PocketPTMotionLabPoseEditor; }
  function session() { return editor()?.getActiveSession?.() || null; }
  function currentMotionId() { return session()?.motionSpec?.motionId || null; }
  function phases() { return Array.isArray(session()?.motionSpec?.phases) ? session().motionSpec.phases : []; }
  function phaseById(id) { return phases().find(item => item.id === id) || null; }
  function publish(patch) { lastSnapshot = Object.freeze({ ...lastSnapshot, ...patch, motionId: currentMotionId(), transitionCount: intents.length }); }
  function status(message, kind = 'ready') { const node = el('motionDirectionStatus'); if (node) { node.textContent = message; node.dataset.status = kind; } }
  function poseStatus(message, kind = 'ready') { const node = el('poseEditorStatus'); if (node) { node.textContent = message; node.dataset.status = kind; } }

  function syncMotionScope() {
    const id = currentMotionId();
    if (id !== activeMotionId) {
      intents = [];
      workingClip = null;
      activeMotionId = id;
      publish({ status: id ? 'motion_changed' : 'idle', firstFailingBoundary: null });
    }
    return id;
  }

  function easing(profile, t) {
    const x = Math.max(0, Math.min(1, Number(t) || 0));
    if (profile === 'linear') return x;
    if (profile === 'smooth') return x * x * (3 - 2 * x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function syncTargetOptions() {
    const source = el('poseEditorTarget'), target = el('motionDirectionTarget');
    if (!source || !target) return;
    const sourceValues = [...source.options].map(option => option.value).join('|');
    const targetValues = [...target.options].map(option => option.value).join('|');
    if (sourceValues === targetValues) return;
    const current = target.value;
    target.replaceChildren();
    for (const option of source.options) target.appendChild(option.cloneNode(true));
    if ([...target.options].some(option => option.value === current)) target.value = current;
  }

  function syncPhaseOptions() {
    syncMotionScope();
    const from = el('motionDirectionFromPhase'), to = el('motionDirectionToPhase');
    if (!from || !to) return;
    const list = phases(), currentFrom = from.value, currentTo = to.value, sourcePhase = el('poseEditorPhase')?.value;
    from.replaceChildren(); to.replaceChildren();
    for (const phase of list) {
      const a = document.createElement('option'); a.value = phase.id; a.textContent = phase.id; from.appendChild(a);
      const b = document.createElement('option'); b.value = phase.id; b.textContent = phase.id; to.appendChild(b);
    }
    if (list.some(item => item.id === currentFrom)) from.value = currentFrom;
    else if (list.some(item => item.id === sourcePhase)) from.value = sourcePhase;
    if (list.some(item => item.id === currentTo)) to.value = currentTo;
    else {
      const index = Math.max(0, list.findIndex(item => item.id === from.value));
      if (list[index + 1]) to.value = list[index + 1].id;
    }
    syncTargetOptions(); updateAvailability();
  }

  function validTransition() {
    const list = phases();
    const fromId = el('motionDirectionFromPhase')?.value, toId = el('motionDirectionToPhase')?.value;
    const fromIndex = list.findIndex(item => item.id === fromId), toIndex = list.findIndex(item => item.id === toId);
    if (fromIndex < 0 || toIndex < 0) return { status: 'failed', code: 'transition_phase_required' };
    if (toIndex !== fromIndex + 1) return { status: 'failed', code: 'transition_must_be_adjacent', fromPhaseId: fromId, toPhaseId: toId };
    const from = list[fromIndex], to = list[toIndex];
    if (!(to.normalizedTime > from.normalizedTime)) return { status: 'failed', code: 'transition_order_invalid', fromPhaseId: fromId, toPhaseId: toId };
    return { status: 'ready', from, to };
  }

  function updateAvailability() {
    const ready = Boolean(session()?.motionSpec && phases().length > 1);
    ['motionDirectionFromPhase','motionDirectionToPhase','motionDirectionTarget','motionDirectionStep','motionDirectionUp','motionDirectionDown','motionDirectionLeft','motionDirectionRight','motionDirectionForward','motionDirectionBack','motionDirectionTwistIn','motionDirectionTwistOut','motionDirectionHumanize','motionDirectionPreview','motionDirectionClear'].forEach(id => { const node = el(id); if (node) node.disabled = !ready; });
  }

  function configurePoseEditor(targetId, mode, axis) {
    const target = el('poseEditorTarget'), modeSelect = el('poseEditorMode'), axisSelect = el('poseEditorAxis'), step = el('poseEditorStep');
    if (!target || !modeSelect || !axisSelect || !step) return false;
    target.value = targetId; target.dispatchEvent(new Event('change', { bubbles: true }));
    modeSelect.value = mode; modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    axisSelect.value = axis; step.value = el('motionDirectionStep')?.value || 'small';
    return axisSelect.value === axis;
  }

  function trackMatchesNode(track, node, suffix) { return track.name.endsWith(suffix) && (track.name.startsWith(`${node.uuid}.`) || track.name.startsWith(`${node.name}.`)); }
  function nearestIndex(track, time) { let index = 0, best = Infinity; for (let i = 0; i < track.times.length; i += 1) { const d = Math.abs(Number(track.times[i]) - time); if (d < best) { best = d; index = i; } } return index; }

  function mergeDestinationKeys(baseClip, patchClip, boneNames, time) {
    const out = baseClip?.clone?.();
    if (!out || !patchClip) return null;
    for (const boneName of boneNames) {
      const node = editor()?.traverseByName?.(boneName); if (!node) continue;
      for (const suffix of ['.quaternion','.position']) {
        const source = patchClip.tracks.find(track => trackMatchesNode(track, node, suffix));
        const destination = out.tracks.find(track => trackMatchesNode(track, node, suffix));
        if (!source || !destination) continue;
        const si = nearestIndex(source, time), di = nearestIndex(destination, time), size = destination.getValueSize();
        for (let c = 0; c < size; c += 1) destination.values[di * size + c] = source.values[si * size + c];
      }
    }
    return out;
  }

  function installClip(clip, play) {
    const active = session();
    if (!active?.mixer || !active?.avatar || !clip) return { status: 'failed', code: 'transition_preview_session_unavailable' };
    active.stop?.(); active.sessionClip = clip; active.action = active.mixer.clipAction(clip, active.avatar); active.setLoop?.(false);
    if (play) active.play?.(); else active.pause?.();
    return { status: 'ready', clip };
  }

  function applyDirection(action) {
    syncMotionScope();
    syncPhaseOptions();
    const transition = validTransition();
    if (transition.status !== 'ready') {
      const message = transition.code === 'transition_must_be_adjacent'
        ? 'Direction authoring works one phase at a time. Choose the phase immediately after From.'
        : 'Choose valid consecutive From and To phases.';
      status(message, 'failed'); publish({ status: 'failed', firstFailingBoundary: transition.code }); return transition;
    }
    const api = editor(), phaseApi = root.PocketPTMotionLabPhaseAuthoring, targetId = el('motionDirectionTarget')?.value, boneNames = TARGET_BONES[targetId];
    if (!api?.playAdjustedPreview || !phaseApi?.samplePhase || !boneNames) {
      status('Motion direction authoring dependencies are not ready.', 'failed'); publish({ status: 'failed', firstFailingBoundary: 'MOTION_DIRECTION_DEPENDENCY' });
      return { status: 'failed', code: 'motion_direction_dependency' };
    }

    const sampled = phaseApi.samplePhase(transition.to.id);
    if (sampled?.status !== 'ready') { status(`Could not load destination phase “${transition.to.id}”.`, 'failed'); publish({ status: 'failed', firstFailingBoundary: sampled?.code || 'DESTINATION_PHASE_SAMPLE' }); return sampled; }

    const map = {
      up: ['move','up',1], down: ['move','up',-1], right: ['move','lateral',1], left: ['move','lateral',-1],
      forward: ['move','forward',1], back: ['move','forward',-1], twist_in: ['rotate','y',1], twist_out: ['rotate','y',-1]
    };
    const command = map[action];
    if (!command || !configurePoseEditor(targetId, command[0], command[1])) {
      status('The selected direction could not be configured for this body part.', 'failed'); publish({ status: 'failed', firstFailingBoundary: 'DIRECTION_CONFIGURATION' });
      return { status: 'failed', code: 'direction_configuration_failed' };
    }

    const before = JSON.stringify(api.exportAdjustment?.()?.edits || []);
    el(command[2] > 0 ? 'poseEditorPlus' : 'poseEditorMinus')?.click?.();
    const after = JSON.stringify(api.exportAdjustment?.()?.edits || []);
    if (after === before) {
      status('That movement was rejected. For position direction use a hand, foot, or hips; use Twist for rotatable joints.', 'failed'); publish({ status: 'failed', firstFailingBoundary: 'AUTHORING_DELTA_REJECTED' });
      return { status: 'failed', code: 'authoring_delta_rejected' };
    }

    const built = api.playAdjustedPreview(); session()?.pause?.();
    if (built?.status !== 'ready') { status(`Could not build the directed destination pose (${built?.code || 'preview_failed'}).`, 'failed'); publish({ status: 'failed', firstFailingBoundary: built?.code || 'DIRECTED_DESTINATION_BUILD' }); return built; }
    const merged = mergeDestinationKeys(workingClip || built.clip, built.clip, boneNames, sampled.time);
    if (!merged) { status('The directed destination could not be merged into the working motion.', 'failed'); publish({ status: 'failed', firstFailingBoundary: 'DESTINATION_KEY_MERGE' }); return { status: 'failed', code: 'destination_key_merge_failed' }; }
    workingClip = merged; installClip(workingClip, false);

    const intent = Object.freeze({ fromPhaseId: transition.from.id, toPhaseId: transition.to.id, target: targetId, action, easing: el('motionDirectionHumanize')?.value || 'human', sampleCount: SAMPLE_COUNT });
    intents = intents.filter(item => !(item.fromPhaseId === intent.fromPhaseId && item.toPhaseId === intent.toPhaseId && item.target === intent.target && item.action === intent.action));
    intents.push(intent);
    status(`${targetId.replaceAll('_',' ')}: ${action.replaceAll('_',' ')} authored from ${transition.from.id} → ${transition.to.id}. Press Preview Directed Motion.`);
    poseStatus(`Directed transition authored: ${transition.from.id} → ${transition.to.id}.`); publish({ status: 'ready', firstFailingBoundary: null, lastIntent: intent });
    return { status: 'ready', intent, clip: workingClip };
  }

  function valueAtNearest(track, time) { const i = nearestIndex(track, time), size = track.getValueSize(); return Array.from(track.values.slice(i * size, i * size + size)); }

  function reshapeTrack(THREE, track, fromTime, toTime, profile, samples) {
    if (!(toTime > fromTime) || samples < 3) return track.clone?.() || track;
    const size = track.getValueSize(), start = valueAtNearest(track, fromTime), end = valueAtNearest(track, toTime), points = [];
    for (let i = 0; i < track.times.length; i += 1) {
      const time = Number(track.times[i]);
      if (time > fromTime + 1e-7 && time < toTime - 1e-7) continue;
      points.push({ time, value: Array.from(track.values.slice(i * size, i * size + size)) });
    }
    for (let i = 1; i < samples - 1; i += 1) {
      const clock = i / (samples - 1), alpha = easing(profile, clock);
      let value;
      if (size === 4 && track.name.endsWith('.quaternion') && THREE?.Quaternion) {
        value = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion().fromArray(start), new THREE.Quaternion().fromArray(end), alpha).toArray();
      } else value = start.map((component, index) => component + (end[index] - component) * alpha);
      points.push({ time: fromTime + (toTime - fromTime) * clock, value });
    }
    points.sort((a,b) => a.time - b.time);
    return new track.constructor(track.name, points.map(point => point.time), points.flatMap(point => point.value), track.getInterpolation?.());
  }

  function shapeIntent(clip, intent) {
    const active = session(), THREE = active?.THREE, from = phaseById(intent.fromPhaseId), to = phaseById(intent.toPhaseId), boneNames = TARGET_BONES[intent.target] || [];
    if (!THREE || !from || !to || !active?.motionSpec) return { status: 'failed', code: 'transition_shape_context_missing' };
    const list = phases(), fromIndex = list.findIndex(item => item.id === from.id), toIndex = list.findIndex(item => item.id === to.id);
    if (toIndex !== fromIndex + 1) return { status: 'failed', code: 'transition_must_be_adjacent' };
    const fromTime = from.normalizedTime * active.motionSpec.durationSeconds, toTime = to.normalizedTime * active.motionSpec.durationSeconds;
    const identities = boneNames.map(name => editor()?.traverseByName?.(name)).filter(Boolean);
    let shaped = 0;
    clip.tracks = clip.tracks.map(track => {
      const selected = identities.some(node => track.name.startsWith(`${node.name}.`) || track.name.startsWith(`${node.uuid}.`));
      if (!selected || !(track.name.endsWith('.quaternion') || track.name.endsWith('.position'))) return track;
      shaped += 1; return reshapeTrack(THREE, track, fromTime, toTime, intent.easing || 'human', intent.sampleCount || SAMPLE_COUNT);
    });
    return shaped ? { status: 'ready', clip, shapedTracks: shaped } : { status: 'failed', code: 'transition_track_unresolved' };
  }

  function buildPreview(options = {}) {
    syncMotionScope();
    if (intents.length === 0) return { status: 'failed', code: 'directed_motion_required' };
    if (options.refreshPose !== false) {
      const poseBuilt = editor()?.playAdjustedPreview?.();
      session()?.pause?.();
      if (poseBuilt?.status !== 'ready') return poseBuilt || { status: 'failed', code: 'pose_preview_refresh_failed' };
      workingClip = poseBuilt.clip?.clone?.() || poseBuilt.clip;
    }
    if (!workingClip) return { status: 'failed', code: 'directed_clip_unavailable' };
    const clip = workingClip.clone?.(); if (!clip) return { status: 'failed', code: 'directed_clip_clone_failed' };
    let total = 0;
    for (const intent of intents) {
      const out = shapeIntent(clip, intent);
      if (out.status !== 'ready') { status(`Humanized transition failed (${out.code}).`, 'failed'); publish({ status: 'failed', firstFailingBoundary: out.code }); return out; }
      total += out.shapedTracks || 0;
    }
    clip.name = `${clip.name || session()?.motionSpec?.motionId || 'motion'} [DIRECTED HUMANIZED PREVIEW]`;
    const installedClip = installClip(clip, options.play === true); if (installedClip.status !== 'ready') return installedClip;
    if (options.play === true) status(`Previewing ${intents.length} directed transition(s) with humanized ease-in/ease-out timing.`);
    publish({ status: 'ready', firstFailingBoundary: null, shapedTracks: total, previewPlaying: options.play === true });
    return { status: 'ready', clip, shapedTracks: total, transitionCount: intents.length };
  }

  function preview() { return buildPreview({ play: true, refreshPose: true }); }
  function clearPlan() { intents = []; workingClip = null; status('Directed transition plan cleared. Canonical Motion Spec was not changed.'); publish({ status: 'ready', firstFailingBoundary: null }); return { status: 'ready' }; }
  function exportPlan() {
    syncMotionScope();
    const active = session();
    return Object.freeze({ schemaVersion: 1, type: 'motion_lab_transition_direction_plan', authoringVersion: VERSION, motionId: active?.motionSpec?.motionId || null, exerciseId: active?.motionSpec?.exerciseId || null, transitions: Object.freeze(intents.map(item => Object.freeze({ ...item }))) });
  }
  function restorePlan(plan) {
    if (plan && plan.type !== 'motion_lab_transition_direction_plan') return { status: 'failed', code: 'transition_plan_invalid' };
    const motionId = syncMotionScope();
    if (plan?.motionId && motionId && plan.motionId !== motionId) {
      status(`Saved directed transition plan belongs to a different motion (${plan.motionId}).`, 'failed');
      publish({ status: 'failed', firstFailingBoundary: 'TRANSITION_PLAN_MOTION_MISMATCH' });
      return { status: 'failed', code: 'transition_plan_motion_mismatch', expectedMotionId: motionId, actualMotionId: plan.motionId };
    }
    const restored = Array.isArray(plan?.transitions) ? plan.transitions : [];
    const list = phases();
    for (const item of restored) {
      const fromIndex = list.findIndex(phase => phase.id === item?.fromPhaseId);
      const toIndex = list.findIndex(phase => phase.id === item?.toPhaseId);
      if (fromIndex < 0 || toIndex !== fromIndex + 1 || !TARGET_BONES[item?.target]) {
        status('Saved directed transition plan contains a transition that is not valid for the loaded motion.', 'failed');
        publish({ status: 'failed', firstFailingBoundary: 'TRANSITION_PLAN_CONTEXT_MISMATCH' });
        return { status: 'failed', code: 'transition_plan_context_mismatch' };
      }
    }
    intents = restored.map(item => Object.freeze({ ...item }));
    workingClip = session()?.sessionClip?.clone?.() || session()?.sessionClip || null;
    syncPhaseOptions();
    status(intents.length ? `Restored ${intents.length} directed transition(s) from the saved authored motion.` : 'No directed transitions were stored in this draft.');
    publish({ status: 'ready', firstFailingBoundary: null });
    return { status: 'ready', transitionCount: intents.length };
  }

  function wireButton(id, action) { const node = el(id); if (node && node.dataset.motionDirectionWired !== '1') { node.dataset.motionDirectionWired = '1'; node.addEventListener('click', () => applyDirection(action)); } }
  function install() {
    if (installed) { syncPhaseOptions(); return root.PocketPTMotionLabMotionDirectionAuthoring; }
    if (!editor()?.getActiveSession || !root.PocketPTMotionLabPhaseAuthoring?.samplePhase) return null;
    const sourcePhases = el('poseEditorPhase'); if (!sourcePhases || !el('motionDirectionFromPhase')) return null;
    wireButton('motionDirectionUp','up'); wireButton('motionDirectionDown','down'); wireButton('motionDirectionLeft','left'); wireButton('motionDirectionRight','right');
    wireButton('motionDirectionForward','forward'); wireButton('motionDirectionBack','back'); wireButton('motionDirectionTwistIn','twist_in'); wireButton('motionDirectionTwistOut','twist_out');
    if (el('motionDirectionPreview')?.dataset.motionDirectionWired !== '1') {
      el('motionDirectionPreview').dataset.motionDirectionWired = '1';
      el('motionDirectionPreview').addEventListener('click', preview);
      el('motionDirectionClear')?.addEventListener('click', clearPlan);
      el('motionDirectionFromPhase')?.addEventListener('change', updateAvailability);
      el('motionDirectionToPhase')?.addEventListener('change', updateAvailability);
    }
    phaseObserver = new MutationObserver(syncPhaseOptions); phaseObserver.observe(sourcePhases, { childList: true });
    installed = true; syncPhaseOptions();
    status('Choose consecutive From/To phases, a body part, then direct how it should travel. Human timing preserves the exact phase endpoints.');
    publish({ status: 'installed', firstFailingBoundary: null }); return root.PocketPTMotionLabMotionDirectionAuthoring;
  }

  root.PocketPTMotionLabMotionDirectionAuthoring = Object.freeze({ VERSION, install, applyDirection, buildPreview, preview, clearPlan, exportPlan, restorePlan, easing, reshapeTrack, snapshot: () => lastSnapshot });

  function tryInitialInstall() { install(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInitialInstall, { once: true }); else tryInitialInstall();
})(window, document);