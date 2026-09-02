(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTLungeMotionSpec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CANONICAL_BONES = Object.freeze([
    "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1",
    "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot", "mixamorig:LeftToeBase",
    "mixamorig:RightUpLeg", "mixamorig:RightLeg", "mixamorig:RightFoot", "mixamorig:RightToeBase"
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
        target("mixamorig:LeftUpLeg", [pose.leftThigh, 0, 0]),
        target("mixamorig:LeftLeg", [pose.leftKnee, 0, 0]),
        target("mixamorig:LeftFoot", [pose.leftAnkle, 0, 0]),
        target("mixamorig:RightUpLeg", [pose.rightThigh, 0, 0]),
        target("mixamorig:RightLeg", [pose.rightKnee, 0, 0]),
        target("mixamorig:RightFoot", [pose.rightAnkle, 0, 0])
      ]),
      contacts: Object.freeze(["left_front_foot", "right_rear_forefoot"]),
      ...extra
    });
  }

  // V2 keeps the front-leg geometry that passed owner visual review and changes the rear chain.
  // Start: rear leg is longer/straighter so the right toe can establish on the ground plane.
  // Bottom: rear femur becomes more vertical while the rear knee flexes toward ~90°, driving the knee down instead of swinging the foot up.
  const SPLIT_START = Object.freeze({
    hipPitch: 2, spinePitch: -1, spine1Pitch: 0,
    leftThigh: 24, leftKnee: -16, leftAnkle: 7,
    rightThigh: -30, rightKnee: -6, rightAnkle: -2
  });
  const MID = Object.freeze({
    hipPitch: 4, spinePitch: -2, spine1Pitch: -1,
    leftThigh: 42, leftKnee: -50, leftAnkle: 13,
    rightThigh: -18, rightKnee: -48, rightAnkle: -6
  });
  const BOTTOM = Object.freeze({
    hipPitch: 6, spinePitch: -3, spine1Pitch: -1,
    leftThigh: 60, leftKnee: -82, leftAnkle: 18,
    rightThigh: -8, rightKnee: -94, rightAnkle: -8
  });

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "stationary_lunge_left",
    motionId: "lunge/stationary_left_synthesized_engineering_v2_rear_toe_grounded",
    displayName: "Synthesized Stationary Left Lunge Engineering Reference v2 — Rear Toe Grounded",
    version: 2,
    status: "development-test-only",
    sourceManifest: "/motion-sources/stationary-lunge-left-synthesis-v1.source.json",
    movementContractRef: "/motion/contracts/stationary-lunge-left.v1.json",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 3.4,
    loop: true,
    movementContract: Object.freeze({
      style: "stationary split-stance lunge; left foot forward",
      startAndFinish: "same stable split stance",
      frontKneeBottomInsideAngleTargetDegrees: 90,
      rearKneeBottomInsideAngleTargetDegrees: 90,
      descentIntent: "lower the pelvis mostly vertically between the front whole-foot and grounded right rear forefoot",
      rearKneeIntent: "right rear knee travels down toward the floor while the right toe/ball of foot remains planted",
      rearContactIntent: "right toe base stays on the floor; rear heel may rise",
      torsoIntent: "remain tall with only small balance lean",
      armsPriority: "secondary-after-lower-body-approval"
    }),
    groundingPolicy: Object.freeze({
      mode: "split-stance-front-foot-rear-forefoot-anchor-lock",
      contacts: Object.freeze(["left_front_foot", "right_rear_forefoot"]),
      contactBones: Object.freeze({
        left_front_foot: "mixamorig:LeftFoot",
        right_rear_forefoot: "mixamorig:RightToeBase"
      }),
      enforceContactAnchors: true,
      anchorPhaseId: "start",
      anchorValidity: Object.freeze({
        requiredGroundContacts: Object.freeze(["left_front_foot", "right_rear_forefoot"]),
        rejectAirborneRearToe: true,
        reviewRule: "Do not approve if the authored start pose establishes the right rear toe above the front-foot ground plane."
      }),
      rule: "Capture anchors from a valid split-stance start pose. Preserve the left whole foot and right toe/forefoot while the right rear knee descends toward the floor."
    }),
    synthesisBoundary: Object.freeze({
      method: "movement-lego-composition-with-split-stance-contact-constraints",
      copiedNamedLungeAnimation: false,
      sourcePrimitives: Object.freeze(["split_stance", "asymmetric_leg_loading", "bilateral_knee_flexion_extension", "rear_knee_descent", "root_descent_rise", "stable_ground_contact"]),
      evidenceReferences: Object.freeze([
        "/motion-sources/crouched-sneaking-left-reference.source.json",
        "/motion-sources/kettlebell-swing-reference.source.json",
        "/motion/transition-profiles/stand-to-plank.v1.json"
      ]),
      evidenceCaution: "The crouched-sneaking source is candidate split-stance evidence only and is explicitly not a canonical lunge. This motion is synthesized from neutral mechanics and coaching constraints.",
      unsupported: Object.freeze(["biomechanical ground truth", "production scoring thresholds", "individual anthropometric fit", "medical diagnosis"])
    }),
    phaseOrder: Object.freeze(["start", "descent", "bottom", "ascent", "finish"]),
    phases: Object.freeze([
      phase("start", "position", 0, [0, 0, 0], SPLIT_START),
      phase("descent", "eccentric", 0.25, [0, -0.09, 0], MID),
      phase("bottom", "isometric", 0.5, [0, -0.22, 0], BOTTOM, { holdDurationSeconds: 0.25 }),
      phase("ascent", "concentric", 0.75, [0, -0.09, 0], MID),
      phase("finish", "completion", 1, [0, 0, 0], SPLIT_START)
    ])
  });

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [];
    const bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId", "motionId", "version", "skeleton", "durationSeconds", "phases", "phaseOrder", "movementContractRef"]) if (candidate[field] == null) errors.push(`${field} is required`);
    if (!(candidate.durationSeconds > 0)) errors.push("durationSeconds must be positive");
    if (!candidate.groundingPolicy?.enforceContactAnchors) errors.push("lunge requires contact-anchor enforcement");
    if (candidate.groundingPolicy?.anchorPhaseId !== "start") errors.push("lunge contact anchors must be established from authored split-stance start phase");
    if (!candidate.groundingPolicy?.anchorValidity?.rejectAirborneRearToe) errors.push("lunge must reject an airborne rear-toe start anchor");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [];
    const ids = phases.map(item => item.id);
    if (JSON.stringify(ids) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("phaseOrder must match phases");
    let previous = -1;
    for (const item of phases) {
      if (!Number.isFinite(item.normalizedTime) || item.normalizedTime <= previous || item.normalizedTime < 0 || item.normalizedTime > 1) errors.push(`invalid normalized time for ${item.id}`);
      previous = item.normalizedTime;
      for (const boneTarget of item.boneTargets || []) if (!bones.has(boneTarget.bone)) errors.push(`unknown bone target ${boneTarget.bone}`);
      if (JSON.stringify(item.contacts || []) !== JSON.stringify(["left_front_foot", "right_rear_forefoot"])) errors.push(`split-stance contacts required for ${item.id}`);
    }
    if (phases[0]?.normalizedTime !== 0 || phases.at(-1)?.normalizedTime !== 1) errors.push("motion must span normalized time 0 through 1");
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function summary(candidate = spec) {
    const bottom = candidate.phases.find(item => item.id === "bottom");
    return Object.freeze({
      motionId: candidate.motionId,
      version: candidate.version,
      status: candidate.status,
      durationSeconds: candidate.durationSeconds,
      phaseOrder: Object.freeze(candidate.phaseOrder.slice()),
      bottomRootDropAvatarHeights: Math.abs(bottom?.root?.positionOffset?.[1] || 0),
      frontKneeTargetDegrees: candidate.movementContract.frontKneeBottomInsideAngleTargetDegrees,
      rearKneeTargetDegrees: candidate.movementContract.rearKneeBottomInsideAngleTargetDegrees,
      groundingMode: candidate.groundingPolicy.mode,
      anchorPhaseId: candidate.groundingPolicy.anchorPhaseId,
      rejectsAirborneRearToeAnchor: candidate.groundingPolicy.anchorValidity.rejectAirborneRearToe,
      evidenceOnly: true,
      requiresHumanMoveNetReview: true
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});
