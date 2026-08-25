const test = require("node:test");
const assert = require("node:assert/strict");
const pose = require("../public/motion/normalized-pose");

function packet(points, overrides = {}) {
  return { at: 1000, video: { width: 200, height: 100 }, keypoints: points, pose: { keypoints: points, ...overrides } };
}
const point = (name, x, y, score = .9) => ({ name, x, y, score });

test("normalizes the anatomical right shoulder and elbow without inventing depth", () => {
  const frame = pose.fromMoveNetPosePacket(packet([point("right_shoulder", 40, 60), point("right_elbow", 80, 20)]), { cameraFacing: "user", previewMirrored: true });
  assert.deepEqual(frame.rightShoulder, { x: .2, y: .6, z: null, confidence: .9 });
  assert.deepEqual(frame.rightElbow, { x: .4, y: .2, z: null, confidence: .9 });
  assert.ok(Math.abs(frame.rightUpperArmDirection.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(frame.rightUpperArmDirection.y - Math.SQRT1_2) < 1e-12);
  assert.equal(frame.rightUpperArmDirection.z, 0);
  assert.equal(frame.source.flipHorizontal, true);
  assert.equal(frame.source.previewMirrored, true);
});

test("visual selfie mirroring never selects anatomical left landmarks", () => {
  const points = [point("left_shoulder", 190, 90), point("left_elbow", 10, 10), point("right_shoulder", 100, 50), point("right_elbow", 100, 10)];
  const mirrored = pose.fromMoveNetPosePacket(packet(points), { previewMirrored: true });
  const unmirrored = pose.fromMoveNetPosePacket(packet(points), { previewMirrored: false });
  assert.deepEqual(mirrored.rightShoulder, unmirrored.rightShoulder);
  assert.deepEqual(mirrored.rightElbow, unmirrored.rightElbow);
  assert.deepEqual(mirrored.rightUpperArmDirection, { x: 0, y: 1, z: 0 });
});

test("rejects a near-zero shoulder to elbow direction", () => {
  const frame = pose.fromMoveNetPosePacket(packet([point("right_shoulder", 50, 50), point("right_elbow", 50, 50)]));
  assert.equal(frame.rightUpperArmDirection, null);
});
