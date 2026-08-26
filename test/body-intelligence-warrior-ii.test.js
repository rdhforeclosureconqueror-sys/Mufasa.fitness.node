"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../public/body-intelligence");
const definition = require("../data/movements/warrior-ii.v1.json");

function target(overrides = {}, confidence = 0.99) {
  const points = definition.phases[0].targetBodyFrame.landmarks;
  return engine.adaptMoveNet(engine.MOVENET_NAMES.map((name) => ({ name, x: (overrides[name] || points[name] || [.5,.1])[0], y: (overrides[name] || points[name] || [.5,.1])[1], score: confidence })), { timestamp: 10 });
}

test("MoveNet provider adapter produces a normalized canonical BodyFrame", () => {
  const frame = engine.adaptMoveNet([{ name: "left_knee", x: 80, y: 25, score: .8 }], { width: 100, height: 50, timestamp: 7 });
  assert.deepEqual(frame.landmarks.left_knee, { x: .8, y: .5, z: 0, confidence: .8 });
  assert.equal(frame.timestamp, 7); assert.equal(frame.coordinateSpace, "viewport_normalized");
});
test("mirrored provider input resolves anatomical sides", () => {
  const frame = engine.adaptMoveNet([{ name: "left_knee", x: .2, y: .5, score: 1 }], { mirrored: true });
  assert.equal(frame.landmarks.right_knee.x, .2); assert.equal(frame.landmarks.left_knee, undefined);
});
test("Warrior II target lookup drives the avatar adapter", () => {
  const targetFrame = engine.targetBodyFrame(definition); const avatar = engine.avatarPose(definition);
  assert.equal(targetFrame.landmarks.left_knee.x, avatar.landmarks.left_knee.x);
  assert.ok(avatar.bones.some((bone) => bone.from === "left_hip" && bone.to === "left_knee"));
});
test("correct Warrior II passes shared rules", () => {
  const result = engine.evaluateMovement(definition, target());
  assert.equal(result.status, "aligned"); assert.deepEqual(result.feedback, []);
});
test("incorrect knee angle returns one prioritized meaningful cue", () => {
  const result = engine.evaluateMovement(definition, target({ left_ankle: [.48,.88] }));
  assert.equal(result.status, "needs_adjustment"); assert.equal(result.failures[0].ruleId, "front-knee-angle"); assert.match(result.feedback[0], /knee/i);
});
test("incorrect arm alignment is detected and feedback is capped", () => {
  const result = engine.evaluateMovement(definition, target({ left_wrist: [.14,.48], right_wrist: [.86,.48], left_elbow: [.25,.42], right_elbow: [.75,.42] }));
  assert.ok(result.failures.some((fault) => fault.ruleId === "arms-level")); assert.ok(result.feedback.length <= 2);
});
test("missing and low-confidence landmarks suppress corrective coaching", () => {
  const missing = engine.evaluateMovement(definition, engine.adaptMoveNet([]));
  const low = engine.evaluateMovement(definition, target({}, .1));
  assert.equal(missing.status, "insufficient_data"); assert.deepEqual(missing.feedback, []); assert.equal(low.status, "insufficient_data");
});
test("temporal hold pauses and resets after configurable instability", () => {
  const tracker = engine.createHoldTracker({ targetMs: 2000, graceMs: 100, majorFaultResetMs: 300 });
  const good = { aligned: true }, bad = { aligned: false };
  tracker.update(good, 0); assert.equal(tracker.update(good, 500).elapsedMs, 500);
  assert.equal(tracker.update(bad, 600).paused, false); assert.equal(tracker.update(bad, 750).paused, true);
  assert.equal(tracker.update(bad, 950).elapsedMs, 0);
});
test("camera-disabled Yoga contract remains independent from analysis", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "../public/yoga/yoga.js"), "utf8");
  assert.match(source, /camera-disabled/); assert.match(source, /currentResult\?\.score \?\? null/);
});
