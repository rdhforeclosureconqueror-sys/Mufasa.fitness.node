(function initMirrorMotionPhase3(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.PocketPTMirrorMotionPhase3 = api;
    api.install();
  }
})(typeof window !== 'undefined' ? window : globalThis, function mirrorMotionPhase3Factory(globalScope) {
  'use strict';

  const DEFAULTS = Object.freeze({
    calibrationConfidence: 0.72,
    minCalibrationSamples: 6,
    calibrationAlpha: 0.18,
    calibrationUpdateToleranceRatio: 0.18,
    lengthToleranceRatio: 0.22,
    identityConfidence: 0.55,
    identitySwapMarginRatio: 0.18,
    identityMinimumTravelRatio: 0.35
  });

  const SEGMENTS = Object.freeze([
    ['left_upper_arm','left_shoulder','left_elbow'],
    ['right_upper_arm','right_shoulder','right_elbow'],
    ['left_forearm','left_elbow','left_wrist'],
    ['right_forearm','right_elbow','right_wrist'],
    ['left_thigh','left_hip','left_knee'],
    ['right_thigh','right_hip','right_knee'],
    ['left_shin','left_knee','left_ankle'],
    ['right_shin','right_knee','right_ankle']
  ]);

  const IDENTITY_PAIRS = Object.freeze([
    ['shoulder','left_shoulder','right_shoulder'],
    ['elbow','left_elbow','right_elbow'],
    ['wrist','left_wrist','right_wrist'],
    ['hip','left_hip','right_hip'],
    ['knee','left_knee','right_knee'],
    ['ankle','left_ankle','right_ankle']
  ]);

  const finite = value => Number.isFinite(Number(value));
  const confidence = p => Number(p?.confidence ?? p?.score ?? 0) || 0;
  const dist = (a, b) => (a && b && finite(a.x) && finite(a.y) && finite(b.x) && finite(b.y))
    ? Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y))
    : NaN;
  const median = values => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return NaN;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  function createStructuralEngine(options = {}) {
    const config = { ...DEFAULTS, ...options };
    const segments = new Map();
    const previous = new Map();
    let frames = 0;
    let corrections = 0;
    let identitySwaps = 0;
    let calibrationRejects = 0;
    let lastIssue = 'NONE';

    function usableForCalibration(point) {
      return point && finite(point.x) && finite(point.y)
        && confidence(point) >= config.calibrationConfidence
        && !['dropped','coasted'].includes(point.stabilityState);
    }

    function usableForIdentity(point) {
      return point && finite(point.x) && finite(point.y)
        && confidence(point) >= config.identityConfidence
        && !['dropped','coasted'].includes(point.stabilityState);
    }

    function reset() {
      segments.clear();
      previous.clear();
      frames = 0;
      corrections = 0;
      identitySwaps = 0;
      calibrationRejects = 0;
      lastIssue = 'NONE';
    }

    function pointMap(points) {
      const map = new Map();
      for (const point of points || []) {
        const name = point?.name || point?.part;
        if (name) map.set(name, point);
      }
      return map;
    }

    function bodyScale(map) {
      const shoulder = dist(map.get('left_shoulder'), map.get('right_shoulder'));
      const hip = dist(map.get('left_hip'), map.get('right_hip'));
      const candidates = [shoulder, hip].filter(Number.isFinite).filter(value => value > 1);
      return candidates.length ? candidates.reduce((sum, value) => sum + value, 0) / candidates.length : NaN;
    }

    function maybeRecoverIdentity(map, scale, frameStats) {
      if (!Number.isFinite(scale) || scale <= 1) return;
      for (const [label, leftName, rightName] of IDENTITY_PAIRS) {
        const left = map.get(leftName); const right = map.get(rightName);
        const prevLeft = previous.get(leftName); const prevRight = previous.get(rightName);
        if (!left || !right || !prevLeft || !prevRight) continue;
        if (!usableForIdentity(left) || !usableForIdentity(right)) continue;
        const sameCost = dist(left, prevLeft) + dist(right, prevRight);
        const swapCost = dist(left, prevRight) + dist(right, prevLeft);
        if (!Number.isFinite(sameCost) || !Number.isFinite(swapCost)) continue;
        const traveledEnough = sameCost > scale * config.identityMinimumTravelRatio;
        const clearlySwapped = swapCost + scale * config.identitySwapMarginRatio < sameCost;
        if (!traveledEnough || !clearlySwapped) continue;

        const leftSnapshot = {
          x: left.x, y: left.y, score: left.score, confidence: left.confidence,
          stabilityState: left.stabilityState, rawConfidence: left.rawConfidence
        };
        left.x = right.x; left.y = right.y; left.score = right.score; left.confidence = right.confidence;
        left.stabilityState = right.stabilityState; left.rawConfidence = right.rawConfidence;
        right.x = leftSnapshot.x; right.y = leftSnapshot.y; right.score = leftSnapshot.score; right.confidence = leftSnapshot.confidence;
        right.stabilityState = leftSnapshot.stabilityState; right.rawConfidence = leftSnapshot.rawConfidence;
        left.structuralIdentityState = `recovered_from_${rightName}`;
        right.structuralIdentityState = `recovered_from_${leftName}`;
        frameStats.identitySwaps += 1;
        identitySwaps += 1;
        lastIssue = `IDENTITY_RECOVERED:${label}`;
      }
    }

    function updateCalibration(name, length, frameStats) {
      if (!Number.isFinite(length) || length <= 1) return false;
      const current = segments.get(name) || { length, samples: 0, rejected: 0, seed: [] };

      if (current.samples < config.minCalibrationSamples) {
        current.seed.push(length);
        current.samples += 1;
        current.length = median(current.seed);
        if (current.samples >= config.minCalibrationSamples) current.seed = [];
        segments.set(name, current);
        return true;
      }

      const errorRatio = Math.abs(length - current.length) / Math.max(current.length, 1);
      if (errorRatio > config.calibrationUpdateToleranceRatio) {
        current.rejected += 1;
        calibrationRejects += 1;
        frameStats.calibrationRejected += 1;
        lastIssue = `CALIBRATION_OUTLIER_REJECTED:${name}`;
        segments.set(name, current);
        return false;
      }

      current.length = current.length + (length - current.length) * config.calibrationAlpha;
      current.samples += 1;
      segments.set(name, current);
      return true;
    }

    function constrainSegment(name, proximal, distal, frameStats) {
      const model = segments.get(name);
      if (!model || model.samples < config.minCalibrationSamples) return;
      const observed = dist(proximal, distal);
      if (!Number.isFinite(observed) || observed <= 0) return;
      const errorRatio = Math.abs(observed - model.length) / Math.max(model.length, 1);
      if (errorRatio <= config.lengthToleranceRatio) return;

      const dx = Number(distal.x) - Number(proximal.x);
      const dy = Number(distal.y) - Number(proximal.y);
      const ratio = model.length / observed;
      distal.structuralRawX = distal.x;
      distal.structuralRawY = distal.y;
      distal.x = Number(proximal.x) + dx * ratio;
      distal.y = Number(proximal.y) + dy * ratio;
      distal.structuralState = 'length_constrained';
      distal.structuralSegment = name;
      distal.structuralObservedLength = observed;
      distal.structuralTargetLength = model.length;
      distal.structuralErrorRatio = errorRatio;
      frameStats.lengthCorrections += 1;
      corrections += 1;
      lastIssue = `LENGTH_CONSTRAINED:${name}`;
    }

    function serializeSegments() {
      return Object.fromEntries([...segments.entries()].map(([name, value]) => [name, {
        length: value.length,
        samples: value.samples,
        rejected: value.rejected || 0
      }]));
    }

    function process(packet) {
      frames += 1;
      const points = (packet?.keypoints || []).map(point => ({ ...point }));
      const map = pointMap(points);
      const frameStats = { calibratedSegments: 0, lengthCorrections: 0, identitySwaps: 0, calibrationRejected: 0 };
      const scale = bodyScale(map);

      maybeRecoverIdentity(map, scale, frameStats);

      for (const [name, aName, bName] of SEGMENTS) {
        const a = map.get(aName); const b = map.get(bName);
        if (usableForCalibration(a) && usableForCalibration(b)) updateCalibration(name, dist(a, b), frameStats);
      }

      for (const [name, aName, bName] of SEGMENTS) {
        const a = map.get(aName); const b = map.get(bName);
        if (!a || !b || !finite(a.x) || !finite(a.y) || !finite(b.x) || !finite(b.y)) continue;
        constrainSegment(name, a, b, frameStats);
      }

      for (const [name, point] of map) {
        if (usableForIdentity(point)) previous.set(name, { x: Number(point.x), y: Number(point.y) });
      }

      frameStats.calibratedSegments = [...segments.values()].filter(item => item.samples >= config.minCalibrationSamples).length;
      return {
        ...packet,
        keypoints: points,
        structural: {
          version: 2,
          frame: frames,
          bodyScalePx: Number.isFinite(scale) ? scale : null,
          frameStats,
          lastIssue,
          segmentModel: serializeSegments()
        }
      };
    }

    function diagnostics() {
      return {
        frames,
        calibratedSegments: [...segments.values()].filter(item => item.samples >= config.minCalibrationSamples).length,
        corrections,
        identitySwaps,
        calibrationRejects,
        lastIssue,
        segmentModel: serializeSegments()
      };
    }

    return Object.freeze({ process, reset, diagnostics, config: Object.freeze({ ...config }) });
  }

  const engine = createStructuralEngine();
  const state = {
    installed: false,
    avatarRuntimePatched: false,
    rendererBound: false,
    processErrors: 0,
    structuralResets: 0,
    lastStructuralResetReason: 'NONE',
    observedPhase2TrackerResets: null,
    firstFailingBoundary: 'NONE',
    lastPipelineStage: 'BOOT'
  };
  let panelTimer = null;

  function upstreamTrackerResetCount() {
    const phase2 = globalScope.PocketPTMirrorMotionPhase2?.diagnostics?.();
    const direct = Number(phase2?.trackerResets);
    if (Number.isFinite(direct)) return direct;
    const fallback = Number(globalScope.__mirrorMotionDiagnostics?.trackerResets);
    return Number.isFinite(fallback) ? fallback : null;
  }

  function syncUpstreamReset() {
    const count = upstreamTrackerResetCount();
    if (count == null) return false;
    if (state.observedPhase2TrackerResets == null) {
      state.observedPhase2TrackerResets = count;
      return false;
    }
    if (count === state.observedPhase2TrackerResets) return false;

    state.observedPhase2TrackerResets = count;
    engine.reset();
    state.structuralResets += 1;
    state.lastStructuralResetReason = 'PHASE2_TRACKER_RESET';
    state.lastPipelineStage = 'STRUCTURAL_RESET';
    return true;
  }

  function updateRuntimeDiagnostics(extra = {}) {
    const runtime = globalScope.AvatarRuntime?.getStatus?.() || globalScope.__avatarRuntimeStatus || (globalScope.__avatarRuntimeStatus = {});
    const diag = engine.diagnostics();
    Object.assign(runtime, {
      mirrorMotionPhase: 3,
      mirrorMotionPhase3Installed: state.installed,
      mirrorMotionStructuralPatched: state.avatarRuntimePatched,
      mirrorMotionStructuralFrames: diag.frames,
      mirrorMotionCalibratedSegments: diag.calibratedSegments,
      mirrorMotionLengthCorrections: diag.corrections,
      mirrorMotionIdentityRecoveries: diag.identitySwaps,
      mirrorMotionCalibrationRejects: diag.calibrationRejects,
      mirrorMotionStructuralResets: state.structuralResets,
      mirrorMotionStructuralResetReason: state.lastStructuralResetReason,
      mirrorMotionStructuralLastIssue: diag.lastIssue,
      mirrorMotionStructuralFirstFailingBoundary: state.firstFailingBoundary,
      mirrorMotionStructuralProcessErrors: state.processErrors,
      ...extra
    });
    globalScope.__mirrorMotionPhase3Diagnostics = { ...state, ...diag };
  }

  function wrapRenderer(renderer) {
    state.rendererBound = typeof renderer === 'function';
    updateRuntimeDiagnostics();
    if (typeof renderer !== 'function') return renderer;
    return function structurallyConstrainedRenderer(stabilizedPacket) {
      state.lastPipelineStage = 'STRUCTURAL_PROCESS';
      try {
        syncUpstreamReset();
        const constrained = engine.process(stabilizedPacket);
        state.firstFailingBoundary = 'NONE';
        state.lastPipelineStage = 'STRUCTURAL_READY';
        updateRuntimeDiagnostics();
        return renderer(constrained);
      } catch (error) {
        state.processErrors += 1;
        state.firstFailingBoundary = 'STRUCTURAL_PROCESS_ERROR';
        state.lastPipelineStage = 'STRUCTURAL_PROCESS_ERROR';
        updateRuntimeDiagnostics({ mirrorMotionStructuralLastError: String(error?.message || error) });
        return renderer(stabilizedPacket);
      }
    };
  }

  function patchAvatarRuntime(runtime) {
    if (!runtime || runtime.__mirrorMotionPhase3Patched) return runtime;
    const originalBind = runtime.bindPoseFrameRenderer;
    if (typeof originalBind !== 'function') {
      state.firstFailingBoundary = 'PHASE3_AVATAR_BIND_API_MISSING';
      updateRuntimeDiagnostics();
      return runtime;
    }
    runtime.bindPoseFrameRenderer = function bindStructuralPoseFrameRenderer(renderer) {
      return originalBind.call(runtime, wrapRenderer(renderer));
    };
    if (typeof runtime.registerPoseRenderer === 'function') {
      runtime.registerPoseRenderer = function registerStructuralPoseRenderer(renderer) {
        return originalBind.call(runtime, wrapRenderer(renderer));
      };
    }
    Object.defineProperty(runtime, '__mirrorMotionPhase3Patched', { value: true, enumerable: false });
    state.avatarRuntimePatched = true;
    state.firstFailingBoundary = 'NONE';
    state.lastPipelineStage = 'AVATAR_RUNTIME_PATCHED';
    updateRuntimeDiagnostics();
    return runtime;
  }

  function interceptAvatarRuntimeAssignment() {
    if (globalScope.AvatarRuntime) {
      patchAvatarRuntime(globalScope.AvatarRuntime);
      return;
    }
    const prior = Object.getOwnPropertyDescriptor(globalScope, 'AvatarRuntime');
    if (prior && prior.configurable === false) {
      state.firstFailingBoundary = 'PHASE3_AVATAR_RUNTIME_INTERCEPT_BLOCKED';
      updateRuntimeDiagnostics();
      return;
    }
    let fallbackValue = prior?.value;
    Object.defineProperty(globalScope, 'AvatarRuntime', {
      configurable: true,
      enumerable: prior?.enumerable !== false,
      get() {
        return prior?.get ? prior.get.call(globalScope) : fallbackValue;
      },
      set(next) {
        if (prior?.set) prior.set.call(globalScope, next);
        else fallbackValue = next;
        const resolved = prior?.get ? prior.get.call(globalScope) : fallbackValue;
        patchAvatarRuntime(resolved);
      }
    });
  }

  function diagnosticsText() {
    const diag = engine.diagnostics();
    return [
      'MIRROR MOTION INTELLIGENCE — PHASE 3',
      `First failing boundary: ${state.firstFailingBoundary}`,
      `Pipeline stage: ${state.lastPipelineStage}`,
      `Avatar runtime patched: ${state.avatarRuntimePatched ? 'YES' : 'NO'}`,
      `Renderer bound: ${state.rendererBound ? 'YES' : 'NO'}`,
      `Structural frames: ${diag.frames}`,
      `Calibrated segments: ${diag.calibratedSegments} / ${SEGMENTS.length}`,
      `Calibration outliers rejected: ${diag.calibrationRejects}`,
      `Length corrections: ${diag.corrections}`,
      `Left/right recoveries: ${diag.identitySwaps}`,
      `Structural resets: ${state.structuralResets}`,
      `Last structural reset: ${state.lastStructuralResetReason}`,
      `Last structural issue: ${diag.lastIssue}`,
      `Structural process errors: ${state.processErrors}`
    ].join('\n');
  }

  function ensureDebugPanel() {
    const doc = globalScope.document;
    if (!doc?.body) return null;
    let panel = doc.getElementById('mirrorMotionPhase3Debug');
    if (!panel) {
      panel = doc.createElement('details');
      panel.id = 'mirrorMotionPhase3Debug';
      panel.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:5001;max-width:min(92vw,520px);max-height:45vh;overflow:auto;background:rgba(2,6,23,.94);color:#e5e7eb;border:1px solid #22c55e;border-radius:10px;padding:8px;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;';
      const summary = doc.createElement('summary');
      summary.textContent = 'Mirror Motion Phase 3 Debug';
      summary.style.cssText = 'cursor:pointer;color:#86efac;font-weight:700;';
      const pre = doc.createElement('pre');
      pre.dataset.mirrorMotionPhase3Diagnostics = 'true';
      pre.style.cssText = 'white-space:pre-wrap;margin:8px 0 0;';
      panel.append(summary, pre);
      doc.body.appendChild(panel);
    }
    return panel;
  }

  function refreshDebugPanel() {
    const panel = ensureDebugPanel();
    const pre = panel?.querySelector?.('[data-mirror-motion-phase3-diagnostics]');
    if (pre) pre.textContent = diagnosticsText();
  }

  function install() {
    if (state.installed) return api;
    state.installed = true;
    state.lastPipelineStage = 'INSTALLING';
    interceptAvatarRuntimeAssignment();
    const mount = () => {
      ensureDebugPanel();
      refreshDebugPanel();
      if (!panelTimer && globalScope.setInterval) panelTimer = globalScope.setInterval(refreshDebugPanel, 500);
    };
    if (globalScope.document?.readyState === 'loading') globalScope.document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
    state.lastPipelineStage = 'INSTALLED';
    updateRuntimeDiagnostics();
    return api;
  }

  function reset() {
    engine.reset();
    state.processErrors = 0;
    state.structuralResets = 0;
    state.lastStructuralResetReason = 'NONE';
    state.observedPhase2TrackerResets = null;
    state.firstFailingBoundary = 'NONE';
    state.lastPipelineStage = 'RESET';
    updateRuntimeDiagnostics();
  }

  const api = Object.freeze({
    DEFAULTS,
    SEGMENTS,
    IDENTITY_PAIRS,
    createStructuralEngine,
    process: engine.process,
    reset,
    diagnostics: () => ({ ...state, ...engine.diagnostics() }),
    diagnosticsText,
    wrapRenderer,
    patchAvatarRuntime,
    install
  });
  return api;
});
