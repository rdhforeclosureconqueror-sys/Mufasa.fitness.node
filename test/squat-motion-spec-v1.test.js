const assert = require('node:assert/strict');
const test = require('node:test');

const SquatMotion = require('../public/motion/squat-motion-spec.js');

test('synthesized squat spec validates against canonical bones', () => {
  const result = SquatMotion.validate(SquatMotion.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('synthesized squat uses the canonical five-phase squat cycle', () => {
  assert.deepEqual(SquatMotion.spec.phaseOrder, ['start', 'descent', 'bottom', 'ascent', 'finish']);
  assert.equal(SquatMotion.spec.phases.length, 5);
  assert.equal(SquatMotion.spec.phases[0].normalizedTime, 0);
  assert.equal(SquatMotion.spec.phases.at(-1).normalizedTime, 1);
});

test('descent and ascent are mirrored engineering poses', () => {
  const descent = SquatMotion.spec.phases.find(phase => phase.id === 'descent');
  const ascent = SquatMotion.spec.phases.find(phase => phase.id === 'ascent');
  assert.deepEqual(descent.root.positionOffset, ascent.root.positionOffset);
  assert.deepEqual(descent.boneTargets, ascent.boneTargets);
});

test('bottom is lower than standing and preserves bilateral foot contact', () => {
  const start = SquatMotion.spec.phases.find(phase => phase.id === 'start');
  const bottom = SquatMotion.spec.phases.find(phase => phase.id === 'bottom');
  assert.ok(bottom.root.positionOffset[1] < start.root.positionOffset[1]);
  assert.deepEqual(bottom.contacts, ['left_foot', 'right_foot']);
});

test('spec is explicitly development-only and not biomechanically authoritative', () => {
  assert.equal(SquatMotion.spec.status, 'development-test-only');
  assert.equal(SquatMotion.spec.synthesisBoundary.copiedNamedSquatAnimation, false);
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('biomechanical ground truth'));
  assert.ok(SquatMotion.spec.synthesisBoundary.unsupported.includes('scoring tolerances'));
});

test('summary keeps human MoveNet review as a required next step', () => {
  const summary = SquatMotion.summary();
  assert.equal(summary.motionId, 'squat/synthesized_engineering_v1');
  assert.equal(summary.requiresHumanMoveNetReview, true);
  assert.equal(summary.bottomRootDropAvatarHeights, 0.10);
});
