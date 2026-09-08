(function initMotionLabPoseEditor(root, document) {
  'use strict';

  const VERSION = '1.0.0-pose-authoring-v1';
  const INCH_TO_WORLD = 0.0254;
  const TARGETS = Object.freeze({
    left_foot: Object.freeze({ label: 'Left Foot', bone: 'mixamorig:LeftFoot', mode: 'endpoint', chain: ['mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot'] }),
    right_foot: Object.freeze({ label: 'Right Foot', bone: 'mixamorig:RightFoot', mode: 'endpoint', chain: ['mixamorig:RightUpLeg','mixamorig:RightLeg','mixamorig:RightFoot'] }),
    left_hand: Object.freeze({ label: 'Left Hand', bone: 'mixamorig:LeftHand', mode: 'endpoint', chain: ['mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand'] }),
    right_hand: Object.freeze({ label: 'Right Hand', bone: 'mixamorig:RightHand', mode: 'endpoint', chain: ['mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand'] }),
    left_hip: Object.freeze({ label: 'Left Hip', bone: 'mixamorig:LeftUpLeg', mode: 'joint' }),
    right_hip: Object.freeze({ label: 'Right Hip', bone: 'mixamorig:RightUpLeg', mode: 'joint' }),
    left_knee: Object.freeze({ label: 'Left Knee', bone: 'mixamorig:LeftLeg', mode: 'joint' }),
    right_knee: Object.freeze({ label: 'Right Knee', bone: 'mixamorig:RightLeg', mode: 'joint' }),
    left_shoulder: Object.freeze({ label: 'Left Shoulder', bone: 'mixamorig:LeftArm', mode: 'joint' }),
    right_shoulder: Object.freeze({ label: 'Right Shoulder', bone: 'mixamorig:RightArm', mode: 'joint' }),
    left_elbow: Object.freeze({ label: 'Left Elbow', bone: 'mixamorig:LeftForeArm', mode: 'joint' }),
    right_elbow: Object.freeze({ label: 'Right Elbow', bone: 'mixamorig:RightForeArm', mode: 'joint' }),
    hips: Object.freeze({ label: 'Hips / Pelvis', bone: 'mixamorig:Hips', mode: 'root' }),
    spine: Object.freeze({ label: 'Torso / Spine', bone: 'mixamorig:Spine', mode: 'joint' }),
    head: Object.freeze({ label: 'Head', bone: 'mixamorig:Head', mode: 'joint' })
  });

  let activeSession = null;
  let originalMotionSpec = null;
  let originalClip = null;
  let sampledPhaseId = null;
  let baseline = null;
  let edits = [];
  let previewClip = null;
  let installed = false;

  function el(id) { return document.getElementById(id); }
  function status(message, kind = 'ready') {
    const node = el('poseEditorStatus');
    if (node) { node.textContent = message; node.dataset.status = kind; }
  }

  function traverseByName(name) {
    let found = null;
    activeSession?.avatar?.traverse?.(node => { if (!found && node.name === name) found = node; });
    return found;
  }

  function cloneTransform(node) {
    return Object.freeze({
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone()
    });
  }

  function captureEditablePose() {
    const map = new Map();
    for (const target of Object.values(TARGETS)) {
      const node = traverseByName(target.bone);
      if (node && !map.has(target.bone)) map.set(target.bone, cloneTransform(node));
      for (const name of target.chain || []) {
        const chainNode = traverseByName(name);
        if (chainNode && !map.has(name)) map.set(name, cloneTransform(chainNode));
      }
    }
    return map;
  }

  function restorePose(map) {
    if (!map) return false;
    for (const [name, transform] of map.entries()) {
      const node = traverseByName(name);
      if (!node) continue;
      node.position.copy(transform.position);
      node.quaternion.copy(transform.quaternion);
      node.scale.copy(transform.scale);
    }
    activeSession?.avatar?.updateMatrixWorld?.(true);
    return true;
  }

  function phaseById(id) {
    return activeSession?.motionSpec?.phases?.find(phase => phase.id === id) || null;
  }

  function populatePhases() {
    const select = el('poseEditorPhase');
    if (!select) return;
    const phases = activeSession?.motionSpec?.phases || [];
    const current = activeSession?.currentMotionPhase?.();
    select.replaceChildren();
    for (const phase of phases) {
      const option = document.createElement('option');
      option.value = phase.id;
      option.textContent = phase.id;
      if (phase.id === current) option.selected = true;
      select.appendChild(option);
    }
  }

  function samplePhase(phaseId) {
    if (!activeSession?.action || !activeSession?.mixer || !activeSession?.motionSpec) {
      status('Load a generated Motion Spec first.', 'failed');
      return { status: 'failed', code: 'motion_spec_required' };
    }
    const phase = phaseById(phaseId);
    if (!phase) return { status: 'failed', code: 'phase_required' };
    activeSession.pause?.();
    const time = phase.normalizedTime * activeSession.motionSpec.durationSeconds;
    activeSession.action.enabled = true;
    activeSession.action.play?.();
    activeSession.action.paused = true;
    activeSession.mixer.setTime?.(time);
    activeSession.avatar.updateMatrixWorld?.(true);
    sampledPhaseId = phase.id;
    baseline = captureEditablePose();
    edits = edits.filter(edit => edit.phaseId !== sampledPhaseId);
    status(`Editing phase “${sampledPhaseId}”. Tap − / + to adjust.`);
    refreshOutput();
    return { status: 'ready', phaseId: sampledPhaseId, time };
  }

  function axisVector(THREE, axis, amount) {
    return new THREE.Vector3(axis === 'x' ? amount : 0, axis === 'y' ? amount : 0, axis === 'z' ? amount : 0);
  }

  function worldToLocalDelta(node, worldDelta) {
    if (!node?.parent) return worldDelta.clone();
    const q = node.parent.getWorldQuaternion(new activeSession.THREE.Quaternion()).invert();
    return worldDelta.clone().applyQuaternion(q);
  }

  function applyEndpoint(target, axis, amountWorld) {
    const [rootName, jointName, endName] = target.chain || [];
    const rootNode = traverseByName(rootName), jointNode = traverseByName(jointName), endNode = traverseByName(endName);
    if (!rootNode || !jointNode || !endNode) return { status: 'failed', code: 'authoring_chain_unresolved' };
    const THREE = activeSession.THREE;
    activeSession.avatar.updateMatrixWorld?.(true);
    const rootWorld = rootNode.getWorldPosition(new THREE.Vector3());
    const jointWorld = jointNode.getWorldPosition(new THREE.Vector3());
    const endWorld = endNode.getWorldPosition(new THREE.Vector3());
    const targetWorld = endWorld.clone().add(axisVector(THREE, axis, amountWorld));
    const length1 = rootWorld.distanceTo(jointWorld), length2 = jointWorld.distanceTo(endWorld);
    const out = root.PocketPTMotionLabIntelligenceAdapter?.solveAuthoringChain?.({
      THREE,
      avatar: activeSession.avatar,
      chain: { id: target.bone, rootNode, jointNode, endNode, contactNode: endNode, contactId: target.bone, anchor: targetWorld, length1, length2, contactLocalOffset: null },
      bodyScale: bodyScale()
    });
    return out || { status: 'failed', code: 'authoring_ik_unavailable' };
  }

  function bodyScale() {
    const THREE = activeSession?.THREE;
    if (!THREE || !activeSession?.avatar) return 1;
    const size = new THREE.Box3().setFromObject(activeSession.avatar).getSize(new THREE.Vector3());
    return Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
  }

  function applyRotation(target, axis, degrees) {
    const node = traverseByName(target.bone);
    if (!node) return { status: 'failed', code: 'authoring_bone_unresolved' };
    const THREE = activeSession.THREE;
    const radians = THREE.MathUtils.degToRad(degrees);
    const euler = new THREE.Euler(axis === 'x' ? radians : 0, axis === 'y' ? radians : 0, axis === 'z' ? radians : 0, 'XYZ');
    node.quaternion.multiply(new THREE.Quaternion().setFromEuler(euler)).normalize();
    activeSession.avatar.updateMatrixWorld?.(true);
    return { status: 'ready' };
  }

  function applyRootPosition(axis, amountWorld) {
    const node = traverseByName('mixamorig:Hips');
    if (!node) return { status: 'failed', code: 'authoring_root_unresolved' };
    const delta = worldToLocalDelta(node, axisVector(activeSession.THREE, axis, amountWorld));
    node.position.add(delta);
    activeSession.avatar.updateMatrixWorld?.(true);
    return { status: 'ready' };
  }

  function selectedStep(mode) {
    const preset = el('poseEditorStep')?.value || 'small';
    if (mode === 'rotate') return preset === 'tiny' ? 1 : preset === 'medium' ? 10 : 5;
    return (preset === 'tiny' ? 0.25 : preset === 'medium' ? 5 : 1) * INCH_TO_WORLD;
  }

  function recordEdit(edit) {
    const key = `${edit.phaseId}:${edit.target}:${edit.mode}:${edit.axis}`;
    const existing = edits.find(item => item.key === key);
    if (existing) existing.amount += edit.amount;
    else edits.push({ ...edit, key });
    edits = edits.filter(item => Math.abs(item.amount) > 1e-9);
  }

  function nudge(direction) {
    if (!activeSession?.avatar || !sampledPhaseId || !baseline) {
      status('Choose a phase and press “Load Phase for Editing” first.', 'failed');
      return;
    }
    const targetId = el('poseEditorTarget')?.value;
    const target = TARGETS[targetId];
    const mode = el('poseEditorMode')?.value || 'move';
    const axis = el('poseEditorAxis')?.value || 'x';
    if (!target) return;
    const step = selectedStep(mode) * direction;
    let out;
    if (mode === 'rotate') out = applyRotation(target, axis, step);
    else if (target.mode === 'endpoint') out = applyEndpoint(target, axis, step);
    else if (target.mode === 'root') out = applyRootPosition(axis, step);
    else {
      status('Position mode is available for hands, feet, and hips. Use Rotate for this joint.', 'failed');
      return;
    }
    if (out?.status !== 'ready') {
      status(`Adjustment rejected: ${out?.code || 'authoring_failed'}`, 'failed');
      return;
    }
    recordEdit({ phaseId: sampledPhaseId, target: targetId, bone: target.bone, mode, axis, amount: step, unit: mode === 'rotate' ? 'degrees' : 'world_units' });
    const shown = mode === 'rotate' ? `${Math.abs(step).toFixed(1)}°` : `${(Math.abs(step) / INCH_TO_WORLD).toFixed(2)} in`;
    status(`${target.label}: ${direction > 0 ? '+' : '−'}${shown} ${axis.toUpperCase()} applied.`);
    refreshOutput();
  }

  function changedBones() {
    if (!baseline) return [];
    const changed = [];
    for (const [name, before] of baseline.entries()) {
      const node = traverseByName(name);
      if (!node) continue;
      const qChanged = 1 - Math.abs(node.quaternion.dot(before.quaternion)) > 1e-8;
      const pChanged = node.position.distanceTo(before.position) > 1e-8;
      if (qChanged || pChanged) changed.push(name);
    }
    return changed;
  }

  function patchPreviewClip() {
    if (!activeSession?.sessionClip || !sampledPhaseId || !baseline) return { status: 'failed', code: 'preview_clip_unavailable' };
    const phase = phaseById(sampledPhaseId);
    if (!phase) return { status: 'failed', code: 'phase_required' };
    const phaseTime = phase.normalizedTime * activeSession.motionSpec.durationSeconds;
    const clip = originalClip?.clone?.() || activeSession.sessionClip.clone?.();
    if (!clip) return { status: 'failed', code: 'preview_clip_clone_failed' };
    const changed = changedBones();
    for (const boneName of changed) {
      const node = traverseByName(boneName);
      if (!node) continue;
      const quaternionTrack = clip.tracks.find(track => track.name.endsWith('.quaternion') && (track.name.startsWith(`${node.uuid}.`) || track.name.startsWith(`${node.name}.`)));
      if (quaternionTrack) {
        let nearest = 0, best = Infinity;
        for (let i = 0; i < quaternionTrack.times.length; i += 1) {
          const distance = Math.abs(Number(quaternionTrack.times[i]) - phaseTime);
          if (distance < best) { best = distance; nearest = i; }
        }
        const values = node.quaternion.toArray();
        for (let c = 0; c < 4; c += 1) quaternionTrack.values[nearest * 4 + c] = values[c];
      }
      const positionTrack = clip.tracks.find(track => track.name.endsWith('.position') && (track.name.startsWith(`${node.uuid}.`) || track.name.startsWith(`${node.name}.`)));
      if (positionTrack) {
        let nearest = 0, best = Infinity;
        for (let i = 0; i < positionTrack.times.length; i += 1) {
          const distance = Math.abs(Number(positionTrack.times[i]) - phaseTime);
          if (distance < best) { best = distance; nearest = i; }
        }
        const values = node.position.toArray();
        for (let c = 0; c < 3; c += 1) positionTrack.values[nearest * 3 + c] = values[c];
      }
    }
    clip.name = `${originalClip?.name || clip.name} [POSE EDIT PREVIEW]`;
    previewClip = clip;
    return { status: 'ready', clip, changedBones: changed };
  }

  function playAdjustedPreview() {
    const built = patchPreviewClip();
    if (built.status !== 'ready') { status(`Preview failed: ${built.code}`, 'failed'); return built; }
    activeSession.stop?.();
    activeSession.sessionClip = built.clip;
    activeSession.action = activeSession.mixer.clipAction(built.clip, activeSession.avatar);
    activeSession.setLoop?.(true);
    activeSession.play?.();
    status(`Playing adjusted preview. ${built.changedBones.length} bone transform(s) changed.`);
    return built;
  }

  function resetSelected() {
    if (!baseline) return;
    const target = TARGETS[el('poseEditorTarget')?.value];
    const names = new Set([target?.bone, ...(target?.chain || [])].filter(Boolean));
    for (const name of names) {
      const before = baseline.get(name), node = traverseByName(name);
      if (!before || !node) continue;
      node.position.copy(before.position); node.quaternion.copy(before.quaternion); node.scale.copy(before.scale);
    }
    activeSession.avatar.updateMatrixWorld?.(true);
    edits = edits.filter(edit => !(edit.phaseId === sampledPhaseId && edit.target === el('poseEditorTarget')?.value));
    status('Selected body part reset to the sampled phase pose.');
    refreshOutput();
  }

  function resetPhase() {
    restorePose(baseline);
    edits = edits.filter(edit => edit.phaseId !== sampledPhaseId);
    status(`Phase “${sampledPhaseId}” reset.`);
    refreshOutput();
  }

  function resetAll() {
    if (!activeSession) return;
    edits = [];
    sampledPhaseId = null;
    baseline = null;
    previewClip = null;
    if (originalMotionSpec) {
      const out = activeSession.loadMotionSpec?.(originalMotionSpec, root.PocketPTMotionSpecClip);
      if (out?.status === 'ready') {
        originalClip = activeSession.sessionClip?.clone?.() || activeSession.sessionClip;
        populatePhases();
      }
    } else activeSession.restoreRestPose?.();
    status('All pose-editor adjustments cleared.');
    refreshOutput();
  }

  function exportPayload() {
    const scale = bodyScale();
    return Object.freeze({
      schemaVersion: 1,
      type: 'motion_lab_pose_adjustment',
      editorVersion: VERSION,
      motionId: originalMotionSpec?.motionId || activeSession?.motionSpec?.motionId || null,
      exerciseId: originalMotionSpec?.exerciseId || activeSession?.motionSpec?.exerciseId || null,
      edits: edits.map(edit => Object.freeze({
        phaseId: edit.phaseId,
        target: edit.target,
        bone: edit.bone,
        mode: edit.mode === 'move' ? 'endpoint_or_root_translation' : 'joint_rotation_delta',
        axis: edit.axis,
        amount: edit.mode === 'move' ? Number((edit.amount / Math.max(scale, 1e-9)).toFixed(6)) : Number(edit.amount.toFixed(3)),
        unit: edit.mode === 'move' ? 'avatar_height' : 'degrees'
      }))
    });
  }

  function refreshOutput() {
    const node = el('poseEditorOutput');
    if (node) node.textContent = JSON.stringify(exportPayload(), null, 2);
    const count = el('poseEditorEditCount');
    if (count) count.textContent = String(edits.length);
  }

  async function copyAdjustment() {
    const text = JSON.stringify(exportPayload(), null, 2);
    try {
      await root.navigator?.clipboard?.writeText?.(text);
      status('Motion Spec adjustment copied.');
    } catch (_) {
      const output = el('poseEditorOutput');
      output?.focus?.();
      output?.select?.();
      status('Clipboard unavailable. Adjustment text selected for manual copy.');
    }
  }

  function updateModeHelp() {
    const target = TARGETS[el('poseEditorTarget')?.value];
    const mode = el('poseEditorMode')?.value || 'move';
    const help = el('poseEditorHelp');
    if (!help || !target) return;
    if (mode === 'move' && target.mode === 'joint') help.textContent = 'This joint uses rotation. Choose Rotate, or select a hand/foot/hips for position moves.';
    else if (mode === 'move' && target.mode === 'endpoint') help.textContent = 'Moving this endpoint uses shared two-bone IK so the intermediate joint follows naturally.';
    else help.textContent = 'Adjustments are preview-only until you copy/save the structured Motion Spec adjustment.';
  }

  function enable(enabled) {
    ['poseEditorPhase','poseEditorLoadPhase','poseEditorTarget','poseEditorMode','poseEditorAxis','poseEditorStep','poseEditorMinus','poseEditorPlus','poseEditorResetSelected','poseEditorResetPhase','poseEditorResetAll','poseEditorPlay','poseEditorCopy'].forEach(id => {
      const node = el(id); if (node) node.disabled = !enabled;
    });
  }

  function wireUi() {
    if (el('poseEditorTarget')?.dataset.poseEditorWired === '1') return;
    const targetSelect = el('poseEditorTarget');
    if (!targetSelect) return;
    targetSelect.dataset.poseEditorWired = '1';
    targetSelect.replaceChildren();
    for (const [id, target] of Object.entries(TARGETS)) {
      const option = document.createElement('option'); option.value = id; option.textContent = target.label; targetSelect.appendChild(option);
    }
    el('poseEditorLoadPhase')?.addEventListener('click', () => samplePhase(el('poseEditorPhase')?.value));
    el('poseEditorMinus')?.addEventListener('click', () => nudge(-1));
    el('poseEditorPlus')?.addEventListener('click', () => nudge(1));
    el('poseEditorResetSelected')?.addEventListener('click', resetSelected);
    el('poseEditorResetPhase')?.addEventListener('click', resetPhase);
    el('poseEditorResetAll')?.addEventListener('click', resetAll);
    el('poseEditorPlay')?.addEventListener('click', playAdjustedPreview);
    el('poseEditorCopy')?.addEventListener('click', copyAdjustment);
    targetSelect.addEventListener('change', updateModeHelp);
    el('poseEditorMode')?.addEventListener('change', updateModeHelp);
    updateModeHelp(); refreshOutput();
  }

  function attachSession(session) {
    activeSession = session;
    const originalLoadMotionSpec = session.loadMotionSpec?.bind(session);
    if (originalLoadMotionSpec && !session.__poseEditorLoadWrapped) {
      session.loadMotionSpec = function poseEditorLoadMotionSpec(spec, compiler) {
        const out = originalLoadMotionSpec(spec, compiler);
        if (out?.status === 'ready') {
          originalMotionSpec = spec;
          originalClip = session.sessionClip?.clone?.() || session.sessionClip;
          previewClip = null; sampledPhaseId = null; baseline = null; edits = [];
          populatePhases(); enable(true); refreshOutput();
          status('Motion loaded. Choose a phase to begin editing.');
        }
        return out;
      };
      session.__poseEditorLoadWrapped = true;
    }
    const originalUnloadAvatar = session.unloadAvatar?.bind(session);
    if (originalUnloadAvatar && !session.__poseEditorUnloadWrapped) {
      session.unloadAvatar = function poseEditorUnloadAvatar() {
        const out = originalUnloadAvatar();
        if (activeSession === session) { originalMotionSpec = originalClip = previewClip = baseline = null; sampledPhaseId = null; edits = []; enable(false); refreshOutput(); }
        return out;
      };
      session.__poseEditorUnloadWrapped = true;
    }
    return session;
  }

  function install(runtime = root.PocketPTDisposableMotionSession) {
    if (installed) return root.PocketPTMotionLabPoseEditor;
    if (!runtime?.createMotionSession) return null;
    const originalCreate = runtime.createMotionSession.bind(runtime);
    root.PocketPTDisposableMotionSession = Object.freeze({
      ...runtime,
      createMotionSession(options) { return attachSession(originalCreate(options)); },
      __poseEditorInstalled: true
    });
    installed = true;
    wireUi(); enable(false);
    return root.PocketPTMotionLabPoseEditor;
  }

  root.PocketPTMotionLabPoseEditor = Object.freeze({
    VERSION,
    install,
    wireUi,
    getActiveSession: () => activeSession,
    samplePhase,
    resetAll,
    exportAdjustment: exportPayload,
    playAdjustedPreview
  });
  wireUi(); enable(false);
})(window, document);
