(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaPoseCalibration = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const NAMES = ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'];
  const MIN_SAMPLES = 4;
  const STABLE_MS = 700;
  const MAX_GAP_MS = 350;
  const PHASE_TIMEOUT_MS = 30000;
  const MAX_AGE_MS = 1500;
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
    if (!Number.isFinite(minimumConfidence) || minimumConfidence <= 0 || minimumConfidence > 1 || frame?.analysisUsable !== true || frame.trackingState !== 'LOCKED') return null;
    const {sourceWidth: width, sourceHeight: height} = frame;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const points = frame.sequenceLandmarks || {};
    if (!NAMES.every(name => {
      const point = points[name];
      return point && !point.cached && !point.displayOnly && Number.isFinite(point.x) && Number.isFinite(point.y) &&
        point.x > 0 && point.x < 1 && point.y > 0 && point.y < 1 &&
        Number.isFinite(point.confidence) && point.confidence >= minimumConfidence && point.confidence <= 1;
    })) return null;
    // Restore one common coordinate scale before measuring angles. Rendering
    // transforms (contain/crop/mirror/CSS pixels) never enter this calculation.
    const p = Object.fromEntries(NAMES.map(name => [name, {x: points[name].x * width, y: points[name].y * height}]));
    const vector = [angle(p.wrist, p.elbow, p.shoulder), angle(p.elbow, p.shoulder, p.hip), angle(p.shoulder, p.hip, p.ankle)];
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
    if (samples.length < MIN_SAMPLES || samples.at(-1).at - samples[0].at < STABLE_MS) return null;
    const center = mean(samples.map(sample => sample.vector));
    const spread = Math.max(...samples.map(sample => distance(sample.vector, center)));
    return spread <= MAX_STABILITY_DEGREES ? {center, spread} : null;
  }

  function create({now = () => Date.now(), onChange = () => {}, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
    let stage = 'IDLE', samples = [], top = null, bottom = null, tolerance = null;
    let source = null, lastTimestamp = null, reason = null, failedStage = null, deadline = null, timer = null, generation = 0;
    let lossTimer = null, lossGeneration = 0;
    function snapshot() {return {stage, reason, failedStage, topCaptured: Boolean(top), bottomCaptured: Boolean(bottom), calibrated: stage === 'CALIBRATED'};}
    function emit() {onChange(snapshot());}
    function clearLoss() {clearTimer(lossTimer); lossTimer = null; lossGeneration++;}
    function clearDeadline() {clearTimer(timer); timer = null; deadline = null; generation++;}
    function erase() {samples = []; top = bottom = tolerance = source = lastTimestamp = null; clearDeadline(); clearLoss();}
    function reset() {erase(); stage = 'IDLE'; reason = failedStage = null; emit();}
    function invalidate(code = 'SOURCE_CHANGED') {
      if (stage === 'IDLE' || stage === 'NEEDS_RETRY') return;
      failedStage = stage; erase(); reason = ['SOURCE_CHANGED','TIMEOUT','TRACKING_LOST'].includes(code) ? code : 'SOURCE_CHANGED';
      stage = 'NEEDS_RETRY'; emit();
    }
    function advance(next) {
      clearDeadline(); stage = next; samples = [];
      if (next !== 'CALIBRATED') {
        deadline = now() + PHASE_TIMEOUT_MS; const current = generation;
        timer = setTimer(() => {if (generation === current) invalidate('TIMEOUT');}, PHASE_TIMEOUT_MS);
        timer?.unref?.();
      }
      emit();
    }
    function start() {erase(); reason = failedStage = null; advance('CAPTURE_TOP');}
    function fresh(frame) {return Number.isFinite(frame?.timestamp) && frame.timestamp >= 0 && now() - frame.timestamp <= MAX_AGE_MS && frame.timestamp - now() <= 250;}
    function sameSource(frame) {return !source || (frame.side === source.side && frame.sourceWidth === source.width && frame.sourceHeight === source.height);}
    function observe(frame, minimumConfidence) {
      if (!['CAPTURE_TOP', 'CAPTURE_BOTTOM', 'CONFIRM_TOP', 'CALIBRATED'].includes(stage)) return false;
      if (deadline !== null && now() >= deadline) {invalidate('TIMEOUT'); return false;}
      const vector = fresh(frame) && ['left','right'].includes(frame.side) ? signature(frame, minimumConfidence) : null;
      if (!vector) {
        samples = [];
        if (top && lossTimer === null) {const token = ++lossGeneration; lossTimer = setTimer(() => {if (token === lossGeneration) invalidate('TRACKING_LOST');}, MAX_AGE_MS); lossTimer?.unref?.();}
        return false;
      }
      if (!sameSource(frame)) {invalidate('SOURCE_CHANGED'); return false;}
      if (lastTimestamp !== null && frame.timestamp <= lastTimestamp) {samples = []; return false;}
      clearLoss(); source ||= {side: frame.side, width: frame.sourceWidth, height: frame.sourceHeight};
      if (lastTimestamp !== null && frame.timestamp - lastTimestamp > MAX_GAP_MS) samples = [];
      lastTimestamp = frame.timestamp;
      if (stage === 'CALIBRATED') return false;
      // A time window works at both low and high inference rates. Coalescing
      // above ~60 Hz bounds memory without shortening the required hold.
      if (samples.length && frame.timestamp - samples.at(-1).at < 16) return false;
      samples.push({at: frame.timestamp, vector});
      while (samples.length > 2 && samples[1].at <= frame.timestamp - STABLE_MS) samples.shift();
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
      const vector = fresh(frame) && sameSource(frame) ? signature(frame, minimumConfidence) : null;
      if (!vector) return 'UNUSABLE';
      const topDistance = distance(vector, top.center), bottomDistance = distance(vector, bottom.center);
      if (topDistance <= tolerance && topDistance < bottomDistance) return 'TOP';
      if (bottomDistance <= tolerance && bottomDistance < topDistance) return 'BOTTOM';
      return 'BETWEEN';
    }
    return {start, reset, invalidate, observe, classify, snapshot};
  }
  return Object.freeze({create, signature, distance});
});
