'use strict';

const { jointAngle } = require('./geometry');
const { availableSides, resolveLandmark } = require('./landmarks');

function evaluateCandidate(rule, landmarks, side, minimumConfidence) {
  const points = rule.landmarks.map((name) => resolveLandmark(name, landmarks, side));
  if (points.some((point) => !point)) return { evaluable: false, reason: 'missing_landmarks', side };
  if (points.some((point) => point.confidence < minimumConfidence)) {
    return { evaluable: false, reason: 'low_confidence', side };
  }
  if (rule.type !== 'joint_angle') return { evaluable: false, reason: 'unsupported_rule_type', side };
  const measuredValue = jointAngle(...points);
  if (measuredValue === null) return { evaluable: false, reason: 'degenerate_geometry', side };
  const passed = measuredValue >= rule.target.min && measuredValue <= rule.target.max;
  return {
    evaluable: true, side, measuredValue, passed,
    distance: measuredValue < rule.target.min
      ? rule.target.min - measuredValue
      : Math.max(0, measuredValue - rule.target.max),
  };
}

function evaluateRule(rule, landmarks, minimumConfidence) {
  const sides = availableSides(rule, landmarks);
  if (!sides.length) return { ruleId: rule.id, passed: false, skipped: true, reason: 'missing_landmarks', feedback: null };
  const candidates = sides.map((side) => evaluateCandidate(rule, landmarks, side, minimumConfidence));
  const valid = candidates.filter((candidate) => candidate.evaluable);
  if (!valid.length) {
    return { ruleId: rule.id, passed: false, skipped: true, reason: candidates[0].reason, feedback: null };
  }
  const selected = valid.sort((a, b) => a.distance - b.distance)[0];
  const feedback = selected.passed ? null
    : selected.measuredValue < rule.target.min ? rule.feedbackLow : rule.feedbackHigh;
  return {
    ruleId: rule.id, passed: selected.passed, skipped: false, severity: selected.passed ? 'none' : rule.severity,
    measuredValue: Number(selected.measuredValue.toFixed(2)), targetRange: rule.target, side: selected.side, feedback,
  };
}

function evaluatePose(observation, definition, options = {}) {
  if (!observation || observation.poseId !== definition.poseId) throw new Error('Observation and rule pose IDs must match');
  const minimumConfidence = options.minimumConfidence ?? 0.5;
  const rules = definition.rules.map((rule) => evaluateRule(rule, observation.landmarks || {}, minimumConfidence));
  const evaluated = rules.filter((rule) => !rule.skipped);
  const failures = evaluated.filter((rule) => !rule.passed);
  const confidence = evaluated.length / Math.max(1, rules.length);
  return {
    poseId: observation.poseId, timestamp: observation.timestamp, confidence,
    rules, overallStatus: !evaluated.length ? 'insufficient_data' : failures.length ? 'needs_adjustment' : 'aligned',
    feedback: failures.map((rule) => rule.feedback).filter(Boolean),
  };
}

module.exports = { evaluatePose, evaluateRule };
