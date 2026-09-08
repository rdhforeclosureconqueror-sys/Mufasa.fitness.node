(function installAdjustedPreviewPersistence(root) {
  'use strict';

  const VERSION = '1.0.1-adjusted-preview-persistence-truth';
  const EPSILON = 1e-7;
  const PROPAGATION_SCOPE = 'all_track_samples';
  const PROPAGATION_STRATEGY = 'constant_local_delta_from_edited_phase';
  let lastSnapshot = Object.freeze({
    status: 'idle',
    version: VERSION,
    changedTracks: 0,
    changedSamples: 0,
    lastClip: null,
    propagationScope: PROPAGATION_SCOPE,
    propagationStrategy: PROPAGATION_STRATEGY,
    firstFailingBoundary: null,
    lastWriter: null
  });

  function publish(patch) {
    lastSnapshot = Object.freeze({ ...lastSnapshot, ...patch });
  }

  function copyTimesEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (Math.abs(Number(a[i]) - Number(b[i])) > EPSILON) return false;
    }
    return true;
  }

  function changedSampleIndex(baseTrack, previewTrack, stride) {
    if (!baseTrack?.values || !previewTrack?.values || baseTrack.values.length !== previewTrack.values.length) return -1;
    const samples = Math.floor(baseTrack.values.length / stride);
    for (let sample = 0; sample < samples; sample += 1) {
      for (let component = 0; component < stride; component += 1) {
        const index = sample * stride + component;
        if (Math.abs(Number(baseTrack.values[index]) - Number(previewTrack.values[index])) > EPSILON) return sample;
      }
    }
    return -1;
  }

  function normalizeQuaternion(values) {
    const length = Math.hypot(values[0], values[1], values[2], values[3]) || 1;
    return values.map(value => value / length);
  }

  function multiplyQuaternion(a, b) {
    return normalizeQuaternion([
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    ]);
  }

  function inverseQuaternion(q) {
    const norm = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] || 1;
    return [-q[0] / norm, -q[1] / norm, -q[2] / norm, q[3] / norm];
  }

  function quaternionAt(track, sample) {
    const offset = sample * 4;
    return normalizeQuaternion([
      Number(track.values[offset]), Number(track.values[offset + 1]),
      Number(track.values[offset + 2]), Number(track.values[offset + 3])
    ]);
  }

  function positionAt(track, sample) {
    const offset = sample * 3;
    return [Number(track.values[offset]), Number(track.values[offset + 1]), Number(track.values[offset + 2])];
  }

  function persistQuaternionTrack(baseTrack, previewTrack) {
    if (!copyTimesEqual(baseTrack.times, previewTrack.times)) return 0;
    const changedIndex = changedSampleIndex(baseTrack, previewTrack, 4);
    if (changedIndex < 0) return 0;
    const baseAtEdit = quaternionAt(baseTrack, changedIndex);
    const previewAtEdit = quaternionAt(previewTrack, changedIndex);
    const delta = multiplyQuaternion(inverseQuaternion(baseAtEdit), previewAtEdit);
    const samples = Math.floor(baseTrack.values.length / 4);
    for (let sample = 0; sample < samples; sample += 1) {
      const corrected = multiplyQuaternion(quaternionAt(baseTrack, sample), delta);
      const offset = sample * 4;
      for (let component = 0; component < 4; component += 1) previewTrack.values[offset + component] = corrected[component];
    }
    return samples;
  }

  function persistPositionTrack(baseTrack, previewTrack) {
    if (!copyTimesEqual(baseTrack.times, previewTrack.times)) return 0;
    const changedIndex = changedSampleIndex(baseTrack, previewTrack, 3);
    if (changedIndex < 0) return 0;
    const baseAtEdit = positionAt(baseTrack, changedIndex);
    const previewAtEdit = positionAt(previewTrack, changedIndex);
    const delta = previewAtEdit.map((value, index) => value - baseAtEdit[index]);
    const samples = Math.floor(baseTrack.values.length / 3);
    for (let sample = 0; sample < samples; sample += 1) {
      const base = positionAt(baseTrack, sample);
      const offset = sample * 3;
      for (let component = 0; component < 3; component += 1) previewTrack.values[offset + component] = base[component] + delta[component];
    }
    return samples;
  }

  function composePersistentPreview(canonicalClip, previewClip) {
    if (!canonicalClip?.tracks || !previewClip?.tracks) {
      publish({ status: 'failed', firstFailingBoundary: 'preview_tracks_available', lastWriter: null });
      return { status: 'failed', code: 'preview_tracks_unavailable' };
    }
    const canonicalByName = new Map(canonicalClip.tracks.map(track => [track.name, track]));
    let changedTracks = 0;
    let changedSamples = 0;
    for (const previewTrack of previewClip.tracks) {
      const baseTrack = canonicalByName.get(previewTrack.name);
      if (!baseTrack) continue;
      let samples = 0;
      if (previewTrack.name.endsWith('.quaternion')) samples = persistQuaternionTrack(baseTrack, previewTrack);
      else if (previewTrack.name.endsWith('.position')) samples = persistPositionTrack(baseTrack, previewTrack);
      if (samples > 0) {
        changedTracks += 1;
        changedSamples += samples;
      }
    }
    publish({
      status: 'ready',
      changedTracks,
      changedSamples,
      lastClip: previewClip.name || null,
      propagationScope: PROPAGATION_SCOPE,
      propagationStrategy: PROPAGATION_STRATEGY,
      firstFailingBoundary: null,
      lastWriter: 'adjusted_preview_persistence'
    });
    return { status: 'ready', changedTracks, changedSamples, propagationScope: PROPAGATION_SCOPE, propagationStrategy: PROPAGATION_STRATEGY };
  }

  function installEditorExportContract() {
    const editor = root.PocketPTMotionLabPoseEditor;
    if (!editor?.exportAdjustment) return false;
    if (editor.__adjustedPreviewPersistenceExportContract === true) return true;
    const originalExportAdjustment = editor.exportAdjustment.bind(editor);
    root.PocketPTMotionLabPoseEditor = Object.freeze({
      ...editor,
      exportAdjustment() {
        const payload = originalExportAdjustment() || {};
        const edits = Array.isArray(payload.edits) ? payload.edits : [];
        const sourcePhaseIds = Object.freeze([...new Set(edits.map(edit => edit?.phaseId).filter(Boolean))]);
        return Object.freeze({
          ...payload,
          previewPersistence: Object.freeze({
            enabled: edits.length > 0,
            scope: PROPAGATION_SCOPE,
            strategy: PROPAGATION_STRATEGY,
            sourcePhaseIds,
            canonicalMotionSpecUnchanged: true
          })
        });
      },
      __adjustedPreviewPersistenceExportContract: true
    });
    return true;
  }

  function patchSession(session) {
    if (!session || session.__adjustedPreviewPersistenceInstalled) return session;
    const state = { canonicalClip: null, mixerPatched: false };

    function patchMixer() {
      if (state.mixerPatched || !session.mixer?.clipAction) return;
      const originalClipAction = session.mixer.clipAction.bind(session.mixer);
      session.mixer.clipAction = function persistentClipAction(clip, optionalRoot, blendMode) {
        if (clip?.name?.includes?.('[POSE EDIT PREVIEW]') && state.canonicalClip) {
          composePersistentPreview(state.canonicalClip, clip);
        }
        return originalClipAction(clip, optionalRoot, blendMode);
      };
      state.mixerPatched = true;
    }

    const originalStart = session.start?.bind(session);
    if (originalStart) {
      session.start = async function persistentStart(container) {
        const out = await originalStart(container);
        patchMixer();
        return out;
      };
    }

    const originalLoadMotionSpec = session.loadMotionSpec?.bind(session);
    if (originalLoadMotionSpec) {
      session.loadMotionSpec = function persistentLoadMotionSpec(spec, compiler) {
        const out = originalLoadMotionSpec(spec, compiler);
        patchMixer();
        if (out?.status === 'ready') {
          state.canonicalClip = session.sessionClip?.clone?.() || session.sessionClip || null;
          publish({ status: 'armed', changedTracks: 0, changedSamples: 0, lastClip: state.canonicalClip?.name || null, firstFailingBoundary: null, lastWriter: 'canonical_clip_capture' });
        }
        return out;
      };
    }

    session.__adjustedPreviewPersistenceInstalled = true;
    return session;
  }

  function install(runtime = root.PocketPTDisposableMotionSession) {
    if (!runtime?.createMotionSession) {
      publish({ status: 'failed', firstFailingBoundary: 'runtime_available', lastWriter: null });
      return null;
    }
    if (!installEditorExportContract()) {
      publish({ status: 'failed', firstFailingBoundary: 'editor_export_contract_available', lastWriter: null });
      return null;
    }
    if (runtime.__adjustedPreviewPersistenceInstalled) return runtime;
    const originalCreate = runtime.createMotionSession.bind(runtime);
    const wrapped = Object.freeze({
      ...runtime,
      createMotionSession(options) { return patchSession(originalCreate(options)); },
      __adjustedPreviewPersistenceInstalled: true
    });
    publish({ status: 'installed', firstFailingBoundary: null, lastWriter: 'runtime_wrapper' });
    return wrapped;
  }

  root.PocketPTMotionLabAdjustedPreviewPersistence = Object.freeze({
    VERSION,
    PROPAGATION_SCOPE,
    PROPAGATION_STRATEGY,
    install,
    installEditorExportContract,
    composePersistentPreview,
    snapshot: () => lastSnapshot
  });
})(window);