(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaPoseCalibration = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const NAMES = ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'];
  const WINDOW = 8;
  const STABLE_MS = 700;
  // These limits establish signal stability and two distinct personal poses.
  // They are not exercise-form, depth, or safety thresholds.
  const MAX_STABILITY_DEGREES = 7;
  const MIN_POSE_SEPARATION_DEGREES = 20;

  function angle(a, b, c) {
    const ab = {x: a.x - b.x, y: a.y - b.y}, cb = {x: c.x - b.x, y: c.y - b.y};
    const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    if (!Number.isFinite(denominator) || denominator <= 0) return null;
    const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator));
    return Math.acos(cosine) * 180 / Math.PI;
  }
  function signature(frame, minimumConfidence) {
    if (!Number.isFinite(minimumConfidence) || frame?.analysisUsable !== true || frame.trackingState !== 'LOCKED') return null;
    const points = frame.sequenceLandmarks || {};
    if (!NAMES.every(name => {
      const point = points[name];
      return point && !point.cached && !point.displayOnly && Number.isFinite(point.x) && Number.isFinite(point.y) &&
        Number.isFinite(point.confidence) && point.confidence >= minimumConfidence;
    })) return null;
    const vector = [angle(points.wrist, points.elbow, points.shoulder), angle(points.elbow, points.shoulder, points.hip), angle(points.shoulder, points.hip, points.ankle)];
    return vector.every(Number.isFinite) ? vector : null;
  }
  function distance(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
    return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length);
  }
  function mean(vectors) {
    return vectors[0].map((_, index) => vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length);
  }
  function stable(samples) {
    if (samples.length < WINDOW || samples.at(-1).at - samples[0].at < STABLE_MS) return null;
    const center = mean(samples.map(sample => sample.vector));
    const spread = Math.max(...samples.map(sample => distance(sample.vector, center)));
    return spread <= MAX_STABILITY_DEGREES ? {center, spread} : null;
  }

  function create({now = () => Date.now(), onChange = () => {}} = {}) {
    let stage = 'IDLE', samples = [], top = null, bottom = null, tolerance = null;
    function snapshot() {return {stage, topCaptured: Boolean(top), bottomCaptured: Boolean(bottom), calibrated: stage === 'CALIBRATED'};}
    function emit() {onChange(snapshot());}
    function reset() {stage = 'IDLE'; samples = []; top = bottom = tolerance = null; emit();}
    function start() {stage = 'CAPTURE_TOP'; samples = []; top = bottom = tolerance = null; emit();}
    function advance(next) {stage = next; samples = []; emit();}
    function observe(frame, minimumConfidence) {
      if (!['CAPTURE_TOP', 'CAPTURE_BOTTOM', 'CONFIRM_TOP'].includes(stage)) return false;
      const vector = signature(frame, minimumConfidence);
      if (!vector) {samples = []; return false;}
      samples.push({at: Number.isFinite(frame.timestamp) ? frame.timestamp : now(), vector});
      if (samples.length > WINDOW) samples.shift();
      const candidate = stable(samples);
      if (!candidate) return false;
      if (stage === 'CAPTURE_TOP') {top = candidate; advance('CAPTURE_BOTTOM'); return true;}
      if (stage === 'CAPTURE_BOTTOM') {
        if (distance(candidate.center, top.center) < Math.max(MIN_POSE_SEPARATION_DEGREES, top.spread * 3)) return false;
        bottom = candidate;
        const separation = distance(top.center, bottom.center);
        tolerance = Math.max(8, Math.min(separation * .35, Math.max(top.spread, bottom.spread) * 3 + 8));
        advance('CONFIRM_TOP'); return true;
      }
      const topDistance = distance(candidate.center, top.center), bottomDistance = distance(candidate.center, bottom.center);
      if (topDistance <= tolerance && topDistance < bottomDistance) {advance('CALIBRATED'); return true;}
      return false;
    }
    function classify(frame, minimumConfidence) {
      if (stage !== 'CALIBRATED') return 'UNAVAILABLE';
      const vector = signature(frame, minimumConfidence);
      if (!vector) return 'UNUSABLE';
      const topDistance = distance(vector, top.center), bottomDistance = distance(vector, bottom.center);
      if (topDistance <= tolerance && topDistance < bottomDistance) return 'TOP';
      if (bottomDistance <= tolerance && bottomDistance < topDistance) return 'BOTTOM';
      return 'BETWEEN';
    }
    return {start, reset, observe, classify, snapshot};
  }
  return Object.freeze({create, signature, distance});
});
