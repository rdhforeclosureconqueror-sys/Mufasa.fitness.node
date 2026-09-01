(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTSquatMotionSpec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CANONICAL_BONES = Object.freeze([
    "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2", "mixamorig:Neck", "mixamorig:Head",
    "mixamorig:LeftShoulder", "mixamorig:LeftArm", "mixamorig:LeftForeArm", "mixamorig:LeftHand",
    "mixamorig:RightShoulder", "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand",
    "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot",
    "mixamorig:RightUpLeg", "mixamorig:RightLeg", "mixamorig:RightFoot"
  ]);

  const freezeVec = values => Object.freeze(values.slice());
  const target = (bone, rotationOffsetEulerDegrees) => Object.freeze({ bone, rotationOffsetEulerDegrees: freezeVec(rotationOffsetEulerDegrees) });

  function phase(id, kind, normalizedTime, rootPosition, pose, extra = {}) {
    return Object.freeze({
      id,
      kind,
      normalizedTime,
      interpolation: "quaternion_slerp",
      root: Object.freeze({
        positionOffset: freezeVec(rootPosition),
        positionUnit: "avatar_height",
        rotationOffsetEulerDegrees: freezeVec([pose.hipPitch, 0, 0])
      }),
      boneTargets: Object.freeze([
        target("mixamorig:Spine", [pose.spinePitch, 0, 0]),
        target("mixamorig:Spine1", [pose.spine1Pitch, 0, 0]),
        target("mixamorig:LeftUpLeg", [pose.thighPitch, 0, pose.thighOut]),
        target("mixamorig:RightUpLeg", [pose.thighPitch, 0, -pose.thighOut]),
        target("mixamorig:LeftLeg", [pose.kneeFlex, 0, 0]),
        target("mixamorig:RightLeg", [pose.kneeFlex, 0, 0]),
        target("mixamorig:LeftFoot", [pose.anklePitch, 0, 0]),
        target("mixamorig:RightFoot", [pose.anklePitch, 0, 0]),
        target("mixamorig:LeftArm", [pose.armPitch, 0, -8]),
        target("mixamorig:RightArm", [pose.armPitch, 0, 8])
      ]),
      contacts: Object.freeze(["left_foot", "right_foot"]),
      ...extra
    });
  }

  const STAND = Object.freeze({
    hipPitch: 0, spinePitch: 0, spine1Pitch: 0,
    thighPitch: 0, thighOut: 2, kneeFlex: 0, anklePitch: 0, armPitch: 0
  });
  const MID = Object.freeze({
    hipPitch: 12, spinePitch: -6, spine1Pitch: -3,
    thighPitch: 40, thighOut: 2, kneeFlex: -52, anklePitch: 21, armPitch: -18
  });
  const BOTTOM = Object.freeze({
    hipPitch: 24, spinePitch: -11, spine1Pitch: -6,
    thighPitch: 78, thighOut: 2, kneeFlex: -102, anklePitch: 44, armPitch: -32
  });

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "bodyweight_squat",
    motionId: "squat/synthesized_engineering_v3_90deg_groundlock",
    displayName: "Synthesized Bodyweight Squat Engineering Reference v3 — 90° Ground Lock",
    version: 3,
    status: "development-test-only",
    sourceManifest: "/motion-sources/squat-synthesis-v1.source.json",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 3.2,
    loop: true,
    movementContract: Object.freeze({
      stance: "bilateral approximately shoulder-width",
      standingKneeInsideAngleTargetDegrees: 180,
      bottomKneeInsideAngleTargetDegrees: 90,
      bottomKneeInsideAngleToleranceDegrees: 8,
      descentIntent: "pelvis descends and shifts slightly posterior as if sitting into a chair",
      ascentIntent: "pelvis rises while hips and knees extend back to standing",
      armsPriority: "secondary-after-lower-body-approval"
    }),
    groundingPolicy: Object.freeze({
      mode: "dual-foot-planted-runtime-anchor-lock",
      contacts: Object.freeze(["left_foot", "right_foot"]),
      contactBones: Object.freeze({ left_foot: "mixamorig:LeftFoot", right_foot: "mixamorig:RightFoot" }),
      enforceContactAnchors: true,
      sourceReference: "/motion-sources/kettlebell-swing-reference.source.json",
      rule: "Both foot/ankle anchors remain fixed through descent, bottom, ascent and finish; no flight or takeoff is permitted.",
      implementation: "The motion compiler converts avatar-height root offsets from world space into the rotated/scaled armature parent and then solves a root correction at each phase so the bilateral foot anchors remain at their standing world positions."
    }),
    synthesisBoundary: Object.freeze({
      method: "movement-lego-composition-with-hard-contact-constraints",
      copiedNamedSquatAnimation: false,
      sourcePrimitives: Object.freeze(["standing", "dual_foot_ground_contact", "stable_stance", "hip_hinge", "crouch", "bilateral_knee_flexion_extension", "root_descent_rise", "standing_reacquisition"]),
      evidenceReferences: Object.freeze([
        "/motion/transition-profiles/stand-to-plank.v1.json",
        "/motion-sources/crouched-sneaking-left-reference.source.json",
        "/motion-sources/kettlebell-swing-reference.source.json",
        "/motion-sources/jumping-up-reference.source.json",
        "/motion-sources/hard-landing-reference.source.json"
      ]),
      revisionReason: "Independent review of v2 measured an approximately 113-degree bottom knee angle and about 14 cm of ankle rise. v3 deepens the lower-body target toward 90 degrees and upgrades planted feet from descriptive metadata to an enforced compile-time contact constraint.",
      values: "Engineering targets for the shipped Phase E reference skeleton. Exact visual acceptance still requires side-view human review; these are not product scoring thresholds.",
      unsupported: Object.freeze(["biomechanical ground truth", "joint torque", "force", "medical guidance", "production scoring tolerances", "individual anthropometric fit"])
    }),
    phaseOrder: Object.freeze(["start", "descent", "bottom", "ascent", "finish"]),
    phases: Object.freeze([
      phase("start", "position", 0, [0, 0, 0], STAND),
      phase("descent", "eccentric", 0.25, [0, -0.08, -0.035], MID),
      phase("bottom", "isometric", 0.5, [0, -0.22, -0.075], BOTTOM, { holdDurationSeconds: 0.2 }),
      phase("ascent", "concentric", 0.75, [0, -0.08, -0.035], MID),
      phase("finish", "completion", 1, [0, 0, 0], STAND)
    ])
  });

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [];
    const bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId", "motionId", "version", "skeleton", "durationSeconds", "phases", "phaseOrder"]) if (candidate[field] == null) errors.push(`${field} is required`);
    if (!(candidate.durationSeconds > 0)) errors.push("durationSeconds must be positive");
    if (!candidate.groundingPolicy?.enforceContactAnchors) errors.push("squat requires enforced dual-foot contact anchors");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [];
    const ids = phases.map(item => item.id);
    if (new Set(ids).size !== ids.length) errors.push("phase ids must be unique");
    if (JSON.stringify(ids) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("phaseOrder must match phases");
    let previous = -1;
    for (const item of phases) {
      if (!Number.isFinite(item.normalizedTime) || item.normalizedTime < 0 || item.normalizedTime > 1 || item.normalizedTime <= previous) errors.push(`invalid normalized time for ${item.id}`);
      previous = item.normalizedTime;
      if (!Array.isArray(item.root?.positionOffset) || item.root.positionOffset.length !== 3) errors.push(`invalid root offset for ${item.id}`);
      for (const boneTarget of item.boneTargets || []) if (!bones.has(boneTarget.bone)) errors.push(`unknown bone target ${boneTarget.bone}`);
      if (JSON.stringify(item.contacts || []) !== JSON.stringify(["left_foot", "right_foot"])) errors.push(`dual-foot contact required for ${item.id}`);
    }
    if (phases[0]?.normalizedTime !== 0 || phases.at(-1)?.normalizedTime !== 1) errors.push("motion must span normalized time 0 through 1");
    if (!bones.has(candidate.skeleton?.rootBone)) errors.push(`unknown root bone ${candidate.skeleton?.rootBone}`);
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function summary(candidate = spec) {
    const bottom = candidate.phases.find(item => item.id === "bottom");
    return Object.freeze({
      motionId: candidate.motionId,
      status: candidate.status,
      durationSeconds: candidate.durationSeconds,
      phaseOrder: Object.freeze(candidate.phaseOrder.slice()),
      bottomRootDropAvatarHeights: Math.abs(bottom?.root?.positionOffset?.[1] || 0),
      targetBottomKneeInsideAngleDegrees: candidate.movementContract?.bottomKneeInsideAngleTargetDegrees || null,
      groundingMode: candidate.groundingPolicy?.mode || null,
      contactAnchorsEnforced: Boolean(candidate.groundingPolicy?.enforceContactAnchors),
      evidenceOnly: true,
      requiresHumanMoveNetReview: true
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});
