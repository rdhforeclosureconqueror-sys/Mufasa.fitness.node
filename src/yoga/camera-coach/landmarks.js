'use strict';

const SIDES = ['left', 'right'];

function canonicalName(name, mirrored = false) {
  if (!mirrored) return name;
  if (name.startsWith('left_')) return `right_${name.slice(5)}`;
  if (name.startsWith('right_')) return `left_${name.slice(6)}`;
  return name;
}

/** Convert a provider-neutral array/object into a coordinate-system-independent frame. */
function normalizeLandmarks(input, options = {}) {
  const { width = 1, height = 1, mirrored = false } = options;
  if (!(width > 0) || !(height > 0)) throw new TypeError('width and height must be positive');
  const entries = Array.isArray(input)
    ? input.map((point) => [point.name, point])
    : Object.entries(input || {});
  const landmarks = {};
  for (const [rawName, point] of entries) {
    if (!rawName || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const name = canonicalName(rawName, mirrored);
    landmarks[name] = {
      x: point.x / width,
      y: point.y / height,
      z: Number.isFinite(point.z) ? point.z / width : 0,
      confidence: Number.isFinite(point.confidence) ? point.confidence : 1,
    };
  }
  return landmarks;
}

function resolveLandmark(name, landmarks, side) {
  const requested = name.includes('{side}') ? name.replace('{side}', side) : name;
  return landmarks[requested];
}

function availableSides(rule, landmarks) {
  if (SIDES.includes(rule.side)) return [rule.side];
  if (rule.side === 'either' || rule.side === 'front') {
    return SIDES.filter((side) => rule.landmarks.every((name) => resolveLandmark(name, landmarks, side)));
  }
  return [undefined];
}

module.exports = { normalizeLandmarks, resolveLandmark, availableSides };
