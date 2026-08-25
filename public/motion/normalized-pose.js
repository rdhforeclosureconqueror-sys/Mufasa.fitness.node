(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTNormalizedPose = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const MIN_SEGMENT_LENGTH = 1e-4;

  function pointByName(posePacket, name) {
    return (posePacket?.keypoints || []).find(point => (point?.name || point?.part) === name) || null;
  }

  function normalizedPoint(point, width, height) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !(width > 0) || !(height > 0)) return null;
    return Object.freeze({
      x: Math.max(0, Math.min(1, point.x / width)),
      y: Math.max(0, Math.min(1, point.y / height)),
      z: null,
      confidence: Math.max(0, Math.min(1, Number(point.score) || 0))
    });
  }

  function fromMoveNetPosePacket(posePacket, options = {}) {
    const width = Number(posePacket?.video?.width || options.width || 0);
    const height = Number(posePacket?.video?.height || options.height || 0);
    const rightShoulder = normalizedPoint(pointByName(posePacket, "right_shoulder"), width, height);
    const rightElbow = normalizedPoint(pointByName(posePacket, "right_elbow"), width, height);
    let rightUpperArmDirection = null;
    if (rightShoulder && rightElbow) {
      // MoveNet is asked for horizontally flipped output, matching the mirrored selfie
      // presentation. Anatomical labels remain authoritative; only image Y is inverted.
      // Derive direction from source pixels so a non-square video does not distort
      // the segment angle after independently normalizing X and Y to [0, 1].
      const x = (rightElbow.x - rightShoulder.x) * width;
      const y = (rightShoulder.y - rightElbow.y) * height;
      const length = Math.hypot(x, y);
      if (length >= MIN_SEGMENT_LENGTH) rightUpperArmDirection = Object.freeze({ x: x / length, y: y / length, z: 0 });
    }
    const jointScores = [rightShoulder?.confidence, rightElbow?.confidence].filter(Number.isFinite);
    const overall = Number.isFinite(posePacket?.pose?.score)
      ? Math.max(0, Math.min(1, Number(posePacket.pose.score)))
      : jointScores.length ? Math.min(...jointScores) : 0;
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      timestamp: Number(posePacket?.at || options.timestamp || Date.now()),
      confidence: Object.freeze({ overall, bodyDetected: Boolean(rightShoulder && rightElbow && Math.min(rightShoulder.confidence, rightElbow.confidence) >= 0.3) }),
      rightShoulder,
      rightElbow,
      rightUpperArmDirection,
      coordinates: Object.freeze({ space: "mirrored-image-normalized", origin: "top-left", xAxis: "image-right", yAxis: "anatomical-up", zAxis: "unsupported", depth: "2d-only" }),
      source: Object.freeze({ detector: "MoveNet.SinglePose.Lightning", packageVersion: "2.1.3", flipHorizontal: true, cameraFacing: options.cameraFacing || "unknown", previewMirrored: Boolean(options.previewMirrored) })
    });
  }

  return Object.freeze({ SCHEMA_VERSION, MIN_SEGMENT_LENGTH, fromMoveNetPosePacket });
});
