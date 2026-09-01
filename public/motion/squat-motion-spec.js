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
  const target = (bone, rotationOffsetEulerDegrees) => Object.freeze({
    bone,
    rotationOffsetEulerDegrees: freezeVec(rotationOffsetEulerDegrees)
  });

  function phase(id, kind, normalizedTime, rootPosition, pose, extra = {}) {
    return Object.freeze({
      id,
      kind,
      normalizedTime,
      interpolation: "quaternion_slerp",
      root: Object.freeze({
        positionOffset: freezeVec(rootPosition),
        positionUnit: "avatar_height",
        rotationOffsetEulerDegrees: freezeVec([0, 0, 0])
      }),
      boneTargets: Object.freeze([
        target("mixamorig:Hips", [pose.hipPitch, 0, 0]),
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
    hipPitch: 10, spinePitch: -5, spine1Pitch: -3,
    thighPitch: -32, thighOut: 5, kneeFlex: 38, anklePitch: -5, armPitch: -18
  });
  const BOTTOM = Object.freeze({
    hipPitch: 18, spinePitch: -9, spine1Pitch: -5,
    thighPitch: -62, thighOut: 8, kneeFlex: 78, anklePitch: -10, armPitch: -32
  });

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "bodyweight_squat",
    motionId: "squat/synthesized_engineering_v1",
    displayName: "Synthesized Bodyweight Squat Engineering Reference v1",
    version: 1,
    status: "development-test-only",
    sourceManifest: "/motion-sources/squat-synthesis-v1.source.json",
    skeleton: Object.freeze({
      id: "canonical_phase_e_mixamo",
      rootBone: "mixamorig:Hips",
      rotationSpace: "rest_relative_local"
    }),
    durationSeconds: 3.2,
    loop: true,
    synthesisBoundary: Object.freeze({
      method: "movement-lego-composition",
      copiedNamedSquatAnimation: false,
      sourcePrimitives: Object.freeze([
        "standing",
        "crouch",
        "hip_hinge",
        "bilateral_knee_flexion_extension",
        "root_descent_rise",
        "standing_reacquisition"
      ]),
      evidenceReferences: Object.freeze([
        "/motion/transition-profiles/stand-to-plank.v1.json",
        "/motion-sources/crouched-sneaking-left-reference.source.json",
        "/motion-sources/kettlebell-swing-reference.source.json",
        "/motion-sources/jumping-up-reference.source.json",
        "/motion-sources/hard-landing-reference.source.json"
      ]),
      values: "Rest-relative engineering offsets synthesized from reviewed movement relationships; values are intentionally conservative and require avatar plus human MoveNet review.",
      unsupported: Object.freeze([
        "biomechanical ground truth",
        "joint torque",
        "force",
        "metric joint centers",
        "medical guidance",
        "scoring tolerances",
        "coaching thresholds",
        "individual anthropometric fit"
      ])
    }),
    phaseOrder: Object.freeze(["start", "descent", "bottom", "ascent", "finish"]),
    phases: Object.freeze([
      phase("start", "position", 0, [0, 0, 0], STAND),
      phase("descent", "eccentric", 0.25, [0, -0.14, -0.025], MID),
      phase("bottom", "isometric", 0.5, [0, -0.28, -0.055], BOTTOM, { holdDurationSeconds: 0.15 }),
      phase("ascent", "concentric", 0.75, [0, -0.14, -0.025], MID),
      phase("finish", "completion", 1, [0, 0, 0], STAND)
    ])
  });

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [];
    const bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") {
      return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    }
    for (const field of ["exerciseId", "motionId", "version", "skeleton", "durationSeconds", "phases", "phaseOrder"]) {
      if (candidate[field] == null) errors.push(`${field} is required`);
    }
    if (!(candidate.durationSeconds > 0)) errors.push("durationSeconds must be positive");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [];
    const ids = phases.map(item => item.id);
    if (new Set(ids).size !== ids.length) errors.push("phase ids must be unique");
    if (JSON.stringify(ids) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("phaseOrder must match phases");
    let previous = -1;
    for (const item of phases) {
      if (!Number.isFinite(item.normalizedTime) || item.normalizedTime < 0 || item.normalizedTime > 1 || item.normalizedTime <= previous) {
        errors.push(`invalid normalized time for ${item.id}`);
      }
      previous = item.normalizedTime;
      if (!Array.isArray(item.root?.positionOffset) || item.root.positionOffset.length !== 3) errors.push(`invalid root offset for ${item.id}`);
      for (const boneTarget of item.boneTargets || []) {
        if (!bones.has(boneTarget.bone)) errors.push(`unknown bone target ${boneTarget.bone}`);
      }
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
      evidenceOnly: true,
      requiresHumanMoveNetReview: true
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});
