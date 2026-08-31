const test = require("node:test");
const assert = require("node:assert/strict");
const THREE = require("three");
const { AvatarBodyFollower, BODY_FOLLOW_DEFAULTS, LIVE_SOLVER_DEFAULTS } = require("../public/motion/live-avatar-mirror");

function frame({ x = 0.5, y = 0.55, bodyHeight = 0.7, confidence = 0.95 } = {}) {
  return {
    timestamp: Date.now(),
    confidence: { overall: confidence, bodyDetected: true },
    landmarks: {
      hipCenter: { x, y, confidence },
      bodyHeightNormalized: bodyHeight
    }
  };
}

test("body follower calibrates neutral stance before applying lateral translation", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 2, smoothingLambda: 1000 });
  follower.observe(frame());
  assert.equal(follower.calibrated, false);
  follower.observe(frame());
  assert.equal(follower.calibrated, true);
  follower.apply(1);
  assert.ok(Math.abs(avatar.position.x) < 1e-9);
});

test("lateral hip travel moves the avatar root laterally for lunges", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 1, smoothingLambda: 1000, lateralScale: 0.8 });
  follower.observe(frame());
  follower.observe(frame({ x: 0.65 }));
  follower.apply(1);
  assert.ok(avatar.position.x > 0, "avatar root should follow hip travel instead of remaining fixed");
});

test("low-confidence frames do not rewrite the lateral body-follow target", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 1, smoothingLambda: 1000 });
  follower.observe(frame());
  follower.observe(frame({ x: 0.6 }));
  const before = follower.targetLateral;
  follower.observe(frame({ x: 0.1, y: 0.95, confidence: 0.1 }));
  assert.equal(follower.targetLateral, before);
});

test("tracking loss returns lateral body follow toward neutral", () => {
  let now = 1000;
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, now: () => now, calibrationFrames: 1, smoothingLambda: 1000, missingFrameReturnMs: 100 });
  follower.observe({ ...frame(), timestamp: now });
  follower.observe({ ...frame({ x: 0.65 }), timestamp: now });
  assert.notEqual(follower.targetLateral, 0);
  now = 1200;
  follower.markMissing(now);
  follower.apply(1);
  assert.ok(Math.abs(avatar.position.x) < 1e-6);
});

test("live mirror strengthens canonical vertical root travel for squat and floor transitions", () => {
  assert.equal(LIVE_SOLVER_DEFAULTS.rootTranslationScale, 0.9);
  assert.equal(LIVE_SOLVER_DEFAULTS.rootTranslationClamp, 0.75);
  assert.ok(LIVE_SOLVER_DEFAULTS.rootTranslationScale > 0.45, "live mirror should allow more whole-body descent than the solver baseline");
  assert.ok(LIVE_SOLVER_DEFAULTS.rootTranslationClamp > 0.38, "live mirror should not clamp squat/floor root travel at the former baseline");
});

test("defaults keep lateral body following bounded for live camera mirroring", () => {
  assert.ok(BODY_FOLLOW_DEFAULTS.lateralClamp > 0 && BODY_FOLLOW_DEFAULTS.lateralClamp <= 1);
  assert.ok(BODY_FOLLOW_DEFAULTS.minimumConfidence >= 0.3);
});
