(function initMirrorMotionPhase2(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.PocketPTMirrorMotionPhase2 = api;
    api.install();
  }
})(typeof window !== 'undefined' ? window : globalThis, function mirrorMotionPhase2Factory(globalScope) {
  'use strict';

  const CRITICAL_JOINTS = Object.freeze([
    'left_shoulder','right_shoulder','left_hip','right_hip',
    'left_knee','right_knee','left_ankle','right_ankle'
  ]);
  const CONFIDENCE_PRESENT = 0.18;
  const TRACKER_RESET_GAP_MS = 750;

  const state = {
    installed: false,
    avatarRuntimePatched: false,
    stabilizerReady: false,
    stabilizerLoadRequested: false,
    persistentFailure: 'NONE',
    rawFrames: 0,
    stabilizedFrames: 0,
    firstFailingBoundary: 'NONE',
    lastPipelineStage: 'BOOT',
    lastCriticalJointIssue: 'NONE',
    lastFrameStats: { accepted: 0, smoothed: 0, coasted: 0, clamped: 0, dropped: 0 },
    lastProcessingMs: 0,
    lastRawPoseAt: null,
    lastStabilizedPoseAt: null,
    lastPersonSeenAt: null,
    trackerResets: 0,
    rendererErrors: 0,
    rendererBound: false
  };

  let stabilizer = null;
  let panelTimer = null;

  function nowMs() {
    return globalScope.performance?.now?.() ?? Date.now();
  }

  function recordFailure(boundary, joint = null, { persistent = false } = {}) {
    if (persistent) state.persistentFailure = boundary;
    state.firstFailingBoundary = boundary;
    if (joint) state.lastCriticalJointIssue = `${boundary}:${joint}`;
    return boundary;
  }

  function clearPersistentStabilizerFailure() {
    if (/^STABILIZER_/.test(state.persistentFailure)) state.persistentFailure = 'NONE';
  }

  function pointMap(packet) {
    const map = new Map();
    for (const point of packet?.keypoints || []) {
      const name = point?.name || point?.part;
      if (name) map.set(name, point);
    }
    return map;
  }

  function deriveFirstFailure(rawPacket, stabilizedPacket, runtimeStatus = {}) {
    const raw = rawPacket?.keypoints || [];
    if (!raw.length) return 'DETECTION_NO_POSE';
    if (!raw.some(point => Number(point?.score ?? point?.confidence ?? 0) >= CONFIDENCE_PRESENT)) return 'DETECTION_LOW_CONFIDENCE';
    if (state.persistentFailure !== 'NONE') return state.persistentFailure;
    if (!stabilizedPacket) return state.stabilizerReady ? 'STABILIZATION_NO_OUTPUT' : 'STABILIZER_LOADING';

    const byName = pointMap(stabilizedPacket);
    for (const joint of CRITICAL_JOINTS) {
      const point = byName.get(joint);
      if (!point || point.stabilityState === 'dropped') return `STABILIZATION_DROPPED:${joint}`;
    }

    if (!state.rendererBound) return 'RETARGET_RENDERER_UNBOUND';
    const mode = runtimeStatus.presentationAppliedMode || runtimeStatus.presentationMode || runtimeStatus.renderMode;
    if ((mode === 'avatar_overlay' || mode === 'avatar_only') && runtimeStatus.renderLoopState === 'STOPPED') return 'AVATAR_RENDER_LOOP_STOPPED';
    return 'NONE';
  }

  function updateRuntimeDiagnostics(extra = {}) {
    const runtime = globalScope.AvatarRuntime?.getStatus?.() || globalScope.__avatarRuntimeStatus || {};
    Object.assign(runtime, {
      mirrorMotionPhase: 2,
      mirrorMotionInstalled: state.installed,
      mirrorMotionStabilizerReady: state.stabilizerReady,
      mirrorMotionRawFrames: state.rawFrames,
      mirrorMotionStabilizedFrames: state.stabilizedFrames,
      mirrorMotionFirstFailingBoundary: state.firstFailingBoundary,
      mirrorMotionPersistentFailure: state.persistentFailure,
      mirrorMotionLastPipelineStage: state.lastPipelineStage,
      mirrorMotionLastCriticalJointIssue: state.lastCriticalJointIssue,
      mirrorMotionFrameStats: { ...state.lastFrameStats },
      mirrorMotionProcessingMs: state.lastProcessingMs,
      mirrorMotionTrackerResets: state.trackerResets,
      mirrorMotionRendererErrors: state.rendererErrors,
      ...extra
    });
    globalScope.__mirrorMotionDiagnostics = { ...state, runtime: { ...extra } };
  }

  function ensureStabilizer() {
    if (stabilizer) return Promise.resolve(stabilizer);
    if (globalScope.PocketPTPoseStability?.createPoseStabilizer) {
      stabilizer = globalScope.PocketPTPoseStability.createPoseStabilizer();
      state.stabilizerReady = true;
      clearPersistentStabilizerFailure();
      state.lastPipelineStage = 'STABILIZER_READY';
      updateRuntimeDiagnostics();
      return Promise.resolve(stabilizer);
    }
    if (state.stabilizerLoadRequested) return Promise.resolve(null);
    state.stabilizerLoadRequested = true;
    state.lastPipelineStage = 'STABILIZER_LOADING';
    state.firstFailingBoundary = 'STABILIZER_LOADING';
    const loader = globalScope.__loadExternalScript;
    if (typeof loader !== 'function') {
      recordFailure('STABILIZER_LOADER_UNAVAILABLE', null, { persistent: true });
      updateRuntimeDiagnostics();
      return Promise.resolve(null);
    }
    return loader('/pose-stability-engine.js?v=20260904-phase2', { async: false, defer: false })
      .then(() => {
        if (!globalScope.PocketPTPoseStability?.createPoseStabilizer) {
          recordFailure('STABILIZER_EXPORT_MISSING', null, { persistent: true });
          updateRuntimeDiagnostics();
          return null;
        }
        stabilizer = globalScope.PocketPTPoseStability.createPoseStabilizer();
        state.stabilizerReady = true;
        clearPersistentStabilizerFailure();
        state.firstFailingBoundary = 'NONE';
        state.lastPipelineStage = 'STABILIZER_READY';
        updateRuntimeDiagnostics();
        return stabilizer;
      })
      .catch((error) => {
        recordFailure('STABILIZER_LOAD_FAILED', null, { persistent: true });
        updateRuntimeDiagnostics({ mirrorMotionLastError: String(error?.message || error) });
        return null;
      });
  }

  function resetTrackerHistory(reason) {
    if (!stabilizer?.reset) return false;
    stabilizer.reset();
    state.trackerResets += 1;
    state.lastFrameStats = { accepted: 0, smoothed: 0, coasted: 0, clamped: 0, dropped: 0 };
    state.lastStabilizedPoseAt = null;
    state.lastCriticalJointIssue = 'NONE';
    state.lastPipelineStage = `TRACKER_RESET:${reason}`;
    return true;
  }

  function processForAvatar(rawPacket) {
    const wallNow = Date.now();
    const priorRawAt = state.lastRawPoseAt;
    state.rawFrames += 1;
    state.lastRawPoseAt = wallNow;
    state.lastPipelineStage = 'RAW_POSE_RECEIVED';
    state.firstFailingBoundary = 'NONE';
    state.lastCriticalJointIssue = 'NONE';
    const startedAt = nowMs();

    if (stabilizer && priorRawAt != null && wallNow - priorRawAt > TRACKER_RESET_GAP_MS) {
      resetTrackerHistory('FRAME_GAP');
    }

    const rawPoints = rawPacket?.keypoints || [];
    const personPresent = rawPoints.some(point => Number(point?.score ?? point?.confidence ?? 0) >= CONFIDENCE_PRESENT);
    if (personPresent) {
      if (stabilizer && state.lastPersonSeenAt != null && wallNow - state.lastPersonSeenAt > TRACKER_RESET_GAP_MS) {
        resetTrackerHistory('PERSON_REACQUIRED');
      }
      state.lastPersonSeenAt = wallNow;
    } else if (stabilizer && state.lastPersonSeenAt != null && wallNow - state.lastPersonSeenAt > TRACKER_RESET_GAP_MS) {
      resetTrackerHistory('PERSON_LOST');
      state.lastPersonSeenAt = null;
    }

    if (!stabilizer) {
      ensureStabilizer();
      const failure = deriveFirstFailure(rawPacket, null, globalScope.__avatarRuntimeStatus || {});
      if (failure !== 'NONE') recordFailure(failure);
      state.lastProcessingMs = nowMs() - startedAt;
      updateRuntimeDiagnostics();
      return rawPacket;
    }

    let stabilizedPacket;
    try {
      stabilizedPacket = stabilizer.process(rawPacket, rawPacket?.timestampMs ?? rawPacket?.timestamp);
    } catch (error) {
      recordFailure('STABILIZER_PROCESS_ERROR');
      state.lastProcessingMs = nowMs() - startedAt;
      updateRuntimeDiagnostics({ mirrorMotionLastError: String(error?.message || error) });
      return rawPacket;
    }

    state.stabilizedFrames += 1;
    state.lastStabilizedPoseAt = wallNow;
    state.lastFrameStats = { ...state.lastFrameStats, ...(stabilizedPacket?.stability?.frameStats || {}) };
    state.lastPipelineStage = 'STABILIZED_POSE_READY';
    state.lastProcessingMs = nowMs() - startedAt;

    const runtime = globalScope.AvatarRuntime?.getStatus?.() || globalScope.__avatarRuntimeStatus || {};
    const failure = deriveFirstFailure(rawPacket, stabilizedPacket, runtime);
    if (failure !== 'NONE') {
      const [boundary, joint] = failure.split(':');
      recordFailure(boundary, joint || null);
    }
    updateRuntimeDiagnostics();
    return stabilizedPacket;
  }

  function wrapRenderer(renderer) {
    state.rendererBound = typeof renderer === 'function';
    updateRuntimeDiagnostics();
    if (typeof renderer !== 'function') return renderer;
    return function stabilizedAvatarRenderer(rawPacket) {
      const packet = processForAvatar(rawPacket);
      state.lastPipelineStage = 'RETARGET_DISPATCH';
      try {
        const result = renderer(packet);
        state.lastPipelineStage = 'RETARGET_DISPATCHED';
        updateRuntimeDiagnostics();
        return result;
      } catch (error) {
        state.rendererErrors += 1;
        recordFailure('RETARGET_RENDERER_ERROR');
        state.lastPipelineStage = 'RETARGET_RENDERER_ERROR';
        updateRuntimeDiagnostics({ mirrorMotionLastError: String(error?.message || error) });
        throw error;
      }
    };
  }

  function patchAvatarRuntime(runtime) {
    if (!runtime || runtime.__mirrorMotionPhase2Patched) return runtime;
    const originalBind = runtime.bindPoseFrameRenderer;
    if (typeof originalBind !== 'function') {
      recordFailure('AVATAR_BIND_API_MISSING', null, { persistent: true });
      updateRuntimeDiagnostics();
      return runtime;
    }
    runtime.bindPoseFrameRenderer = function bindStabilizedPoseFrameRenderer(renderer) {
      return originalBind.call(runtime, wrapRenderer(renderer));
    };
    if (typeof runtime.registerPoseRenderer === 'function') {
      runtime.registerPoseRenderer = function registerStabilizedPoseRenderer(renderer) {
        return originalBind.call(runtime, wrapRenderer(renderer));
      };
    }
    Object.defineProperty(runtime, '__mirrorMotionPhase2Patched', { value: true, enumerable: false });
    state.avatarRuntimePatched = true;
    if (state.persistentFailure === 'AVATAR_BIND_API_MISSING') state.persistentFailure = 'NONE';
    state.lastPipelineStage = 'AVATAR_RUNTIME_PATCHED';
    updateRuntimeDiagnostics();
    return runtime;
  }

  function interceptAvatarRuntimeAssignment() {
    if (globalScope.AvatarRuntime) {
      patchAvatarRuntime(globalScope.AvatarRuntime);
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(globalScope, 'AvatarRuntime');
    if (descriptor && descriptor.configurable === false) {
      recordFailure('AVATAR_RUNTIME_INTERCEPT_BLOCKED', null, { persistent: true });
      updateRuntimeDiagnostics();
      return;
    }
    let value;
    Object.defineProperty(globalScope, 'AvatarRuntime', {
      configurable: true,
      enumerable: true,
      get() { return value; },
      set(next) {
        value = patchAvatarRuntime(next);
      }
    });
  }

  function diagnosticsText() {
    const runtime = globalScope.AvatarRuntime?.getStatus?.() || globalScope.__avatarRuntimeStatus || {};
    const age = state.lastStabilizedPoseAt == null ? 'n/a' : `${Math.max(0, Date.now() - state.lastStabilizedPoseAt)}ms`;
    const fs = state.lastFrameStats;
    return [
      'MIRROR MOTION INTELLIGENCE — PHASE 2',
      `First failing boundary: ${state.firstFailingBoundary}`,
      `Persistent failure: ${state.persistentFailure}`,
      `Pipeline stage: ${state.lastPipelineStage}`,
      `Stabilizer: ${state.stabilizerReady ? 'READY' : 'LOADING/UNAVAILABLE'}`,
      `Avatar runtime patched: ${state.avatarRuntimePatched ? 'YES' : 'NO'}`,
      `Renderer bound: ${state.rendererBound ? 'YES' : 'NO'}`,
      `Raw / stabilized frames: ${state.rawFrames} / ${state.stabilizedFrames}`,
      `Frame accepted/smoothed/coasted/clamped/dropped: ${fs.accepted}/${fs.smoothed}/${fs.coasted}/${fs.clamped}/${fs.dropped}`,
      `Critical joint issue: ${state.lastCriticalJointIssue}`,
      `Stabilizer processing: ${state.lastProcessingMs.toFixed(2)}ms`,
      `Stabilized pose age: ${age}`,
      `Tracker resets: ${state.trackerResets}`,
      `Retarget frames: ${runtime.retargetFramesExecuted || 0}`,
      `Bones changed: ${runtime.bonesChangedLastFrame || 0}`,
      `Render loop: ${runtime.renderLoopState || 'UNKNOWN'}`,
      `Renderer errors: ${state.rendererErrors}`
    ].join('\n');
  }

  function ensureDebugPanel() {
    const doc = globalScope.document;
    if (!doc?.body) return null;
    let panel = doc.getElementById('mirrorMotionPhase2Debug');
    if (!panel) {
      panel = doc.createElement('details');
      panel.id = 'mirrorMotionPhase2Debug';
      panel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:5000;max-width:min(92vw,520px);max-height:45vh;overflow:auto;background:rgba(2,6,23,.94);color:#e5e7eb;border:1px solid #facc15;border-radius:10px;padding:8px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;';
      const summary = doc.createElement('summary');
      summary.textContent = 'Mirror Motion Debug';
      summary.style.cssText = 'cursor:pointer;color:#fde68a;font-weight:700;';
      const pre = doc.createElement('pre');
      pre.dataset.mirrorMotionDiagnostics = 'true';
      pre.style.cssText = 'white-space:pre-wrap;margin:8px 0 0;';
      panel.append(summary, pre);
      doc.body.appendChild(panel);
    }
    return panel;
  }

  function refreshDebugPanel() {
    const panel = ensureDebugPanel();
    const pre = panel?.querySelector?.('[data-mirror-motion-diagnostics]');
    if (pre) pre.textContent = diagnosticsText();
  }

  function install() {
    if (state.installed) return api;
    state.installed = true;
    state.lastPipelineStage = 'INSTALLING';
    interceptAvatarRuntimeAssignment();
    ensureStabilizer();
    const mountPanel = () => {
      ensureDebugPanel();
      refreshDebugPanel();
      if (!panelTimer && globalScope.setInterval) panelTimer = globalScope.setInterval(refreshDebugPanel, 500);
    };
    if (globalScope.document?.readyState === 'loading') globalScope.document.addEventListener('DOMContentLoaded', mountPanel, { once: true });
    else mountPanel();
    state.lastPipelineStage = 'INSTALLED';
    updateRuntimeDiagnostics();
    return api;
  }

  function reset() {
    stabilizer?.reset?.();
    if (stabilizer) state.trackerResets += 1;
    state.rawFrames = 0;
    state.stabilizedFrames = 0;
    state.firstFailingBoundary = state.persistentFailure;
    state.lastPipelineStage = 'RESET';
    state.lastCriticalJointIssue = 'NONE';
    state.lastFrameStats = { accepted: 0, smoothed: 0, coasted: 0, clamped: 0, dropped: 0 };
    state.lastProcessingMs = 0;
    state.lastRawPoseAt = null;
    state.lastStabilizedPoseAt = null;
    state.lastPersonSeenAt = null;
    state.rendererErrors = 0;
    updateRuntimeDiagnostics();
  }

  const api = Object.freeze({
    install,
    reset,
    wrapRenderer,
    processForAvatar,
    deriveFirstFailure,
    patchAvatarRuntime,
    diagnostics: () => ({ ...state, lastFrameStats: { ...state.lastFrameStats } }),
    diagnosticsText
  });
  return api;
});
