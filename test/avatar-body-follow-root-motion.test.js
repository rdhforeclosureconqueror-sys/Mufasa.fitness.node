const test = require("node:test");
const assert = require("node:assert/strict");
const THREE = require("three");
const { AvatarBodyFollower, AvatarMirrorCalibration, BODY_FOLLOW_DEFAULTS, LIVE_SOLVER_DEFAULTS } = require("../public/motion/live-avatar-mirror");

function frame({ x = 0.5, y = 0.55, bodyHeight = 0.7, confidence = 0.95, fullBody = true, timestamp = Date.now() } = {}) {
  const joint = (px, py, c = confidence) => ({ x: px, y: py, confidence: c });
  const joints = fullBody ? {
    left_shoulder: joint(.35,.25), right_shoulder: joint(.65,.25),
    left_hip: joint(.42,y), right_hip: joint(.58,y),
    left_ankle: joint(.4,.95), right_ankle: joint(.6,.95)
  } : {};
  return {
    timestamp,
    confidence: { overall: confidence, bodyDetected: fullBody },
    joints,
    landmarks: { hipCenter: { x, y, confidence }, bodyHeightNormalized: bodyHeight }
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

test("mirrored lateral hip travel moves the avatar root in mirror direction for lunges", () => {
  const avatar = new THREE.Group();
  const follower = new AvatarBodyFollower({ avatar, calibrationFrames: 1, smoothingLambda: 1000, lateralScale: 0.8 });
  follower.observe(frame());
  follower.observe(frame({ x: 0.65 }));
  follower.apply(1);
  assert.ok(avatar.position.x < 0, "mirrored-image input should drive mirror-direction root travel");
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
  follower.observe(frame({ timestamp: now }));
  follower.observe(frame({ x: 0.65, timestamp: now }));
  assert.notEqual(follower.targetLateral, 0);
  now = 1200;
  follower.markMissing(now);
  follower.apply(1);
  assert.ok(Math.abs(avatar.position.x) < 1e-6);
});

test("guided calibration waits for full-body framing and speaks framing prompts", () => {
  let now = 0;
  const cues = [];
  const calibration = new AvatarMirrorCalibration({ now: () => now, speak: text => cues.push(text), stableFrames: 2, promptIntervalMs: 1000, settleMs: 100, countdownStepMs: 100, baseHoldMs: 100 });
  calibration.observe(frame({ fullBody: false, timestamp: now }), now);
  assert.equal(calibration.state, "FRAMING");
  assert.match(cues[0], /Step back/);
  now = 1000; calibration.observe(frame({ fullBody: false, timestamp: now }), now);
  assert.equal(cues.filter(cue => /Step back/.test(cue)).length, 2);
  now = 2000; calibration.observe(frame({ fullBody: false, timestamp: now }), now);
  assert.match(cues.at(-1), /resume when you're in position/);
});

test("guided calibration performs settle, 3-2-1-hold, capture, then ready", () => {
  let now = 0;
  const cues = [];
  const calibration = new AvatarMirrorCalibration({ now: () => now, speak: text => cues.push(text), stableFrames: 1, settleMs: 100, countdownStepMs: 100, baseHoldMs: 100 });
  calibration.observe(frame({ timestamp: now }), now);
  assert.equal(calibration.state, "SETTLING");
  now = 100; calibration.observe(frame({ timestamp: now }), now);
  assert.equal(calibration.state, "COUNTDOWN");
  now = 200; calibration.observe(frame({ timestamp: now }), now);
  now = 300; calibration.observe(frame({ timestamp: now }), now);
  now = 400; assert.equal(calibration.observe(frame({ timestamp: now }), now), true);
  assert.equal(calibration.state, "CAPTURING");
  assert.equal(calibration.captureEnabled(), true);
  now = 500; calibration.observe(frame({ timestamp: now }), now);
  assert.equal(calibration.state, "READY");
  assert.equal(calibration.ready(), true);
  assert.ok(cues.some(cue => /Taking your base position in 3/.test(cue)));
  assert.ok(cues.includes("2."));
  assert.ok(cues.includes("1."));
  assert.ok(cues.includes("Hold."));
  assert.ok(cues.some(cue => /Base position set/.test(cue)));
});

test("live mirror strengthens canonical vertical root travel for squat and floor transitions", () => {
  assert.equal(LIVE_SOLVER_DEFAULTS.rootTranslationScale, 0.9);
  assert.equal(LIVE_SOLVER_DEFAULTS.rootTranslationClamp, 0.75);
  assert.ok(LIVE_SOLVER_DEFAULTS.rootTranslationScale > 0.45);
  assert.ok(LIVE_SOLVER_DEFAULTS.rootTranslationClamp > 0.38);
});

test("defaults keep lateral body following bounded for live camera mirroring", () => {
  assert.ok(BODY_FOLLOW_DEFAULTS.lateralClamp > 0 && BODY_FOLLOW_DEFAULTS.lateralClamp <= 1);
  assert.equal(BODY_FOLLOW_DEFAULTS.lateralDirection, -1);
  assert.ok(BODY_FOLLOW_DEFAULTS.minimumConfidence >= 0.3);
});
