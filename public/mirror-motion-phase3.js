(function initMirrorMotionPhase3(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMirrorMotionPhase3 = api;
})(typeof window !== 'undefined' ? window : globalThis, function mirrorMotionPhase3Factory(globalScope) {
  'use strict';

  const DEFAULTS = Object.freeze({
    calibrationConfidence: 0.72,
    minCalibrationSamples: 6,
    calibrationAlpha: 0.18,
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
  const dist = (a, b) => (a && b && finite(a.x) && finite(a.y) && finite(b.x) && finite(b.y)) ? Math.hypot(Number(a.x)-Number(b.x), Number(a.y)-Number(b.y)) : NaN;
  const confidence = p => Number(p?.confidence ?? p?.score ?? 0) || 0;
  const usableForCalibration = p => p && finite(p.x) && finite(p.y) && confidence(p) >= 0.72 && !['dropped','coasted'].includes(p.stabilityState);

  function createStructuralEngine(options = {}) {
    const config = { ...DEFAULTS, ...options };
    const segments = new Map();
    const previous = new Map();
    let frames = 0;
    let corrections = 0;
    let identitySwaps = 0;
    let lastIssue = 'NONE';

    function reset() {
      segments.clear();
      previous.clear();
      frames = 0;
      corrections = 0;
      identitySwaps = 0;
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
      const candidates = [shoulder, hip].filter(Number.isFinite).filter(v => v > 1);
      return candidates.length ? candidates.reduce((a,b) => a+b, 0) / candidates.length : 100;
    }

    function maybeRecoverIdentity(map, scale, frameStats) {
      for (const [label, leftName, rightName] of IDENTITY_PAIRS) {
        const left = map.get(leftName); const right = map.get(rightName);
        const prevLeft = previous.get(leftName); const prevRight = previous.get(rightName);
        if (!left || !right || !prevLeft || !prevRight) continue;
        if (confidence(left) < config.identityConfidence || confidence(right) < config.identityConfidence) continue;
        const sameCost = dist(left, prevLeft) + dist(right, prevRight);
        const swapCost = dist(left, prevRight) + dist(right, prevLeft);
        if (!Number.isFinite(sameCost) || !Number.isFinite(swapCost)) continue;
        const traveledEnough = sameCost > scale * config.identityMinimumTravelRatio;
        const clearlySwapped = swapCost + scale * config.identitySwapMarginRatio < sameCost;
        if (!traveledEnough || !clearlySwapped) continue;
        const lx = left.x, ly = left.y, ls = left.score, lc = left.confidence;
        left.x = right.x; left.y = right.y; left.score = right.score; left.confidence = right.confidence;
        right.x = lx; right.y = ly; right.score = ls; right.confidence = lc;
        left.structuralIdentityState = `recovered_from_${rightName}`;
        right.structuralIdentityState = `recovered_from_${leftName}`;
        frameStats.identitySwaps += 1; identitySwaps += 1; lastIssue = `IDENTITY_RECOVERED:${label}`;
      }
    }

    function updateCalibration(name, length) {
      if (!Number.isFinite(length) || length <= 1) return;
      const current = segments.get(name) || { length, samples: 0 };
      current.length = current.samples === 0 ? length : current.length + (length - current.length) * config.calibrationAlpha;
      current.samples += 1;
      segments.set(name, current);
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
      frameStats.lengthCorrections += 1; corrections += 1; lastIssue = `LENGTH_CONSTRAINED:${name}`;
    }

    function process(packet) {
      frames += 1;
      const points = (packet?.keypoints || []).map(point => ({ ...point }));
      const map = pointMap(points);
      const frameStats = { calibratedSegments: 0, lengthCorrections: 0, identitySwaps: 0 };
      const scale = bodyScale(map);

      maybeRecoverIdentity(map, scale, frameStats);

      for (const [name, aName, bName] of SEGMENTS) {
        const a = map.get(aName); const b = map.get(bName);
        if (usableForCalibration(a) && usableForCalibration(b)) updateCalibration(name, dist(a,b));
      }

      for (const [name, aName, bName] of SEGMENTS) {
        const a = map.get(aName); const b = map.get(bName);
        if (!a || !b || !finite(a.x) || !finite(a.y) || !finite(b.x) || !finite(b.y)) continue;
        constrainSegment(name, a, b, frameStats);
      }

      for (const [name, point] of map) {
        if (finite(point.x) && finite(point.y) && confidence(point) > 0) previous.set(name, { x: Number(point.x), y: Number(point.y) });
      }
      frameStats.calibratedSegments = [...segments.values()].filter(item => item.samples >= config.minCalibrationSamples).length;
      return {
        ...packet,
        keypoints: points,
        structural: {
          version: 1,
          frame: frames,
          bodyScalePx: scale,
          frameStats,
          lastIssue,
          segmentModel: Object.fromEntries([...segments.entries()].map(([name, value]) => [name, { ...value }]))
        }
      };
    }

    function diagnostics() {
      return {
        frames,
        calibratedSegments: [...segments.values()].filter(item => item.samples >= config.minCalibrationSamples).length,
        corrections,
        identitySwaps,
        lastIssue,
        segmentModel: Object.fromEntries([...segments.entries()].map(([name, value]) => [name, { ...value }]))
      };
    }

    return Object.freeze({ process, reset, diagnostics, config: Object.freeze({ ...config }) });
  }

  const defaultEngine = createStructuralEngine();
  return Object.freeze({ DEFAULTS, SEGMENTS, IDENTITY_PAIRS, createStructuralEngine, process: defaultEngine.process, reset: defaultEngine.reset, diagnostics: defaultEngine.diagnostics });
});