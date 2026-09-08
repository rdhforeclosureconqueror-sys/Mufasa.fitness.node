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
    const { contacts = [], ...rest } = extra;
    return Object.freeze({
      id,
      kind,
      normalizedTime,
      interpolation: "quaternion_slerp",
      root: Object.freeze({ positionOffset: freezeVec(rootPosition), positionUnit: "avatar_height", rotationOffsetEulerDegrees: freezeVec([pose.hipPitch, 0, 0]) }),
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
      contacts: Object.freeze(contacts.slice()),
      ...rest
    });
  }

  const STANDING = Object.freeze({ hipPitch: 0, spinePitch: 0, spine1Pitch: 0, leftThigh: 0, leftKnee: 0, leftAnkle: 0, rightThigh: 0, rightKnee: 0, rightAnkle: 0 });
  const STEP = Object.freeze({ hipPitch: 1, spinePitch: -1, spine1Pitch: 0, leftThigh: 55, leftKnee: -18, leftAnkle: 6, rightThigh: -6, rightKnee: -4, rightAnkle: -1 });
  const SPLIT_TOP = Object.freeze({ hipPitch: 2, spinePitch: -1, spine1Pitch: 0, leftThigh: 40, leftKnee: -10, leftAnkle: 4, rightThigh: -34, rightKnee: -6, rightAnkle: -3 });
  const DESCENT = Object.freeze({ hipPitch: 3, spinePitch: -1, spine1Pitch: 0, leftThigh: 49, leftKnee: -50, leftAnkle: 9, rightThigh: -22, rightKnee: -50, rightAnkle: -5 });
  const BOTTOM = Object.freeze({ hipPitch: 3, spinePitch: -1, spine1Pitch: 0, leftThigh: 58, leftKnee: -88, leftAnkle: 12, rightThigh: -12, rightKnee: -92, rightAnkle: -7 });
  const LOADED_CONTACTS = Object.freeze(["left_front_foot", "right_rear_forefoot"]);

  const verticalDown = Object.freeze({ target: "pelvis", direction: "down", dominantAxis: "vertical", horizontalTravelIntent: "minimal", rearKneeDirection: "down_toward_floor" });
  const verticalUp = Object.freeze({ target: "pelvis", direction: "up", dominantAxis: "vertical", horizontalTravelIntent: "minimal", returnTo: "split_top" });

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "stationary_lunge_left",
    motionId: "lunge/stationary_left_movement_definition_v2_2_stride_angle_gate",
    displayName: "Stationary Left Lunge Movement Definition v2.2 — Longer Step + 90° Geometry Gate",
    version: 2.2,
    status: "development-test-only",
    sourceManifest: "/motion-sources/stationary-lunge-left-synthesis-v1.source.json",
    movementContractRef: "/motion/contracts/stationary-lunge-left.v2.json",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 7.2,
    loop: false,
    movementContract: Object.freeze({
      style: "step into a left-forward stationary lunge, complete three controlled repetitions, then step back to standing",
      startAndFinish: "upright neutral standing position",
      setupIntent: "begin from the avatar rest-relative standing pose before creating the split stance",
      stepIntent: "drive the left hip farther into flexion so the left foot travels far enough forward to establish a true lunge stance before loading",
      frontKneeBottomInsideAngleTargetDegrees: 90,
      frontKneeBottomToleranceDegrees: 10,
      rearKneeBottomInsideAngleTargetDegrees: 90,
      rearKneeBottomToleranceDegrees: 15,
      descentIntent: "after the feet are planted, drive the pelvis mostly straight down instead of translating forward",
      rearKneeIntent: "right rear knee tracks primarily downward toward the floor while the right forefoot remains planted",
      frontShinIntent: "front shin remains approximately vertical at the bottom rather than the knee continuing far forward",
      ascentIntent: "drive the pelvis mostly straight up to the same split-stance top without moving the planted feet",
      exitIntent: "after the third ascent, end loaded-lunge contact authority, then transition the legs back toward neutral standing without forcing the split-stance rear-toe anchor onto the neutralizing exit pose",
      torsoIntent: "remain tall with only small balance lean",
      armsPriority: "secondary-after-lower-body-approval"
    }),
    authoringGeometryGate: Object.freeze({
      purpose: "Reject a lunge definition that declares 90-degree bottom geometry but does not create enough forward hip flexion and split-stance reach to support it.",
      stepForwardMinimumLeftHipFlexionDegrees: 50,
      splitPlantMinimumLeftHipFlexionDegrees: 35,
      splitPlantMinimumRearHipExtensionDegrees: 30,
      bottomMinimumFrontKneeFlexionOffsetDegrees: 80,
      bottomMinimumRearKneeFlexionOffsetDegrees: 85,
      targetFrontKneeInsideAngleDegrees: 90,
      targetFrontKneeToleranceDegrees: 10,
      firstFailingBoundary: "LUNGE_ENTRY_GEOMETRY"
    }),
    repetitionPlan: Object.freeze({
      count: 3,
      entryPhase: "split_plant",
      loadedTopPhases: Object.freeze(["rep1_top", "rep2_top", "rep3_top"]),
      bottomPhases: Object.freeze(["rep1_bottom", "rep2_bottom", "rep3_bottom"]),
      exitPhase: "step_back",
      rule: "Feet remain anchored through all three loaded repetitions. Loaded contact authority ends after rep3_top before the exit transition begins."
    }),
    groundingPolicy: Object.freeze({
      mode: "phase-aware-step-in-then-split-stance-anchor-lock",
      contacts: LOADED_CONTACTS,
      contactBones: Object.freeze({ left_front_foot: "mixamorig:LeftFoot", right_rear_forefoot: "mixamorig:RightToeBase" }),
      enforceContactAnchors: true,
      enforceGeneratedIK: true,
      kinematicChains: Object.freeze([
        Object.freeze({ id: "left_leg", contact: "left_front_foot", rootBone: "mixamorig:LeftUpLeg", jointBone: "mixamorig:LeftLeg", endBone: "mixamorig:LeftFoot", contactBone: "mixamorig:LeftFoot" }),
        Object.freeze({ id: "right_leg", contact: "right_rear_forefoot", rootBone: "mixamorig:RightUpLeg", jointBone: "mixamorig:RightLeg", endBone: "mixamorig:RightFoot", contactBone: "mixamorig:RightToeBase" })
      ]),
      anchorPhaseId: "split_plant",
      anchorValidity: Object.freeze({ requiredGroundContacts: LOADED_CONTACTS, rejectAirborneRearToe: true, reviewRule: "Do not begin loaded descent until split_plant has the left whole foot and right forefoot on the same ground plane." }),
      rule: "Standing and stepping-in phases are unconstrained. Capture both loaded anchors at split_plant, preserve both through rep3_top, then release loaded anchor authority before step_back so the exit pose can return toward standing without an unreachable rear-leg target."
    }),
    trajectoryPolicy: Object.freeze({
      loadedDescent: verticalDown,
      loadedAscent: verticalUp,
      frontFoot: "plant during split_plant through rep3_top",
      rearForefoot: "stay planted from split_plant through rep3_top; loaded anchor authority ends before step_back",
      frontKnee: "approach 90 degrees at each bottom while tracking with the front foot",
      frontShin: "approximately vertical at each bottom",
      rearKnee: "approach the floor by moving downward rather than swinging forward/back",
      torso: "upright"
    }),
    synthesisBoundary: Object.freeze({
      method: "movement-lego-composition-with-phase-aware-contact-constraints-explicit-pelvis-trajectory-and-entry-geometry-gate",
      copiedNamedLungeAnimation: false,
      sourcePrimitives: Object.freeze(["neutral_stand", "step_forward", "split_stance", "stable_stance", "root_vertical_descent", "root_vertical_ascent", "bilateral_knee_flexion_extension", "rear_knee_descent", "stable_ground_contact", "step_back_to_stand"]),
      evidenceReferences: Object.freeze(["/motion-sources/crouched-sneaking-left-reference.source.json", "/motion-sources/kettlebell-swing-reference.source.json", "/motion/transition-profiles/stand-to-plank.v1.json"]),
      evidenceCaution: "Reference sources contribute only primitive mechanics. The lunge sequence is defined by this movement contract rather than copied from a named lunge animation.",
      unsupported: Object.freeze(["biomechanical ground truth", "production scoring thresholds", "individual anthropometric fit", "medical diagnosis"])
    }),
    phaseOrder: Object.freeze([
      "stand_start", "step_forward", "split_plant",
      "rep1_descent", "rep1_bottom", "rep1_top",
      "rep2_descent", "rep2_bottom", "rep2_top",
      "rep3_descent", "rep3_bottom", "rep3_top",
      "step_back", "stand_finish"
    ]),
    phases: Object.freeze([
      phase("stand_start", "setup", 0.00, [0, 0, 0], STANDING, { contacts: [], movementIntent: "neutral standing; no lunge load" }),
      phase("step_forward", "transition", 0.08, [0, 0, 0], STEP, { contacts: [], movementIntent: "left hip flexes strongly to send the left foot forward and create enough stride length for the later 90-degree bottom" }),
      phase("split_plant", "position", 0.16, [0, 0, 0], SPLIT_TOP, { contacts: LOADED_CONTACTS, movementIntent: "plant a deliberately long left-forward split stance before descent" }),
      phase("rep1_descent", "eccentric", 0.25, [0, -0.07, 0], DESCENT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep1_bottom", "isometric", 0.32, [0, -0.14, 0], BOTTOM, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12 }),
      phase("rep1_top", "concentric", 0.40, [0, 0, 0], SPLIT_TOP, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("rep2_descent", "eccentric", 0.48, [0, -0.07, 0], DESCENT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep2_bottom", "isometric", 0.55, [0, -0.14, 0], BOTTOM, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12 }),
      phase("rep2_top", "concentric", 0.63, [0, 0, 0], SPLIT_TOP, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("rep3_descent", "eccentric", 0.71, [0, -0.07, 0], DESCENT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep3_bottom", "isometric", 0.78, [0, -0.14, 0], BOTTOM, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12 }),
      phase("rep3_top", "concentric", 0.86, [0, 0, 0], SPLIT_TOP, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("step_back", "transition", 0.94, [0, 0, 0], STEP, { contacts: [], movementIntent: "loaded anchors released; return legs toward neutral standing without forcing split-stance IK" }),
      phase("stand_finish", "completion", 1.00, [0, 0, 0], STANDING, { contacts: [], movementIntent: "same neutral standing pose as start" })
    ])
  });

  function bonePitch(phaseItem, bone) {
    return phaseItem?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0];
  }

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [];
    const bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId", "motionId", "version", "skeleton", "durationSeconds", "phases", "phaseOrder", "movementContractRef", "repetitionPlan", "trajectoryPolicy", "authoringGeometryGate"]) if (candidate[field] == null) errors.push(`${field} is required`);
    if (!(candidate.durationSeconds > 0)) errors.push("durationSeconds must be positive");
    if (candidate.loop !== false) errors.push("step-in lunge v2 must finish at standing instead of looping split stance");
    if (!candidate.groundingPolicy?.enforceContactAnchors) errors.push("lunge requires contact-anchor enforcement");
    if (!candidate.groundingPolicy?.enforceGeneratedIK) errors.push("lunge requires generated two-bone IK enforcement");
    if (candidate.groundingPolicy?.anchorPhaseId !== "split_plant") errors.push("loaded lunge anchors must be established at split_plant after the step");
    if (!candidate.groundingPolicy?.anchorValidity?.rejectAirborneRearToe) errors.push("lunge must reject an airborne rear-toe loaded anchor");
    if (candidate.repetitionPlan?.count !== 3) errors.push("lunge v2 requires three authored repetitions");

    const chains = Array.isArray(candidate.groundingPolicy?.kinematicChains) ? candidate.groundingPolicy.kinematicChains : [];
    if (chains.length !== 2) errors.push("lunge requires front and rear leg kinematic chains");
    for (const chain of chains) {
      for (const field of ["id", "contact", "rootBone", "jointBone", "endBone", "contactBone"]) if (!chain[field]) errors.push(`kinematic chain ${field} is required`);
      for (const bone of [chain.rootBone, chain.jointBone, chain.endBone, chain.contactBone]) if (bone && !bones.has(bone)) errors.push(`unknown kinematic chain bone ${bone}`);
    }

    const phases = Array.isArray(candidate.phases) ? candidate.phases : [];
    const ids = phases.map(item => item.id);
    if (JSON.stringify(ids) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("phaseOrder must match phases");
    let previous = -1;
    const knownContacts = new Set(candidate.groundingPolicy?.contacts || []);
    for (const item of phases) {
      if (!Number.isFinite(item.normalizedTime) || item.normalizedTime <= previous || item.normalizedTime < 0 || item.normalizedTime > 1) errors.push(`invalid normalized time for ${item.id}`);
      previous = item.normalizedTime;
      for (const boneTarget of item.boneTargets || []) if (!bones.has(boneTarget.bone)) errors.push(`unknown bone target ${boneTarget.bone}`);
      for (const contact of item.contacts || []) if (!knownContacts.has(contact)) errors.push(`unknown contact ${contact} for ${item.id}`);
    }
    if (phases[0]?.normalizedTime !== 0 || phases.at(-1)?.normalizedTime !== 1) errors.push("motion must span normalized time 0 through 1");

    const start = phases.find(item => item.id === "stand_start");
    const finish = phases.find(item => item.id === "stand_finish");
    if (!start || !finish || JSON.stringify(start.root) !== JSON.stringify(finish.root) || JSON.stringify(start.boneTargets) !== JSON.stringify(finish.boneTargets)) errors.push("stand_start and stand_finish must match");
    if ((start?.contacts || []).length || (finish?.contacts || []).length) errors.push("standing phases must not use split-stance anchors");

    const anchor = phases.find(item => item.id === "split_plant");
    if (JSON.stringify(anchor?.contacts || []) !== JSON.stringify(LOADED_CONTACTS)) errors.push("split_plant must establish both loaded contacts");
    const loadedIds = ["rep1_descent", "rep1_bottom", "rep1_top", "rep2_descent", "rep2_bottom", "rep2_top", "rep3_descent", "rep3_bottom", "rep3_top"];
    for (const id of loadedIds) {
      const item = phases.find(candidatePhase => candidatePhase.id === id);
      if (JSON.stringify(item?.contacts || []) !== JSON.stringify(LOADED_CONTACTS)) errors.push(`${id} must preserve both split-stance contacts`);
    }
    const exit = phases.find(item => item.id === "step_back");
    if ((exit?.contacts || []).length) errors.push("step_back must release loaded split-stance contact authority before returning toward standing");
    for (const id of ["rep1_descent", "rep1_bottom", "rep2_descent", "rep2_bottom", "rep3_descent", "rep3_bottom"]) {
      const item = phases.find(candidatePhase => candidatePhase.id === id);
      if (item?.root?.positionOffset?.[0] !== 0 || item?.root?.positionOffset?.[2] !== 0) errors.push(`${id} must not author horizontal pelvis travel`);
    }

    const gate = candidate.authoringGeometryGate || {};
    const step = phases.find(item => item.id === "step_forward");
    const splitPlant = phases.find(item => item.id === "split_plant");
    const stepLeftHip = bonePitch(step, "mixamorig:LeftUpLeg");
    const plantLeftHip = bonePitch(splitPlant, "mixamorig:LeftUpLeg");
    const plantRearHip = bonePitch(splitPlant, "mixamorig:RightUpLeg");
    if (!(stepLeftHip >= gate.stepForwardMinimumLeftHipFlexionDegrees)) errors.push(`LUNGE_ENTRY_GEOMETRY: step_forward left hip flexion ${stepLeftHip}° is below ${gate.stepForwardMinimumLeftHipFlexionDegrees}° minimum; stride is too short`);
    if (!(plantLeftHip >= gate.splitPlantMinimumLeftHipFlexionDegrees)) errors.push(`LUNGE_ENTRY_GEOMETRY: split_plant left hip flexion ${plantLeftHip}° is below ${gate.splitPlantMinimumLeftHipFlexionDegrees}° minimum; front foot is not far enough forward`);
    if (!(Math.abs(plantRearHip) >= gate.splitPlantMinimumRearHipExtensionDegrees)) errors.push(`LUNGE_ENTRY_GEOMETRY: split_plant rear hip extension ${plantRearHip}° is below ${gate.splitPlantMinimumRearHipExtensionDegrees}° minimum; stance is too short`);
    for (const id of candidate.repetitionPlan?.bottomPhases || []) {
      const bottom = phases.find(item => item.id === id);
      const frontKnee = Math.abs(bonePitch(bottom, "mixamorig:LeftLeg") || 0);
      const rearKnee = Math.abs(bonePitch(bottom, "mixamorig:RightLeg") || 0);
      if (frontKnee < gate.bottomMinimumFrontKneeFlexionOffsetDegrees) errors.push(`LUNGE_BOTTOM_GEOMETRY: ${id} front knee authored flexion ${frontKnee}° is below ${gate.bottomMinimumFrontKneeFlexionOffsetDegrees}° minimum`);
      if (rearKnee < gate.bottomMinimumRearKneeFlexionOffsetDegrees) errors.push(`LUNGE_BOTTOM_GEOMETRY: ${id} rear knee authored flexion ${rearKnee}° is below ${gate.bottomMinimumRearKneeFlexionOffsetDegrees}° minimum`);
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function summary(candidate = spec) {
    const bottoms = candidate.repetitionPlan.bottomPhases.map(id => candidate.phases.find(item => item.id === id)).filter(Boolean);
    const maxBottomDrop = bottoms.reduce((max, item) => Math.max(max, Math.abs(item.root.positionOffset[1] || 0)), 0);
    return Object.freeze({
      motionId: candidate.motionId,
      version: candidate.version,
      status: candidate.status,
      durationSeconds: candidate.durationSeconds,
      phaseOrder: Object.freeze(candidate.phaseOrder.slice()),
      repetitionCount: candidate.repetitionPlan.count,
      maxBottomRootDropAvatarHeights: maxBottomDrop,
      frontKneeTargetDegrees: candidate.movementContract.frontKneeBottomInsideAngleTargetDegrees,
      rearKneeTargetDegrees: candidate.movementContract.rearKneeBottomInsideAngleTargetDegrees,
      minimumStepLeftHipFlexionDegrees: candidate.authoringGeometryGate.stepForwardMinimumLeftHipFlexionDegrees,
      minimumSplitPlantLeftHipFlexionDegrees: candidate.authoringGeometryGate.splitPlantMinimumLeftHipFlexionDegrees,
      geometryGateBoundary: candidate.authoringGeometryGate.firstFailingBoundary,
      descentDominantAxis: candidate.trajectoryPolicy.loadedDescent.dominantAxis,
      groundingMode: candidate.groundingPolicy.mode,
      anchorPhaseId: candidate.groundingPolicy.anchorPhaseId,
      generatedIK: Boolean(candidate.groundingPolicy.enforceGeneratedIK),
      kinematicChainCount: candidate.groundingPolicy.kinematicChains?.length || 0,
      rejectsAirborneRearToeAnchor: candidate.groundingPolicy.anchorValidity.rejectAirborneRearToe,
      evidenceOnly: true,
      requiresHumanMoveNetReview: true
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});