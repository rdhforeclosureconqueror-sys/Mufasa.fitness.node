'use strict';

const BodyIntelligence = require('../../../public/body-intelligence');

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
  return BodyIntelligence.normalizeLandmarks(input, { width, height, mirrored }).landmarks;
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
