const test = require('node:test');
const assert = require('node:assert/strict');
const { createPoseStabilizer } = require('../public/pose-stability-engine');

function packet(x, y, score = 0.95, name = 'left_knee') {
  return { keypoints: [{ name, x, y, score }] };
}

test('damps small frame-to-frame jitter instead of copying raw pixels', () => {
  const tracker = createPoseStabilizer({ minAlpha: 0.2, maxAlpha: 0.4 });
  tracker.process(packet(100, 100), 0);
  const next = tracker.process(packet(106, 98), 33).keypoints[0];
  assert.ok(next.x > 100 && next.x < 106);
  assert.ok(next.y < 100 && next.y > 98);
  assert.equal(next.stabilityState, 'smoothed');
});

test('high-confidence deliberate movement remains responsive', () => {
  const tracker = createPoseStabilizer({ minAlpha: 0.15, maxAlpha: 0.8, velocityForMaxAlphaPxPerSecond: 200 });
  tracker.process(packet(100, 100), 0);
  const next = tracker.process(packet(130, 100), 33).keypoints[0];
  assert.ok(next.x >= 120, `expected responsive movement, got ${next.x}`);
});

test('velocity increases responsiveness at the same confidence', () => {
  const slow = createPoseStabilizer({ velocityForMaxAlphaPxPerSecond: 900 });
  slow.process(packet(100, 100, 0.4), 0);
  const slowPoint = slow.process(packet(103, 100, 0.4), 33).keypoints[0];

  const fast = createPoseStabilizer({ velocityForMaxAlphaPxPerSecond: 900 });
  fast.process(packet(100, 100, 0.4), 0);
  const fastPoint = fast.process(packet(130, 100, 0.4), 33).keypoints[0];

  assert.ok(fastPoint.stabilityAlpha > slowPoint.stabilityAlpha,
    `expected velocity boost: fast=${fastPoint.stabilityAlpha}, slow=${slowPoint.stabilityAlpha}`);
});

test('brief low-confidence loss coasts from the tracked state rather than teleporting', () => {
  const tracker = createPoseStabilizer({ maxCoastMs: 200, confidenceFloor: 0.2 });
  tracker.process(packet(100, 100), 0);
  tracker.process(packet(110, 100), 33);
  const lost = tracker.process(packet(400, 300, 0.05), 66).keypoints[0];
  assert.equal(lost.stabilityState, 'coasted');
  assert.ok(lost.x < 200, `coasted point should not follow low-confidence teleport: ${lost.x}`);
});

test('implausible one-frame jumps are bounded before smoothing', () => {
  const tracker = createPoseStabilizer({ maxJumpPxPerSecond: 300, minimumJumpAllowancePx: 10, minAlpha: 1, maxAlpha: 1 });
  tracker.process(packet(100, 100), 0);
  const next = tracker.process(packet(400, 100), 33).keypoints[0];
  assert.equal(next.stabilityState, 'clamped_smoothed');
  assert.ok(next.x <= 111, `jump should be bounded near the allowance, got ${next.x}`);
});

test('internal timestamp remains monotonic when source timestamps move backward', () => {
  const tracker = createPoseStabilizer();
  tracker.process(packet(100, 100), 100);
  const next = tracker.process(packet(101, 100), 90);
  assert.equal(next.timestampMs, 101);
  assert.equal(tracker.diagnostics().lastTimestamp, 101);
});

test('dropped invalid points are neutralized before downstream retargeting', () => {
  const tracker = createPoseStabilizer();
  const next = tracker.process(packet(undefined, undefined, 0.95), 0).keypoints[0];
  assert.equal(next.stabilityState, 'dropped');
  assert.equal(next.score, 0);
  assert.equal(next.confidence, 0);
  assert.equal(next.x, undefined);
  assert.equal(next.y, undefined);
  assert.equal(next.rawConfidence, 0.95);
});

test('reset forgets prior motion history', () => {
  const tracker = createPoseStabilizer();
  tracker.process(packet(100, 100), 0);
  tracker.reset();
  const next = tracker.process(packet(300, 200), 33).keypoints[0];
  assert.equal(next.x, 300);
  assert.equal(next.y, 200);
  assert.equal(next.stabilityState, 'accepted');
  assert.equal(tracker.diagnostics().frameCount, 1);
});
