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
      id, kind, normalizedTime, interpolation: "quaternion_slerp",
      root: Object.freeze({ positionOffset: freezeVec(rootPosition), positionUnit: "avatar_height", rotationOffsetEulerDegrees: freezeVec([pose.hipPitch, 0, 0]) }),
      boneTargets: Object.freeze([
        target("mixamorig:Spine", [pose.spinePitch, 0, 0]), target("mixamorig:Spine1", [pose.spine1Pitch, 0, 0]),
        target("mixamorig:LeftUpLeg", [pose.leftThigh, 0, 0]), target("mixamorig:LeftLeg", [pose.leftKnee, 0, 0]), target("mixamorig:LeftFoot", [pose.leftAnkle, 0, 0]),
        target("mixamorig:RightUpLeg", [pose.rightThigh, 0, 0]), target("mixamorig:RightLeg", [pose.rightKnee, 0, 0]), target("mixamorig:RightFoot", [pose.rightAnkle, 0, 0])
      ]),
      contacts: Object.freeze(contacts.slice()), ...rest
    });
  }

  const STANDING = Object.freeze({ hipPitch: 0, spinePitch: 0, spine1Pitch: 0, leftThigh: 0, leftKnee: 0, leftAnkle: 0, rightThigh: 0, rightKnee: 0, rightAnkle: 0 });
  const SPLIT_PLANT = Object.freeze({ hipPitch: 1, spinePitch: -1, spine1Pitch: 0, leftThigh: 79, leftKnee: -84, leftAnkle: 8, rightThigh: -49, rightKnee: -14, rightAnkle: 9 });
  const LOADED_CONTACTS = Object.freeze(["left_front_foot", "right_rear_forefoot"]);
  const verticalDown = Object.freeze({ target: "pelvis", direction: "down", dominantAxis: "vertical", horizontalTravelIntent: "minimal", solveLegsFromPlantedContacts: true, rearKneeDirection: "down_toward_floor" });
  const verticalUp = Object.freeze({ target: "pelvis", direction: "up", dominantAxis: "vertical", horizontalTravelIntent: "minimal", solveLegsFromPlantedContacts: true, returnTo: "split_plant" });
  const loadedPhaseIds = Object.freeze(["split_plant","rep1_descent","rep1_bottom","rep1_top","rep2_descent","rep2_bottom","rep2_top","rep3_descent","rep3_bottom","rep3_top"]);

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "stationary_lunge_left",
    motionId: "lunge/stationary_left_phase_first_v3_owner_split_plant",
    displayName: "Stationary Left Lunge v3.0 — Phase-First Owner Split Plant",
    version: 3.0,
    status: "development-test-only",
    sourceManifest: "/motion-sources/stationary-lunge-left-synthesis-v1.source.json",
    movementContractRef: "/motion/contracts/stationary-lunge-left.v3.json",
    skeleton: Object.freeze({ id: "canonical_phase_e_mixamo", rootBone: "mixamorig:Hips", rotationSpace: "rest_relative_local" }),
    durationSeconds: 7.2,
    loop: false,
    lineage: Object.freeze({ previousMotionId: "lunge/stationary_left_movement_definition_v2_3_playable_base_owner_split_knee", resetMethod: "phase-first-owner-split-plant", reason: "Standing now transitions directly into the owner-authored split/plant pose. Loaded repetitions descend by root trajectory plus planted-contact IK instead of speculative replacement knee rotations." }),
    acceptedAuthoringAdjustment: Object.freeze({
      type: "promoted_pose_bundle", sourceMotionId: "lunge/stationary_left_movement_definition_v2_3_playable_base_owner_split_knee", sourcePhaseId: "step_forward", promotedPhaseId: "split_plant", editorVersion: "1.2.0-pose-authoring-durable-edits",
      deltas: Object.freeze([
        Object.freeze({ bone: "mixamorig:LeftUpLeg", axis: "x", deltaDegrees: 45, baseDegrees: 34, canonicalDegrees: 79 }),
        Object.freeze({ bone: "mixamorig:LeftLeg", axis: "x", deltaDegrees: -60, baseDegrees: -24, canonicalDegrees: -84 }),
        Object.freeze({ bone: "mixamorig:RightUpLeg", axis: "x", deltaDegrees: -45, baseDegrees: -4, canonicalDegrees: -49 }),
        Object.freeze({ bone: "mixamorig:RightLeg", axis: "x", deltaDegrees: -10, baseDegrees: -4, canonicalDegrees: -14 }),
        Object.freeze({ bone: "mixamorig:RightFoot", axis: "x", deltaDegrees: 10, baseDegrees: -1, canonicalDegrees: 9 })
      ]),
      rule: "This entire pose is the split/plant authority. Do not reuse the old v2.x split or bottom rotations around it."
    }),
    movementContract: Object.freeze({
      style: "phase-first left-forward stationary lunge", startAndFinish: "upright neutral standing position",
      entryIntent: "standing transitions directly into the owner-authored split_plant; that transition is the step",
      splitIntent: "split_plant is the first loaded pose and repeated top-position authority",
      descentIntent: "after contacts are planted, lower the pelvis vertically while preserving split_plant as authored intent; generated leg IK resolves the knees around planted foot anchors",
      ascentIntent: "raise the pelvis vertically back to the exact split_plant top pose",
      frontFootIntent: "left whole foot remains planted during loaded repetitions", rearFootIntent: "right forefoot/toe remains planted during loaded repetitions",
      kneeIntent: "do not inject a second guessed set of knee rotations during descent; knee flexion is produced by pelvis descent plus planted-contact IK until a separately owner-approved bottom pose replaces that provisional rule",
      torsoIntent: "remain tall with only small balance lean", exitIntent: "after rep3_top, release loaded contacts and transition directly back to the same neutral standing pose",
      calibrationRule: "Position authority comes before transition authority: approve split first, then bottom, then tune movement between them."
    }),
    repetitionPlan: Object.freeze({ count: 3, entryPhase: "split_plant", loadedTopPhases: Object.freeze(["rep1_top","rep2_top","rep3_top"]), bottomPhases: Object.freeze(["rep1_bottom","rep2_bottom","rep3_bottom"]), exitPhase: "stand_finish", rule: "All loaded phases inherit split_plant authored bone pose; root vertical trajectory and generated IK create down/up motion until a separately owner-approved bottom pose replaces that provisional rule." }),
    groundingPolicy: Object.freeze({
      mode: "phase-first-split-anchor-lock", contacts: LOADED_CONTACTS,
      contactBones: Object.freeze({ left_front_foot: "mixamorig:LeftFoot", right_rear_forefoot: "mixamorig:RightToeBase" }), enforceContactAnchors: true, enforceGeneratedIK: true,
      kinematicChains: Object.freeze([
        Object.freeze({ id: "left_leg", contact: "left_front_foot", rootBone: "mixamorig:LeftUpLeg", jointBone: "mixamorig:LeftLeg", endBone: "mixamorig:LeftFoot", contactBone: "mixamorig:LeftFoot" }),
        Object.freeze({ id: "right_leg", contact: "right_rear_forefoot", rootBone: "mixamorig:RightUpLeg", jointBone: "mixamorig:RightLeg", endBone: "mixamorig:RightFoot", contactBone: "mixamorig:RightToeBase" })
      ]),
      anchorPhaseId: "split_plant", anchorValidity: Object.freeze({ requiredGroundContacts: LOADED_CONTACTS, rejectAirborneRearToe: true, reviewRule: "Do not descend until the owner-authored split_plant produces valid left-foot and right-forefoot ground anchors." }),
      rule: "Capture anchors at split_plant, preserve them through rep3_top, release before direct return to standing."
    }),
    trajectoryPolicy: Object.freeze({ loadedDescent: verticalDown, loadedAscent: verticalUp, frontFoot: "locked from split_plant through rep3_top", rearForefoot: "locked from split_plant through rep3_top", pelvis: "vertical-only loaded travel in v3.0 calibration baseline", torso: "upright", phaseAuthority: "split_plant bone pose remains constant across provisional loaded phases; root movement + generated IK owns knee bending" }),
    synthesisBoundary: Object.freeze({ method: "phase-first-key-pose-plus-contact-ik", copiedNamedLungeAnimation: false, currentApprovedPose: "split_plant", nextOwnerCalibrationTarget: "rep1_bottom", unsupported: Object.freeze(["biomechanical ground truth","production scoring thresholds","individual anthropometric fit","medical diagnosis"]) }),
    phaseOrder: Object.freeze(["stand_start","split_plant","rep1_descent","rep1_bottom","rep1_top","rep2_descent","rep2_bottom","rep2_top","rep3_descent","rep3_bottom","rep3_top","stand_finish"]),
    phases: Object.freeze([
      phase("stand_start", "setup", 0.00, [0,0,0], STANDING, { contacts: [], movementIntent: "neutral standing" }),
      phase("split_plant", "position", 0.16, [0,0,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, movementIntent: "owner-authored split pose; standing-to-here is the step" }),
      phase("rep1_descent", "eccentric", 0.25, [0,-0.07,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep1_bottom", "isometric", 0.32, [0,-0.14,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12, provisionalBottom: true }),
      phase("rep1_top", "concentric", 0.40, [0,0,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("rep2_descent", "eccentric", 0.48, [0,-0.07,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep2_bottom", "isometric", 0.55, [0,-0.14,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12, provisionalBottom: true }),
      phase("rep2_top", "concentric", 0.63, [0,0,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("rep3_descent", "eccentric", 0.71, [0,-0.07,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalDown }),
      phase("rep3_bottom", "isometric", 0.78, [0,-0.14,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalDown, holdDurationSeconds: 0.12, provisionalBottom: true }),
      phase("rep3_top", "concentric", 0.86, [0,0,0], SPLIT_PLANT, { contacts: LOADED_CONTACTS, trajectory: verticalUp }),
      phase("stand_finish", "completion", 1.00, [0,0,0], STANDING, { contacts: [], movementIntent: "release loaded anchors and return directly to start pose" })
    ])
  });

  function bonePitch(phaseItem, bone) { return phaseItem?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0]; }
  function samePose(a, b) { return JSON.stringify(a?.boneTargets || []) === JSON.stringify(b?.boneTargets || []); }
  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [], bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId","motionId","version","skeleton","durationSeconds","phases","phaseOrder","movementContractRef","repetitionPlan","trajectoryPolicy","lineage","acceptedAuthoringAdjustment"]) if (candidate[field] == null) errors.push(`${field} is required`);
    if (candidate.version !== 3) errors.push("LUNGE_PHASE_FIRST_VERSION: active phase-first lunge must be v3.0");
    if (!(candidate.durationSeconds > 0)) errors.push("durationSeconds must be positive");
    if (candidate.loop !== false) errors.push("phase-first lunge must return to standing instead of looping");
    if (!candidate.groundingPolicy?.enforceContactAnchors) errors.push("lunge requires contact-anchor enforcement");
    if (!candidate.groundingPolicy?.enforceGeneratedIK) errors.push("lunge requires generated two-bone IK enforcement");
    if (candidate.groundingPolicy?.anchorPhaseId !== "split_plant") errors.push("loaded anchors must be established at split_plant");
    if (!candidate.groundingPolicy?.anchorValidity?.rejectAirborneRearToe) errors.push("lunge must reject an airborne rear-toe anchor");
    if (candidate.repetitionPlan?.count !== 3) errors.push("phase-first lunge requires three repetitions");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [], byId = new Map(phases.map(item => [item.id,item]));
    const expectedOrder = ["stand_start","split_plant","rep1_descent","rep1_bottom","rep1_top","rep2_descent","rep2_bottom","rep2_top","rep3_descent","rep3_bottom","rep3_top","stand_finish"];
    if (JSON.stringify(candidate.phaseOrder || []) !== JSON.stringify(expectedOrder)) errors.push("LUNGE_PHASE_ORDER: v3 must transition standing directly to split_plant and directly back to standing");
    if (byId.has("step_forward") || byId.has("step_back")) errors.push("LUNGE_PHASE_FIRST_ENTRY: step_forward/step_back key poses are removed; transitions themselves are the step in/out");
    if (phases[0]?.normalizedTime !== 0 || phases.at(-1)?.normalizedTime !== 1) errors.push("motion must span normalized time 0 through 1");
    for (let i=1;i<phases.length;i+=1) if (!(phases[i].normalizedTime > phases[i-1].normalizedTime)) errors.push(`phase ${phases[i].id} must follow ${phases[i-1].id}`);
    for (const item of phases) for (const t of item.boneTargets || []) if (!bones.has(t.bone)) errors.push(`unknown target bone ${t.bone}`);
    if (!bones.has(candidate.skeleton?.rootBone)) errors.push(`unknown root bone ${candidate.skeleton?.rootBone}`);
    const split = byId.get("split_plant"), requiredSplit = { "mixamorig:LeftUpLeg":79, "mixamorig:LeftLeg":-84, "mixamorig:LeftFoot":8, "mixamorig:RightUpLeg":-49, "mixamorig:RightLeg":-14, "mixamorig:RightFoot":9 };
    for (const [bone,value] of Object.entries(requiredSplit)) if (bonePitch(split,bone) !== value) errors.push(`LUNGE_OWNER_SPLIT_CALIBRATION: ${bone} must be ${value} degrees at split_plant`);
    for (const id of loadedPhaseIds) {
      const item = byId.get(id); if (!item) { errors.push(`missing loaded phase ${id}`); continue; }
      if (!samePose(split,item)) errors.push(`LUNGE_PHASE_POSE_AUTHORITY: ${id} must inherit owner split_plant bone pose in v3.0`);
      if (JSON.stringify(item.contacts || []) !== JSON.stringify(LOADED_CONTACTS)) errors.push(`LUNGE_CONTACTS: ${id} must keep both loaded contacts`);
    }
    const roots = { rep1_descent:-0.07, rep1_bottom:-0.14, rep1_top:0, rep2_descent:-0.07, rep2_bottom:-0.14, rep2_top:0, rep3_descent:-0.07, rep3_bottom:-0.14, rep3_top:0 };
    for (const [id,y] of Object.entries(roots)) { const p = byId.get(id)?.root?.positionOffset; if (!p || p[0]!==0 || p[2]!==0 || p[1]!==y) errors.push(`LUNGE_VERTICAL_ROOT: ${id} must use root [0, ${y}, 0]`); }
    if (!samePose(byId.get("stand_start"),byId.get("stand_finish"))) errors.push("LUNGE_START_FINISH: standing start and finish must match");
    if ((byId.get("stand_start")?.contacts || []).length || (byId.get("stand_finish")?.contacts || []).length) errors.push("LUNGE_START_FINISH_CONTACTS: standing phases cannot keep loaded contacts");
    const canonical = new Map((candidate.acceptedAuthoringAdjustment?.deltas || []).map(item => [item.bone,item.canonicalDegrees]));
    for (const [bone,value] of Object.entries(requiredSplit)) if (canonical.has(bone) && canonical.get(bone)!==value) errors.push(`LUNGE_OWNER_SPLIT_PROVENANCE: ${bone} calibration does not match promoted split pose`);
    return Object.freeze({ valid: errors.length===0, errors: Object.freeze(errors) });
  }
  function summary() { return Object.freeze({ exerciseId: spec.exerciseId, motionId: spec.motionId, version: spec.version, status: spec.status, phaseFirst: true, approvedPose: "split_plant", nextCalibrationTarget: "rep1_bottom", loadedContacts: LOADED_CONTACTS, generatedIK: true, evidenceOnly: true, requiresHumanMoveNetReview: true }); }
  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});