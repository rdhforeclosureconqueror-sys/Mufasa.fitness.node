(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTLungePhaseFirstMotionSpec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CANONICAL_BONES = Object.freeze([
    "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1",
    "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot", "mixamorig:LeftToeBase",
    "mixamorig:RightUpLeg", "mixamorig:RightLeg", "mixamorig:RightFoot", "mixamorig:RightToeBase"
  ]);
  const LOADED_CONTACTS = Object.freeze(["left_front_foot", "right_rear_forefoot"]);
  const freezeVec = values => Object.freeze(values.slice());
  const target = (bone, rotationOffsetEulerDegrees) => Object.freeze({ bone, rotationOffsetEulerDegrees: freezeVec(rotationOffsetEulerDegrees) });

  const pose = values => Object.freeze({ ...values });
  const addPose = (base, delta) => pose(Object.fromEntries(Object.keys(base).map(key => [key, Number(base[key] || 0) + Number(delta[key] || 0)])));

  function phase(id, kind, normalizedTime, rootPosition, p, extra = {}) {
    const { contacts = [], ...rest } = extra;
    return Object.freeze({
      id,
      kind,
      normalizedTime,
      interpolation: "quaternion_slerp",
      root: Object.freeze({ positionOffset: freezeVec(rootPosition), positionUnit: "avatar_height", rotationOffsetEulerDegrees: freezeVec([p.hipPitch, 0, 0]) }),
      boneTargets: Object.freeze([
        target("mixamorig:Spine", [p.spinePitch, 0, 0]),
        target("mixamorig:Spine1", [p.spine1Pitch, 0, 0]),
        target("mixamorig:LeftUpLeg", [p.leftThigh, 0, 0]),
        target("mixamorig:LeftLeg", [p.leftKnee, 0, 0]),
        target("mixamorig:LeftFoot", [p.leftAnkle, 0, 0]),
        target("mixamorig:RightUpLeg", [p.rightThigh, 0, 0]),
        target("mixamorig:RightLeg", [p.rightKnee, 0, 0]),
        target("mixamorig:RightFoot", [p.rightAnkle, 0, 0])
      ]),
      contacts: Object.freeze(contacts.slice()),
      ...rest
    });
  }

  const STANDING = pose({ hipPitch: 0, spinePitch: 0, spine1Pitch: 0, leftThigh: 0, leftKnee: 0, leftAnkle: 0, rightThigh: 0, rightKnee: 0, rightAnkle: 0 });

  // IMPORTANT: This is an authoring seed, not a claim that the split pose is finished.
  // Owner/device diagnostics from the newly adjusted split pose should replace this one pose.
  // All loaded top phases inherit from SPLIT_PLANT so recalibrating the split does not require
  // independently rewriting every top position.
  const SPLIT_PLANT = pose({
    hipPitch: 2, spinePitch: -1, spine1Pitch: 0,
    leftThigh: 24, leftKnee: -14, leftAnkle: 6,
    rightThigh: -27, rightKnee: -2, rightAnkle: -3
  });

  // Loaded motion is defined RELATIVE TO the planted split stance. These provisional deltas
  // preserve the existing vertical-drop intent while allowing the split pose itself to be
  // owner-calibrated independently.
  const DESCENT_DELTA = pose({
    hipPitch: 1, spinePitch: 0, spine1Pitch: 0,
    leftThigh: 13, leftKnee: -28, leftAnkle: 4,
    rightThigh: 9, rightKnee: -42, rightAnkle: -2
  });
  const BOTTOM_DELTA = pose({
    hipPitch: 1, spinePitch: 0, spine1Pitch: 0,
    leftThigh: 24, leftKnee: -58, leftAnkle: 6,
    rightThigh: 18, rightKnee: -80, rightAnkle: -4
  });
  const DESCENT = addPose(SPLIT_PLANT, DESCENT_DELTA);
  const BOTTOM = addPose(SPLIT_PLANT, BOTTOM_DELTA);

  const verticalDown = Object.freeze({ target: "pelvis", direction: "down", dominantAxis: "vertical", horizontalTravelIntent: "minimal", rearKneeDirection: "down_toward_floor", phaseRelativeTo: "split_plant" });
  const verticalUp = Object.freeze({ target: "pelvis", direction: "up", dominantAxis: "vertical", horizontalTravelIntent: "minimal", returnTo: "split_plant", phaseRelativeTo: "split_plant" });

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "stationary_lunge_left",
    motionId: "lunge/stationary_left_phase_first_v3_0_split_authority",
    displayName: "Stationary Left Lunge v3.0 — Phase-First Split Authority",
    version: 3.0,
    status: "development-authoring-only",
    sourceManifest: "/motion-sources/stationary-lunge-left-synthesis-v1.source.json",
    movementContractRef: "/motion/contracts/stationary-lunge-left.v3.json",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 6.8,
    loop: false,
    lineage: Object.freeze({
      previousMotionId: "lunge/stationary_left_movement_definition_v2_3_playable_base_owner_split_knee",
      rebuildReason: "entry had separate STEP, SPLIT_PLANT and SPLIT_TOP geometries; v3 makes the planted split pose the single loaded-top authority",
      calibrationStatus: "split_pose_owner_recalibration_required"
    }),
    authoringModel: Object.freeze({
      strategy: "phase_first_destination_authority",
      stepDefinition: "the transition from stand_start directly into split_plant is the step",
      splitAuthorityPhaseId: "split_plant",
      descendantPoseModel: "descent_and_bottom_are_deltas_from_split_plant",
      topReturnRule: "all repetition tops are exact split_plant geometry",
      ownerWorkflow: "calibrate split_plant first, then review descent and bottom relative deltas"
    }),
    movementContract: Object.freeze({
      style: "stand, step directly into the final planted split stance, complete three vertical-dominant repetitions, then step directly back to standing",
      startAndFinish: "upright neutral standing position",
      stepIntent: "stand_start interpolates directly to the final split_plant pose; there is no independent intermediate STEP body pose",
      splitIntent: "split_plant is the single authoritative loaded-top pose and is the next owner calibration target",
      descentIntent: "with both support contacts fixed, lower the pelvis mostly straight down while both knees flex relative to the split stance",
      rearKneeIntent: "rear knee travels down toward the floor while the right forefoot remains planted",
      frontShinIntent: "front shin remains approximately vertical; reject inward knee collapse during visual acceptance",
      ascentIntent: "reverse the descent and return exactly to split_plant",
      exitIntent: "release loaded contacts after rep3_top and transition directly from the split stance back to neutral standing",
      torsoIntent: "remain tall with only small balance lean",
      armsPriority: "secondary-after-lower-body-approval"
    }),
    repetitionPlan: Object.freeze({
      count: 3,
      entryPhase: "split_plant",
      loadedTopPhases: Object.freeze(["rep1_top", "rep2_top", "rep3_top"]),
      bottomPhases: Object.freeze(["rep1_bottom", "rep2_bottom", "rep3_bottom"]),
      exitPhase: "step_back",
      rule: "split_plant establishes both anchors; every top returns to identical split geometry; contacts remain through rep3_top and release before step_back"
    }),
    groundingPolicy: Object.freeze({
      mode: "direct-step-to-split-then-anchor-lock",
      contacts: LOADED_CONTACTS,
      contactBones: Object.freeze({ left_front_foot: "mixamorig:LeftFoot", right_rear_forefoot: "mixamorig:RightToeBase" }),
      enforceContactAnchors: true,
      enforceGeneratedIK: true,
      kinematicChains: Object.freeze([
        Object.freeze({ id: "left_leg", contact: "left_front_foot", rootBone: "mixamorig:LeftUpLeg", jointBone: "mixamorig:LeftLeg", endBone: "mixamorig:LeftFoot", contactBone: "mixamorig:LeftFoot" }),
        Object.freeze({ id: "right_leg", contact: "right_rear_forefoot", rootBone: "mixamorig:RightUpLeg", jointBone: "mixamorig:RightLeg", endBone: "mixamorig:RightFoot", contactBone: "mixamorig:RightToeBase" })
      ]),
      anchorPhaseId: "split_plant",
      anchorValidity: Object.freeze({ requiredGroundContacts: LOADED_CONTACTS, rejectAirborneRearToe: true, reviewRule: "do not begin descent until the owner-calibrated split stance is visibly correct and both support contacts are on the ground plane" }),
      rule: "standing-to-split is unconstrained travel; capture both anchors only at split_plant; preserve them through rep3_top; release before step_back"
    }),
    trajectoryPolicy: Object.freeze({
      loadedDescent: verticalDown,
      loadedAscent: verticalUp,
      frontFoot: "plant at split_plant through rep3_top",
      rearForefoot: "plant at split_plant through rep3_top",
      frontKnee: "flex from the calibrated split pose without medial collapse",
      rearKnee: "drop toward the floor from the calibrated split pose",
      torso: "upright"
    }),
    phaseOrder: Object.freeze([
      "stand_start", "split_plant",
      "rep1_descent", "rep1_bottom", "rep1_top",
      "rep2_descent", "rep2_bottom", "rep2_top",
      "rep3_descent", "rep3_bottom", "rep3_top",
      "step_back", "stand_finish"
    ]),
    phases: Object.freeze([
      phase("stand_start", "setup", 0.00, [0, 0, 0], STANDING, { contacts: [], movementIntent: "neutral standing; transition from here directly into the final split stance" }),
      phase("split_plant", "position", 0.18, [0, 0, 0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, movementIntent: "single authoritative split stance; owner recalibration target" }),
      phase("rep1_descent", "eccentric", 0.27, [0, -0.07, 0], DESCENT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep1_bottom", "isometric", 0.34, [0, -0.14, 0], BOTTOM, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12 }),
      phase("rep1_top", "concentric", 0.42, [0, 0, 0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("rep2_descent", "eccentric", 0.50, [0, -0.07, 0], DESCENT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep2_bottom", "isometric", 0.57, [0, -0.14, 0], BOTTOM, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12 }),
      phase("rep2_top", "concentric", 0.65, [0, 0, 0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("rep3_descent", "eccentric", 0.73, [0, -0.07, 0], DESCENT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep3_bottom", "isometric", 0.80, [0, -0.14, 0], BOTTOM, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12 }),
      phase("rep3_top", "concentric", 0.88, [0, 0, 0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("step_back", "transition", 0.90, [0, 0, 0], SPLIT_PLANT, { contacts: [], movementIntent: "release loaded anchors; transition from this split pose directly back to standing" }),
      phase("stand_finish", "completion", 1.00, [0, 0, 0], STANDING, { contacts: [], movementIntent: "same neutral standing pose as start" })
    ])
  });

  function samePose(a, b) {
    return JSON.stringify(a?.root) === JSON.stringify(b?.root) && JSON.stringify(a?.boneTargets) === JSON.stringify(b?.boneTargets);
  }

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [];
    const bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    if (candidate.version !== 3) errors.push("phase-first lunge must remain v3.0");
    if (candidate.loop !== false) errors.push("phase-first lunge must be finite");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [];
    const ids = phases.map(item => item.id);
    if (ids.includes("step_forward")) errors.push("v3 must not introduce a separate step_forward pose; stand_start to split_plant is the step");
    if (JSON.stringify(ids) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("phaseOrder must match phases");
    let previous = -1;
    for (const item of phases) {
      if (!Number.isFinite(item.normalizedTime) || item.normalizedTime <= previous || item.normalizedTime < 0 || item.normalizedTime > 1) errors.push(`invalid normalized time for ${item.id}`);
      previous = item.normalizedTime;
      for (const boneTarget of item.boneTargets || []) if (!bones.has(boneTarget.bone)) errors.push(`unknown bone target ${boneTarget.bone}`);
    }
    const start = phases.find(item => item.id === "stand_start");
    const split = phases.find(item => item.id === "split_plant");
    const finish = phases.find(item => item.id === "stand_finish");
    if (!start || !split || !finish) errors.push("stand_start, split_plant and stand_finish are required");
    if (!samePose(start, finish)) errors.push("stand_start and stand_finish must match");
    if (JSON.stringify(split?.contacts || []) !== JSON.stringify(LOADED_CONTACTS)) errors.push("split_plant must establish both loaded contacts");
    for (const id of candidate.repetitionPlan?.loadedTopPhases || []) {
      const top = phases.find(item => item.id === id);
      if (!samePose(top, split)) errors.push(`${id} must return exactly to split_plant geometry`);
    }
    for (const id of ["rep1_descent","rep1_bottom","rep2_descent","rep2_bottom","rep3_descent","rep3_bottom"]) {
      const item = phases.find(phaseItem => phaseItem.id === id);
      if (item?.root?.positionOffset?.[0] !== 0 || item?.root?.positionOffset?.[2] !== 0) errors.push(`${id} must not author horizontal pelvis travel`);
      if (JSON.stringify(item?.contacts || []) !== JSON.stringify(LOADED_CONTACTS)) errors.push(`${id} must preserve both split contacts`);
    }
    const exit = phases.find(item => item.id === "step_back");
    if ((exit?.contacts || []).length) errors.push("step_back must release contacts before the return to standing");
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function summary(candidate = spec) {
    return Object.freeze({
      motionId: candidate.motionId,
      version: candidate.version,
      status: candidate.status,
      durationSeconds: candidate.durationSeconds,
      phaseOrder: Object.freeze(candidate.phaseOrder.slice()),
      splitAuthorityPhaseId: candidate.authoringModel.splitAuthorityPhaseId,
      stepDefinition: candidate.authoringModel.stepDefinition,
      descendantPoseModel: candidate.authoringModel.descendantPoseModel,
      calibrationStatus: candidate.lineage.calibrationStatus,
      generatedIK: Boolean(candidate.groundingPolicy.enforceGeneratedIK),
      anchorPhaseId: candidate.groundingPolicy.anchorPhaseId,
      evidenceOnly: true,
      requiresOwnerSplitPoseAcceptance: true
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});
