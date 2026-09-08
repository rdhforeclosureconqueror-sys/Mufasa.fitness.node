(function initAvatarMotionIntelligenceCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTAvatarMotionIntelligenceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function avatarMotionIntelligenceCoreFactory() {
  'use strict';

  const DEFAULTS = Object.freeze({
    anchorMaxDriftRatio: 0.18,
    anchorCorrectionGain: 0.82,
    anchorCorrectionMinRatio: 0.015,
    segmentLengthToleranceRatio: 0.22,
    maxYawDeg: 65,
    epsilon: 1e-6
  });

  const finite = value => Number.isFinite(Number(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const dimensions = point => ['x', 'y', 'z'].filter(axis => finite(point?.[axis]));

  function pointDimension(point) {
    if (!point || !finite(point.x) || !finite(point.y)) return 0;
    return finite(point.z) ? 3 : 2;
  }

  function sameDimensions(...points) {
    const dims = points.filter(Boolean).map(pointDimension);
    return dims.length > 0 && dims[0] >= 2 && dims.every(value => value === dims[0]);
  }

  function clonePoint(point) {
    if (!point) return null;
    const out = { ...point };
    for (const axis of ['x', 'y', 'z']) if (finite(point[axis])) out[axis] = Number(point[axis]);
    return out;
  }

  function vector(from, to) {
    if (!sameDimensions(from, to)) return null;
    const out = {
      x: Number(to.x) - Number(from.x),
      y: Number(to.y) - Number(from.y)
    };
    if (pointDimension(from) === 3) out.z = Number(to.z) - Number(from.z);
    return out;
  }

  function add(a, b) {
    return { x: Number(a?.x || 0) + Number(b?.x || 0), y: Number(a?.y || 0) + Number(b?.y || 0), z: Number(a?.z || 0) + Number(b?.z || 0) };
  }

  function subtract(a, b) {
    return { x: Number(a?.x || 0) - Number(b?.x || 0), y: Number(a?.y || 0) - Number(b?.y || 0), z: Number(a?.z || 0) - Number(b?.z || 0) };
  }

  function scale(v, amount) {
    return { x: Number(v?.x || 0) * amount, y: Number(v?.y || 0) * amount, z: Number(v?.z || 0) * amount };
  }

  function dot(a, b) {
    return Number(a?.x || 0) * Number(b?.x || 0) + Number(a?.y || 0) * Number(b?.y || 0) + Number(a?.z || 0) * Number(b?.z || 0);
  }

  function cross(a, b) {
    return {
      x: Number(a?.y || 0) * Number(b?.z || 0) - Number(a?.z || 0) * Number(b?.y || 0),
      y: Number(a?.z || 0) * Number(b?.x || 0) - Number(a?.x || 0) * Number(b?.z || 0),
      z: Number(a?.x || 0) * Number(b?.y || 0) - Number(a?.y || 0) * Number(b?.x || 0)
    };
  }

  function magnitude(v) {
    return Math.hypot(Number(v?.x || 0), Number(v?.y || 0), Number(v?.z || 0));
  }

  function normalize(v, epsilon = DEFAULTS.epsilon) {
    const length = magnitude(v);
    if (!Number.isFinite(length) || length <= epsilon) return null;
    return scale(v, 1 / length);
  }

  function distance(a, b) {
    if (!sameDimensions(a, b)) return NaN;
    const dx = Number(a.x) - Number(b.x), dy = Number(a.y) - Number(b.y);
    const dz = pointDimension(a) === 3 ? Number(a.z) - Number(b.z) : 0;
    return Math.hypot(dx, dy, dz);
  }

  function constrainSegmentLength(proximal, distal, targetLength, options = {}) {
    const toleranceRatio = Number(options.toleranceRatio ?? DEFAULTS.segmentLengthToleranceRatio);
    const target = Number(targetLength);
    if (!sameDimensions(proximal, distal)) {
      return Object.freeze({ status: 'DIMENSION_MISMATCH', point: clonePoint(distal), observedLength: NaN, targetLength: target });
    }
    const observed = distance(proximal, distal);
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(observed) || observed <= DEFAULTS.epsilon) {
      return Object.freeze({ status: 'INVALID', point: clonePoint(distal), observedLength: observed, targetLength: target });
    }
    const errorRatio = Math.abs(observed - target) / Math.max(target, DEFAULTS.epsilon);
    if (errorRatio <= toleranceRatio) {
      return Object.freeze({ status: 'WITHIN_TOLERANCE', point: clonePoint(distal), observedLength: observed, targetLength: target, errorRatio });
    }
    const direction = normalize(vector(proximal, distal));
    if (!direction) return Object.freeze({ status: 'DEGENERATE', point: clonePoint(distal), observedLength: observed, targetLength: target, errorRatio });
    const corrected = add(proximal, scale(direction, target));
    const point = { ...distal, x: corrected.x, y: corrected.y };
    if (pointDimension(proximal) === 3) point.z = corrected.z;
    return Object.freeze({ status: 'CORRECTED', point: Object.freeze(point), observedLength: observed, targetLength: target, errorRatio });
  }

  function applyContactAnchor(point, anchor, bodyScale, options = {}) {
    const maxDriftRatio = Number(options.maxDriftRatio ?? DEFAULTS.anchorMaxDriftRatio);
    const correctionGain = clamp(options.correctionGain ?? DEFAULTS.anchorCorrectionGain, 0, 1);
    const correctionMinRatio = Number(options.correctionMinRatio ?? DEFAULTS.anchorCorrectionMinRatio);
    const scaleValue = Number(bodyScale);
    if (!sameDimensions(point, anchor)) {
      return Object.freeze({ status: 'DIMENSION_MISMATCH', point: clonePoint(point), drift: NaN });
    }
    const drift = distance(point, anchor);
    if (!Number.isFinite(drift) || !Number.isFinite(scaleValue) || scaleValue <= DEFAULTS.epsilon) {
      return Object.freeze({ status: 'INVALID', point: clonePoint(point), drift });
    }
    const maxDrift = Math.max(0, scaleValue * maxDriftRatio);
    if (drift > maxDrift) {
      return Object.freeze({ status: 'RELEASED_EXCESS_DRIFT', point: clonePoint(point), drift, maxDrift });
    }
    const correctionFloor = Math.max(0, scaleValue * correctionMinRatio);
    if (drift <= correctionFloor) {
      return Object.freeze({ status: 'MAINTAINED', point: clonePoint(point), drift, maxDrift });
    }
    const corrected = clonePoint(point);
    for (const axis of dimensions(anchor)) {
      if (!finite(point?.[axis])) continue;
      corrected[axis] = Number(point[axis]) + (Number(anchor[axis]) - Number(point[axis])) * correctionGain;
    }
    return Object.freeze({ status: 'CORRECTED', point: Object.freeze(corrected), drift, maxDrift, correctionGain });
  }

  function choosePerpendicular(direction, center, bendHint, epsilon = DEFAULTS.epsilon) {
    if (bendHint && finite(bendHint.x) && finite(bendHint.y)) {
      const hintOffset = subtract(bendHint, center);
      const projected = scale(direction, dot(hintOffset, direction));
      const perpendicular = subtract(hintOffset, projected);
      const normalized = normalize(perpendicular, epsilon);
      if (normalized) return normalized;
    }
    const candidateAxes = [{ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }];
    for (const axis of candidateAxes) {
      const perpendicular = normalize(cross(direction, axis), epsilon);
      if (perpendicular) return perpendicular;
    }
    return null;
  }

  function solveTwoBoneChain(root, joint, end, length1, length2, options = {}) {
    const l1 = Number(length1), l2 = Number(length2), epsilon = Number(options.epsilon ?? DEFAULTS.epsilon);
    const bendHint = options.bendHint || joint;
    if (!sameDimensions(root, joint, end, bendHint)) return Object.freeze({ status: 'DIMENSION_MISMATCH' });
    if (![l1, l2].every(value => Number.isFinite(value) && value > epsilon)) return Object.freeze({ status: 'INVALID_LENGTHS' });
    const rootToEnd = vector(root, end), endDistance = magnitude(rootToEnd);
    if (!rootToEnd || !Number.isFinite(endDistance) || endDistance <= epsilon) return Object.freeze({ status: 'DEGENERATE' });
    if (endDistance > l1 + l2 + epsilon || endDistance < Math.abs(l1 - l2) - epsilon) {
      return Object.freeze({ status: 'UNREACHABLE', distance: endDistance });
    }
    const direction = normalize(rootToEnd, epsilon);
    const along = (l1 * l1 - l2 * l2 + endDistance * endDistance) / (2 * endDistance);
    const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const center = add(root, scale(direction, along));
    const perpendicular = choosePerpendicular(direction, center, bendHint, epsilon);
    if (!perpendicular) return Object.freeze({ status: 'DEGENERATE_BEND_PLANE' });
    const solved = add(center, scale(perpendicular, height));
    const point = { ...joint, x: solved.x, y: solved.y };
    if (pointDimension(root) === 3) point.z = solved.z;
    const residual = Math.max(Math.abs(distance(root, point) - l1), Math.abs(distance(point, end) - l2));
    return Object.freeze({ status: 'SOLVED', point: Object.freeze(point), distance: endDistance, residual, lengths: Object.freeze([l1, l2]) });
  }

  function solveRootAnchorCorrection(contacts, options = {}) {
    const candidates = (contacts || []).filter(contact => contact?.current && contact?.anchor);
    if (candidates.some(contact => !sameDimensions(contact.current, contact.anchor))) {
      return Object.freeze({ status: 'DIMENSION_MISMATCH', delta: Object.freeze({ x: 0, y: 0, z: 0 }), contactCount: candidates.length });
    }
    const usable = candidates.filter(contact => Number.isFinite(distance(contact.current, contact.anchor)));
    if (!usable.length) return Object.freeze({ status: 'NO_CONTACTS', delta: Object.freeze({ x: 0, y: 0, z: 0 }), contactCount: 0 });
    const delta = { x: 0, y: 0, z: 0 };
    for (const contact of usable) {
      const correction = subtract(contact.anchor, contact.current);
      delta.x += correction.x; delta.y += correction.y; delta.z += correction.z;
    }
    delta.x /= usable.length; delta.y /= usable.length; delta.z /= usable.length;
    const maxCorrection = Number(options.maxCorrection ?? Infinity);
    const size = magnitude(delta);
    const bounded = Number.isFinite(maxCorrection) && maxCorrection >= 0 && size > maxCorrection && size > DEFAULTS.epsilon
      ? scale(delta, maxCorrection / size) : delta;
    return Object.freeze({ status: size <= DEFAULTS.epsilon ? 'ALIGNED' : 'CORRECTION_REQUIRED', delta: Object.freeze(bounded), rawMagnitude: size, contactCount: usable.length });
  }

  function boundYawIntent(intent, options = {}) {
    const maxYawDeg = Math.abs(Number(options.maxYawDeg ?? DEFAULTS.maxYawDeg));
    const minConfidence = Number(options.minConfidence ?? 0);
    const confidence = Number(intent?.confidence);
    const yawIntentDeg = Number(intent?.yawIntentDeg);
    if (intent?.measuredDepth === true) return Object.freeze({ status: 'REJECTED_DEPTH_CLAIM', yawDeg: 0 });
    if (!Number.isFinite(yawIntentDeg)) return Object.freeze({ status: 'INVALID', yawDeg: 0 });
    if (Number.isFinite(confidence) && confidence < minConfidence) return Object.freeze({ status: 'LOW_CONFIDENCE', yawDeg: 0 });
    const bounded = clamp(yawIntentDeg, -maxYawDeg, maxYawDeg);
    return Object.freeze({ status: bounded === yawIntentDeg ? 'ACCEPTED' : 'CLAMPED', yawDeg: bounded, measuredDepth: false });
  }

  function validateKinematicPose(pose = {}) {
    const failures = [];
    for (const constraint of pose.segmentConstraints || []) {
      const observed = distance(constraint.proximal, constraint.distal);
      const target = Number(constraint.targetLength), tolerance = Number(constraint.toleranceRatio ?? DEFAULTS.segmentLengthToleranceRatio);
      if (!sameDimensions(constraint.proximal, constraint.distal)) failures.push({ type: 'SEGMENT_DIMENSION_MISMATCH', id: constraint.id || null });
      else if (!Number.isFinite(observed) || !Number.isFinite(target) || target <= 0) failures.push({ type: 'SEGMENT_INVALID', id: constraint.id || null });
      else if (Math.abs(observed - target) / target > tolerance) failures.push({ type: 'SEGMENT_LENGTH', id: constraint.id || null });
    }
    for (const contact of pose.contacts || []) {
      const drift = distance(contact.current, contact.anchor);
      const maxDrift = Number(contact.maxDrift ?? 0);
      if (!sameDimensions(contact.current, contact.anchor)) failures.push({ type: 'CONTACT_DIMENSION_MISMATCH', id: contact.id || null });
      else if (!Number.isFinite(drift)) failures.push({ type: 'CONTACT_INVALID', id: contact.id || null });
      else if (drift > maxDrift) failures.push({ type: 'CONTACT_DRIFT', id: contact.id || null, drift, maxDrift });
    }
    return Object.freeze({ status: failures.length ? 'FAILED' : 'PASS', failures: Object.freeze(failures.map(Object.freeze)), firstFailure: failures[0] ? Object.freeze({ ...failures[0] }) : null });
  }

  return Object.freeze({
    VERSION: '1.0.0-phase1',
    DEFAULTS,
    distance,
    constrainSegmentLength,
    applyContactAnchor,
    solveTwoBoneChain,
    solveRootAnchorCorrection,
    boundYawIntent,
    validateKinematicPose
  });
});