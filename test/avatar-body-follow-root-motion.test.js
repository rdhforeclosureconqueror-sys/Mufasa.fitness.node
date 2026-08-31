const test = require("node:test");
const assert = require("node:assert/strict");
const THREE = require("three");
const { AvatarBodyFollower, BODY_FOLLOW_DEFAULTS } = require("../public/motion/live-avatar-mirror");

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

test("body follower calibrates neutral stance before applying translation", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 2, smoothingLambda: 1000 });
  follower.observe(frame());
  assert.equal(follower.calibrated, false);
  follower.observe(frame());
  assert.equal(follower.calibrated, true);
  follower.apply(1);
  assert.ok(Math.abs(avatar.position.x) < 1e-9);
  assert.ok(Math.abs(follower.verticalBoost) < 1e-9);
});

test("squat/floor lowering adds root descent instead of forcing the legs to carry all vertical travel", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 1, smoothingLambda: 1000, verticalBoostScale: 0.7 });
  follower.observe(frame());
  follower.observe(frame({ y: 0.75 }));
  avatar.position.y = -0.2; // existing solver root translation happens first
  follower.apply(1);
  assert.ok(avatar.position.y < -0.2, "body follower should add downward root travel");
  assert.ok(follower.verticalBoost < 0);
});

test("lateral hip travel moves the avatar root laterally for lunges", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 1, smoothingLambda: 1000, lateralScale: 0.8 });
  follower.observe(frame());
  follower.observe(frame({ x: 0.65 }));
  follower.apply(1);
  assert.ok(avatar.position.x > 0, "avatar root should follow hip travel instead of remaining fixed");
});

test("low-confidence frames do not rewrite the body-follow target", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 1, smoothingLambda: 1000 });
  follower.observe(frame());
  follower.observe(frame({ x: 0.6, y: 0.65 }));
  const before = { x: follower.targetLateral, y: follower.targetVerticalBoost };
  follower.observe(frame({ x: 0.1, y: 0.95, confidence: 0.1 }));
  assert.equal(follower.targetLateral, before.x);
  assert.equal(follower.targetVerticalBoost, before.y);
});

test("defaults keep body following bounded for live camera mirroring", () => {
  assert.ok(BODY_FOLLOW_DEFAULTS.lateralClamp > 0 && BODY_FOLLOW_DEFAULTS.lateralClamp <= 1);
  assert.ok(BODY_FOLLOW_DEFAULTS.verticalBoostClamp > 0 && BODY_FOLLOW_DEFAULTS.verticalBoostClamp <= 1);
  assert.ok(BODY_FOLLOW_DEFAULTS.minimumConfidence >= 0.3);
});
