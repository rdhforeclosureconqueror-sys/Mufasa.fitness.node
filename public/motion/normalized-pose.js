(function (root, factory) {
  const contract = typeof module === "object" && module.exports ? require('./pose-observation-v2') : root.PocketPTPoseObservationV2;
  const api = factory(contract);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTNormalizedPose = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (contract) {
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

  const JOINT_NAMES = Object.freeze(["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]);
  const SEGMENTS = Object.freeze({
    leftUpperArm: ["left_shoulder", "left_elbow"], rightUpperArm: ["right_shoulder", "right_elbow"],
    leftForearm: ["left_elbow", "left_wrist"], rightForearm: ["right_elbow", "right_wrist"],
    leftThigh: ["left_hip", "left_knee"], rightThigh: ["right_hip", "right_knee"],
    leftLowerLeg: ["left_knee", "left_ankle"], rightLowerLeg: ["right_knee", "right_ankle"]
  });
  function segmentDirection(a, b, width, height) {
    if (!a || !b) return null;
    const x = (b.x - a.x) * width, y = (a.y - b.y) * height;
    const length = Math.hypot(x, y);
    return length >= MIN_SEGMENT_LENGTH ? Object.freeze({ x: x / length, y: y / length, z: 0 }) : null;
  }
  function midpoint(a, b) {
    if (!a || !b) return null;
    return Object.freeze({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: null, confidence: Math.min(a.confidence, b.confidence) });
  }
  function distancePixels(a, b, width, height) {
    return a && b ? Math.hypot((b.x-a.x)*width, (b.y-a.y)*height) : null;
  }
  function fromPosePacket(posePacket, options = {}) {
    const observation = posePacket?.schema?.version === 2 ? posePacket : contract?.fromMoveNet?.(posePacket, options);
    const validation = contract?.validate?.(observation);
    if (validation && !validation.ok) throw new TypeError(`${validation.firstFailure}: ${validation.detail}`);
    const width = Number(posePacket?.video?.width || options.width || 0);
    const height = Number(posePacket?.video?.height || options.height || 0);
    const resolvedWidth = observation?.frame?.width || width;
    const resolvedHeight = observation?.frame?.height || height;
    const joints = Object.fromEntries(JOINT_NAMES.map(name => {
      const point = observation?.landmarks?.[name];
      return [name, point && point.provenance !== 'LOST' ? Object.freeze({ x: point.x, y: point.y, z: point.z, confidence: point.detectorConfidence }) : normalizedPoint(pointByName(posePacket, name), width, height)];
    }));
    const jointEvidence = Object.freeze(Object.fromEntries(JOINT_NAMES.map(name => [name, observation?.landmarks?.[name] || null])));
    const directions = Object.fromEntries(Object.entries(SEGMENTS).map(([name, [a, b]]) => [name, segmentDirection(joints[a], joints[b], resolvedWidth, resolvedHeight)]));
    const shoulderLine = segmentDirection(joints.left_shoulder, joints.right_shoulder, resolvedWidth, resolvedHeight);
    const hipLine = segmentDirection(joints.left_hip, joints.right_hip, resolvedWidth, resolvedHeight);
    const shoulderCenter=midpoint(joints.left_shoulder,joints.right_shoulder),hipCenter=midpoint(joints.left_hip,joints.right_hip),ankleCenter=midpoint(joints.left_ankle,joints.right_ankle);
    const bodyCenter=midpoint(shoulderCenter,hipCenter),torsoAxis=segmentDirection(shoulderCenter,hipCenter,resolvedWidth,resolvedHeight),bodyAxis=torsoAxis;
    const estimatedFootBaseline=ankleCenter?Object.freeze({y:ankleCenter.y,z:null,confidence:ankleCenter.confidence}):null;
    const landmarks=Object.freeze({shoulderCenter,hipCenter,bodyCenter,ankleCenter,estimatedFootBaseline,shoulderLine,hipLine,torsoAxis,bodyAxis,
      bodyHeightPixels:distancePixels(shoulderCenter,ankleCenter,resolvedWidth,resolvedHeight),bodyHeightNormalized:distancePixels(shoulderCenter,ankleCenter,1,1),shoulderWidthPixels:distancePixels(joints.left_shoulder,joints.right_shoulder,resolvedWidth,resolvedHeight),hipWidthPixels:distancePixels(joints.left_hip,joints.right_hip,resolvedWidth,resolvedHeight)});
    const confidences = Object.values(joints).filter(Boolean).map(joint => joint.confidence);
    const overall = Number.isFinite(observation?.confidence?.detector) ? observation.confidence.detector : Number.isFinite(posePacket?.pose?.score) ? Math.max(0, Math.min(1, Number(posePacket.pose.score))) : confidences.length ? Math.min(...confidences) : 0;
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION, poseObservationSchemaVersion: observation?.schema?.version || null, videoWidth: resolvedWidth, videoHeight: resolvedHeight, timestamp: Number(observation?.frame?.timestamp || posePacket?.at || options.timestamp || Date.now()),
      confidence: Object.freeze({ overall, bodyDetected: confidences.some(value => value >= 0.3) }),
      joints: Object.freeze(joints), jointEvidence, directions: Object.freeze({ ...directions, shoulderLine, hipLine, torsoAxis, bodyAxis }), landmarks,
      // Compatibility aliases for the original one-arm proof consumers.
      rightShoulder: joints.right_shoulder, rightElbow: joints.right_elbow, rightUpperArmDirection: directions.rightUpperArm,
      coordinates: Object.freeze({ space: "mirrored-image-normalized", origin: "top-left", xAxis: "image-right", yAxis: "anatomical-up", zAxis: "unsupported", depth: "2d-only" }),
      source: Object.freeze({ detector: observation?.model?.id || "MoveNet.SinglePose.Lightning", packageVersion: observation?.model?.version || "2.1.3", engine: observation?.engine || null, schema: observation?.schema || null, ruleset: observation?.ruleset || null, flipHorizontal: true, cameraFacing: options.cameraFacing || "unknown", previewMirrored: Boolean(options.previewMirrored) })
    });
  }

  const fromMoveNetPosePacket = fromPosePacket;

  return Object.freeze({ SCHEMA_VERSION, MIN_SEGMENT_LENGTH, fromPosePacket, fromMoveNetPosePacket });
});
