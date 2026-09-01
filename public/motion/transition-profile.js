(function initTransitionProfile(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTTransitionProfile = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function transitionProfileFactory() {
  'use strict';

  function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function lerp(a, b, t) {
    return Number(a || 0) + (Number(b || 0) - Number(a || 0)) * t;
  }

  function interpolateObject(a = {}, b = {}, t = 0) {
    return Object.freeze({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t)
    });
  }

  function validateProfile(profile) {
    if (!profile || typeof profile !== 'object') throw new TypeError('transition profile is required');
    if (!Array.isArray(profile.anchors) || profile.anchors.length < 2) throw new TypeError('transition profile requires at least two anchors');
    const duration = Number(profile.durationSeconds);
    if (!(duration > 0)) throw new TypeError('transition profile durationSeconds must be positive');
    let previous = -Infinity;
    for (const anchor of profile.anchors) {
      const at = Number(anchor?.timeSeconds);
      if (!Number.isFinite(at) || at < previous) throw new TypeError('transition anchors must have ascending timeSeconds');
      previous = at;
    }
    return profile;
  }

  function sampleTransitionProfile(profile, progress01) {
    validateProfile(profile);
    const progress = clamp01(progress01);
    const targetTime = progress * Number(profile.durationSeconds);
    const anchors = profile.anchors;
    if (targetTime <= Number(anchors[0].timeSeconds)) return Object.freeze({ ...anchors[0], progress01: progress });
    if (targetTime >= Number(anchors.at(-1).timeSeconds)) return Object.freeze({ ...anchors.at(-1), progress01: progress });

    let left = anchors[0];
    let right = anchors.at(-1);
    for (let index = 1; index < anchors.length; index += 1) {
      if (Number(anchors[index].timeSeconds) >= targetTime) {
        left = anchors[index - 1];
        right = anchors[index];
        break;
      }
    }
    const span = Math.max(0.000001, Number(right.timeSeconds) - Number(left.timeSeconds));
    const local = clamp01((targetTime - Number(left.timeSeconds)) / span);
    return Object.freeze({
      phaseFrom: left.phase,
      phaseTo: right.phase,
      progress01: progress,
      timeSeconds: targetTime,
      rootDrop01: lerp(left.rootDrop01, right.rootDrop01, local),
      hipTranslation: interpolateObject(left.hipTranslation, right.hipTranslation, local),
      hipRotationDeltaDegrees: interpolateObject(left.hipRotationDeltaDegrees, right.hipRotationDeltaDegrees, local)
    });
  }

  function inferTransitionProgress({ bodyAxisAngleDegrees, rootDropNormalized } = {}) {
    const drop = clamp01(rootDropNormalized);
    const angle = clamp01(Math.abs(Number(bodyAxisAngleDegrees) || 0) / 90);
    return clamp01(Math.max(drop, angle * 0.85));
  }

  return Object.freeze({ clamp01, validateProfile, sampleTransitionProfile, inferTransitionProgress });
});
