'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const transition = require('../public/motion/transition-profile');

const profilePath = path.resolve(__dirname, '../public/motion/transition-profiles/stand-to-plank.v1.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

describe('stand-to-plank transition mechanics reference', () => {
  it('keeps the source animation out of runtime and marks live pose as authority', () => {
    assert.equal(profile.runtimeStatus, 'reference-only-not-wired');
    assert.equal(profile.stylePolicy.preserveSourcePerformanceStyling, false);
    assert.equal(profile.stylePolicy.livePoseRemainsAuthority, true);
  });

  it('contains an ordered standing-to-floor mechanics sequence', () => {
    transition.validateProfile(profile);
    assert.deepEqual(profile.anchors.map((anchor) => anchor.phase), [
      'stand', 'hinge', 'crouch', 'hands_down', 'weight_transfer', 'leg_extension', 'plank_acquire', 'plank_stable'
    ]);
    assert.equal(profile.anchors[0].rootDrop01, 0);
    assert.equal(profile.anchors.at(-1).rootDrop01, 1);
  });

  it('interpolates root descent without replaying source styling', () => {
    const halfway = transition.sampleTransitionProfile(profile, 0.5);
    assert.ok(halfway.rootDrop01 > 0.6 && halfway.rootDrop01 < 0.8);
    assert.ok(halfway.hipRotationDeltaDegrees.x > 70);
    assert.equal(typeof halfway.hipTranslation.y, 'number');
  });

  it('derives transition intent from body angle or root drop', () => {
    assert.equal(transition.inferTransitionProgress({ bodyAxisAngleDegrees: 0, rootDropNormalized: 0 }), 0);
    assert.ok(transition.inferTransitionProgress({ bodyAxisAngleDegrees: 75, rootDropNormalized: 0.2 }) > 0.7);
    assert.equal(transition.inferTransitionProgress({ bodyAxisAngleDegrees: 20, rootDropNormalized: 1.2 }), 1);
  });
});
