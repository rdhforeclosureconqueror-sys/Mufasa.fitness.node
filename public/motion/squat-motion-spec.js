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

  // v5 lower-body values are derived from the uploaded Back Squat FBX by subtracting
  // its standing-frame rotations from the corresponding descent/bottom rotations.
  // The arms remain deliberately secondary until the lower body is owner-approved.
  const MID = Object.freeze({
    hipPitch: 14, spinePitch: 2, spine1Pitch: 1,
    thighPitch: 61, thighOut: 2, kneeFlex: -77, anklePitch: 30, armPitch: -18
  });
  const BOTTOM = Object.freeze({
    hipPitch: 9, spinePitch: 15, spine1Pitch: 5,
    thighPitch: 108, thighOut: 2, kneeFlex: -132, anklePitch: 35, armPitch: -32
  });

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "bodyweight_squat",
    motionId: "squat/synthesized_engineering_v5_back_squat_reference",
    displayName: "Synthesized Bodyweight Squat Engineering Reference v5 — Back Squat Mechanics",
    version: 5,
    status: "development-test-only",
    sourceManifest: "/motion-sources/squat-synthesis-v1.source.json",
    movementContractRef: "/motion/contracts/bodyweight-squat.v1.json",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 2.2666666667,
    loop: true,
    movementContract: Object.freeze({
      stance: "bilateral approximately shoulder-width",
      standingKneeInsideAngleTargetDegrees: 180,
      bottomKneeInsideAngleTargetDegrees: 90,
      bottomKneeInsideAngleToleranceDegrees: 8,
      descentIntent: "feet stay planted while pelvis descends and moves posteriorly like sitting into a chair",
      ascentIntent: "pelvis rises and returns toward standing while hips, knees, and ankles reverse the same coordinated chain",
      kneeTrackingIntent: "knees track with the feet while depth comes from coordinated hip, knee, and ankle motion rather than knee translation alone",
      armsPriority: "secondary-after-lower-body-approval"
    }),
    referenceGeometryPolicy: Object.freeze({
      mode: "source-derived-back-squat-plus-runtime-grounding",
      source: "/motion/contracts/bodyweight-squat.v1.json",
      mechanicsSource: "/motion-sources/back-squat-reference.source.json",
      requiredMeasuredChecks: Object.freeze(["posterior_pelvis_travel", "reference_knee_forward_envelope", "pelvis_posterior_to_knee", "dual_foot_contact"]),
      rule: "Use the extracted Back Squat hip/knee/ankle coordination as the primary lower-body shape while runtime grounding remains authoritative for foot contact."
    }),
    groundingPolicy: Object.freeze({
      mode: "dual-foot-planted-runtime-anchor-lock",
      contacts: Object.freeze(["left_foot", "right_foot"]),
      contactBones: Object.freeze({ left_foot: "mixamorig:LeftFoot", right_foot: "mixamorig:RightFoot" }),
      enforceContactAnchors: true,
      sourceReference: "/motion-sources/back-squat-reference.source.json",
      rule: "Both foot/ankle anchors remain fixed through descent, bottom, ascent and finish; no flight or takeoff is permitted.",
      implementation: "The motion compiler converts avatar-height root offsets into the armature parent and applies per-phase root correction against the bilateral foot anchors."
    }),
    synthesisBoundary: Object.freeze({
      method: "movement-lego-composition-rebased-on-extracted-back-squat-mechanics",
      copiedNamedSquatAnimation: false,
      directBinaryPlayback: false,
      sourcePrimitives: Object.freeze(["standing", "dual_foot_ground_contact", "stable_stance", "hip_hinge", "posterior_pelvis_shift", "crouch", "bilateral_knee_flexion_extension", "ankle_dorsiflexion", "root_descent_rise", "standing_reacquisition"]),
      evidenceReferences: Object.freeze([
        "/motion-sources/back-squat-reference.source.json",
        "/motion-sources/kettlebell-swing-reference.source.json",
        "/motion/transition-profiles/stand-to-plank.v1.json"
      ]),
      revisionReason: "Owner supplied a complete Back Squat FBX after v4 had been synthesized from partial evidence. v5 uses the source clip's measured standing-to-mid and standing-to-bottom lower-body deltas: approximately +61/+108 thigh flexion, -77/-132 knee rotation, +30/+35 ankle rotation, a deeper root descent, and a smaller source-derived posterior shift. This replaces repeated visual guesswork with a full squat-cycle mechanics reference while preserving PocketPT contact rules.",
      values: "Engineering translation of one reference clip onto the shipped Phase E skeleton. Runtime and human visual acceptance remain required.",
      unsupported: Object.freeze(["biomechanical ground truth", "joint torque", "force", "medical guidance", "universal knees-behind-toes rule", "production scoring tolerances", "individual anthropometric fit"])
    }),
    phaseOrder: Object.freeze(["start", "descent", "bottom", "ascent", "finish"]),
    phases: Object.freeze([
      phase("start", "position", 0, [0, 0, 0], STAND),
      phase("descent", "eccentric", 0.28, [0, -0.115, -0.050], MID),
      phase("bottom", "isometric", 0.56, [0, -0.310, -0.080], BOTTOM, { holdDurationSeconds: 0.12 }),
      phase("ascent", "concentric", 0.78, [0, -0.128, -0.054], MID),
      phase("finish", "completion", 1, [0, 0, 0], STAND)
    ])
  });

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [];
    const bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId", "motionId", "version", "skeleton", "durationSeconds", "phases", "phaseOrder", "movementContractRef", "referenceGeometryPolicy"]) if (candidate[field] == null) errors.push(`${field} is required`);
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
      bottomPosteriorRootTravelAvatarHeights: Math.abs(bottom?.root?.positionOffset?.[2] || 0),
      targetBottomKneeInsideAngleDegrees: candidate.movementContract?.bottomKneeInsideAngleTargetDegrees || null,
      groundingMode: candidate.groundingPolicy?.mode || null,
      contactAnchorsEnforced: Boolean(candidate.groundingPolicy?.enforceContactAnchors),
      referenceGeometryMode: candidate.referenceGeometryPolicy?.mode || null,
      movementContractRef: candidate.movementContractRef || null,
      mechanicsSource: candidate.referenceGeometryPolicy?.mechanicsSource || null,
      evidenceOnly: true,
      requiresHumanMoveNetReview: true
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});
