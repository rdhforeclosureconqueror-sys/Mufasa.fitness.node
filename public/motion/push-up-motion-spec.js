(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTPushUpMotionSpec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CANONICAL_BONES = Object.freeze([
    "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2", "mixamorig:Neck", "mixamorig:Head",
    "mixamorig:LeftShoulder", "mixamorig:LeftArm", "mixamorig:LeftForeArm", "mixamorig:LeftHand",
    "mixamorig:RightShoulder", "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand",
    "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot",
    "mixamorig:RightUpLeg", "mixamorig:RightLeg", "mixamorig:RightFoot"
  ]);
  const phase = (id, kind, time, rootHeight, elbow) => Object.freeze({
    id, kind, normalizedTime: time, interpolation: "quaternion_slerp",
    root: Object.freeze({ positionOffset: Object.freeze([0, rootHeight, 0]), positionUnit: "avatar_height", rotationOffsetEulerDegrees: Object.freeze([0, 0, -90]) }),
    boneTargets: Object.freeze([
      Object.freeze({ bone: "mixamorig:LeftArm", rotationOffsetEulerDegrees: Object.freeze([0, 0, -35]) }),
      Object.freeze({ bone: "mixamorig:RightArm", rotationOffsetEulerDegrees: Object.freeze([0, 0, 35]) }),
      Object.freeze({ bone: "mixamorig:LeftForeArm", rotationOffsetEulerDegrees: Object.freeze([0, elbow, 0]) }),
      Object.freeze({ bone: "mixamorig:RightForeArm", rotationOffsetEulerDegrees: Object.freeze([0, -elbow, 0]) })
    ]),
    contacts: Object.freeze(["left_hand", "right_hand", "left_foot", "right_foot"])
  });
  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "push_up",
    motionId: "push_up_engineering_reference_v1",
    version: 1,
    status: "development-test-only",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 4,
    loop: true,
    timingSource: "manually-authored-even-phase-proof-not-training-cadence",
    authoringBoundary: Object.freeze({
      recognitionSource: "public/exercise-sequence-definitions.js#push_up_standard_v1",
      recognitionValuesUsedAsAnimationRotations: false,
      values: "Manually authored rest-relative engineering offsets for visual verification; not medically or biomechanically authoritative.",
      unsupported: Object.freeze(["joint twist ground truth", "metric root motion", "finger motion", "force", "scoring", "coaching tolerances"])
    }),
    phaseOrder: Object.freeze(["start", "descent", "bottom", "ascent", "finish"]),
    phases: Object.freeze([
      phase("start", "position", 0, 0, 0),
      phase("descent", "eccentric", 0.25, -0.06, 35),
      Object.freeze({ ...phase("bottom", "isometric", 0.5, -0.12, 70), holdDurationSeconds: 0 }),
      phase("ascent", "concentric", 0.75, -0.06, 35),
      phase("finish", "completion", 1, 0, 0)
    ])
  });

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [], bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId", "motionId", "version", "skeleton", "durationSeconds", "phases", "phaseOrder"]) if (candidate[field] == null) errors.push(`${field} is required`);
    if (!(candidate.durationSeconds > 0)) errors.push("durationSeconds must be positive");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [], ids = phases.map(item => item.id);
    if (new Set(ids).size !== ids.length) errors.push("phase ids must be unique");
    if (JSON.stringify(ids) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("phaseOrder must match phases");
    let previous = -1;
    for (const item of phases) {
      if (!Number.isFinite(item.normalizedTime) || item.normalizedTime < 0 || item.normalizedTime > 1 || item.normalizedTime <= previous) errors.push(`invalid normalized time for ${item.id}`);
      previous = item.normalizedTime;
      for (const target of item.boneTargets || []) if (!bones.has(target.bone)) errors.push(`unknown bone target ${target.bone}`);
    }
    if (phases[0]?.normalizedTime !== 0 || phases.at(-1)?.normalizedTime !== 1) errors.push("motion must span normalized time 0 through 1");
    if (!bones.has(candidate.skeleton?.rootBone)) errors.push(`unknown root bone ${candidate.skeleton?.rootBone}`);
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate });
});
