(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTOverheadSquatAssessmentMotionSpec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CANONICAL_BONES = Object.freeze([
    "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2",
    "mixamorig:LeftArm", "mixamorig:LeftForeArm", "mixamorig:RightArm", "mixamorig:RightForeArm",
    "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot",
    "mixamorig:RightUpLeg", "mixamorig:RightLeg", "mixamorig:RightFoot"
  ]);
  const freezeVec = values => Object.freeze(values.slice());
  const target = (bone, rotationOffsetEulerDegrees) => Object.freeze({ bone, rotationOffsetEulerDegrees: freezeVec(rotationOffsetEulerDegrees) });

  function phase(id, kind, normalizedTime, rootPosition, pose, extra = {}) {
    return Object.freeze({
      id, kind, normalizedTime, interpolation: "quaternion_slerp",
      root: Object.freeze({ positionOffset: freezeVec(rootPosition), positionUnit: "avatar_height", rotationOffsetEulerDegrees: freezeVec([pose.hipPitch, 0, 0]) }),
      boneTargets: Object.freeze([
        target("mixamorig:Spine", [pose.spinePitch, 0, 0]),
        target("mixamorig:Spine1", [pose.spine1Pitch, 0, 0]),
        target("mixamorig:LeftArm", [pose.armPitch, 0, -pose.armOut]),
        target("mixamorig:RightArm", [pose.armPitch, 0, pose.armOut]),
        target("mixamorig:LeftForeArm", [pose.elbowFlex, 0, 0]),
        target("mixamorig:RightForeArm", [pose.elbowFlex, 0, 0]),
        target("mixamorig:LeftUpLeg", [pose.thighPitch, 0, pose.thighOut]),
        target("mixamorig:RightUpLeg", [pose.thighPitch, 0, -pose.thighOut]),
        target("mixamorig:LeftLeg", [pose.kneeFlex, 0, 0]),
        target("mixamorig:RightLeg", [pose.kneeFlex, 0, 0]),
        target("mixamorig:LeftFoot", [pose.anklePitch, 0, 0]),
        target("mixamorig:RightFoot", [pose.anklePitch, 0, 0])
      ]),
      contacts: Object.freeze(["left_foot", "right_foot"]),
      ...extra
    });
  }

  // Lower-body values deliberately reuse the current owner-reviewed squat reference geometry.
  // Overhead arm values are an explicit calibration seed, not claimed biomechanical ground truth.
  const START = Object.freeze({ hipPitch:0, spinePitch:0, spine1Pitch:0, armPitch:-145, armOut:6, elbowFlex:0, thighPitch:0, thighOut:2, kneeFlex:0, anklePitch:0 });
  const MID = Object.freeze({ hipPitch:14, spinePitch:2, spine1Pitch:1, armPitch:-145, armOut:6, elbowFlex:0, thighPitch:61, thighOut:2, kneeFlex:-77, anklePitch:30 });
  const BOTTOM = Object.freeze({ hipPitch:9, spinePitch:15, spine1Pitch:5, armPitch:-145, armOut:6, elbowFlex:0, thighPitch:108, thighOut:2, kneeFlex:-132, anklePitch:35 });

  const contacts = Object.freeze(["left_foot", "right_foot"]);
  const phaseOrder = Object.freeze([
    "setup_overhead",
    "rep1_descent_mid", "rep1_bottom", "rep1_bottom_hold", "rep1_ascent_mid", "rep1_top",
    "rep2_descent_mid", "rep2_bottom", "rep2_bottom_hold", "rep2_ascent_mid", "rep2_top",
    "rep3_descent_mid", "rep3_bottom", "rep3_bottom_hold", "rep3_ascent_mid", "rep3_top",
    "finish_overhead"
  ]);

  const spec = Object.freeze({
    schemaVersion: 1,
    exerciseId: "overhead_squat_assessment",
    motionId: "assessment/overhead_squat_phase_first_v1",
    displayName: "Overhead Squat Assessment v1 — Motion Lab Phase-First Test",
    version: 1,
    status: "development-test-only",
    movementContractRef: "/motion/contracts/overhead-squat-assessment.v1.json",
    skeleton: Object.freeze({ id:"canonical_phase_e_mixamo", rootBone:"mixamorig:Hips", rotationSpace:"rest_relative_local" }),
    durationSeconds: 9.0,
    loop: false,
    movementContract: Object.freeze({
      purpose: "whole-body movement screen demonstration for Motion Lab verification",
      stance: "feet approximately hip-width and directed forward",
      armIntent: "both elbows remain straight while the arms stay overhead with upper arms near the ears",
      trunkIntent: "brace gently and keep the chest tall without manufacturing a rigid perfectly vertical torso",
      descentIntent: "descend under control to a comfortable pain-free depth using coordinated hip, knee and ankle motion",
      ascentIntent: "reverse the same START -> MID -> BOTTOM path as BOTTOM -> MID -> START",
      kneeIntent: "knees track in the same general direction as the feet; no authored valgus compensation",
      footIntent: "both feet remain planted for the entire assessment demonstration",
      repetitionIntent: "perform three repeatable assessment repetitions without changing stance or overhead reach",
      calibrationRule: "position authority before transition authority: visually approve overhead setup and first bottom before tuning the path between them"
    }),
    repetitionPlan: Object.freeze({
      count:3,
      startPhase:"setup_overhead",
      bottomPhases:Object.freeze(["rep1_bottom","rep2_bottom","rep3_bottom"]),
      bottomHoldPhases:Object.freeze(["rep1_bottom_hold","rep2_bottom_hold","rep3_bottom_hold"]),
      ascentMidPhases:Object.freeze(["rep1_ascent_mid","rep2_ascent_mid","rep3_ascent_mid"]),
      topPhases:Object.freeze(["rep1_top","rep2_top","rep3_top"]),
      finishPhase:"finish_overhead"
    }),
    groundingPolicy: Object.freeze({
      mode:"dual-foot-planted-generated-ik-dense-playback",
      contacts,
      contactBones:Object.freeze({ left_foot:"mixamorig:LeftFoot", right_foot:"mixamorig:RightFoot" }),
      enforceContactAnchors:true,
      enforceGeneratedIK:true,
      anchorPhaseId:"setup_overhead",
      continuousSolveSamplesPerTransition:4,
      kinematicChains:Object.freeze([
        Object.freeze({ id:"left_leg", contact:"left_foot", rootBone:"mixamorig:LeftUpLeg", jointBone:"mixamorig:LeftLeg", endBone:"mixamorig:LeftFoot", contactBone:"mixamorig:LeftFoot" }),
        Object.freeze({ id:"right_leg", contact:"right_foot", rootBone:"mixamorig:RightUpLeg", jointBone:"mixamorig:RightLeg", endBone:"mixamorig:RightFoot", contactBone:"mixamorig:RightFoot" })
      ]),
      rule:"Capture bilateral anchors at setup_overhead. Generated leg IK owns foot contact while a dense preview expansion inserts solved intermediate playback samples between named phases."
    }),
    assessmentObservationContract: Object.freeze({
      views:Object.freeze(["front","right_side","back_optional"]),
      checkpoints:Object.freeze([
        "feet_direction", "knee_tracking", "torso_forward_lean", "lumbar_extension_pattern", "arms_overhead_retention"
      ]),
      captureRule:"This Motion Spec only demonstrates the requested assessment movement. Production compensation scoring remains a separate camera/pose-analysis responsibility."
    }),
    synthesisBoundary: Object.freeze({
      method:"phase-first-assessment-description-plus-owner-reviewed-squat-geometry",
      lowerBodySource:"/motion/squat-motion-spec.js",
      overheadPoseStatus:"provisional-owner-calibration-required",
      copiedNamedAnimation:false,
      unsupported:Object.freeze(["medical diagnosis","injury prediction","production scoring thresholds","universal anthropometric fit","claim that provisional overhead joint angles are anatomically exact"])
    }),
    phaseOrder,
    phases:Object.freeze([
      phase("setup_overhead","setup",0.00,[0,0,0],START,{ movementIntent:"establish hip-width stance, bilateral planted feet, straight overhead arms" }),
      phase("rep1_descent_mid","eccentric",0.06,[0,-0.115,-0.050],MID),
      phase("rep1_bottom","isometric",0.12,[0,-0.310,-0.080],BOTTOM,{ reviewCheckpoint:true }),
      phase("rep1_bottom_hold","isometric_hold",0.14,[0,-0.310,-0.080],BOTTOM,{ holdDurationSeconds:0.18 }),
      phase("rep1_ascent_mid","concentric",0.20,[0,-0.115,-0.050],MID),
      phase("rep1_top","concentric",0.28,[0,0,0],START),

      phase("rep2_descent_mid","eccentric",0.36,[0,-0.115,-0.050],MID),
      phase("rep2_bottom","isometric",0.42,[0,-0.310,-0.080],BOTTOM),
      phase("rep2_bottom_hold","isometric_hold",0.44,[0,-0.310,-0.080],BOTTOM,{ holdDurationSeconds:0.18 }),
      phase("rep2_ascent_mid","concentric",0.50,[0,-0.115,-0.050],MID),
      phase("rep2_top","concentric",0.58,[0,0,0],START),

      phase("rep3_descent_mid","eccentric",0.66,[0,-0.115,-0.050],MID),
      phase("rep3_bottom","isometric",0.72,[0,-0.310,-0.080],BOTTOM),
      phase("rep3_bottom_hold","isometric_hold",0.74,[0,-0.310,-0.080],BOTTOM,{ holdDurationSeconds:0.18 }),
      phase("rep3_ascent_mid","concentric",0.80,[0,-0.115,-0.050],MID),
      phase("rep3_top","concentric",0.88,[0,0,0],START),
      phase("finish_overhead","completion",1.00,[0,0,0],START,{ movementIntent:"finish in the same overhead standing assessment position" })
    ])
  });

  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors = [], bones = new Set(availableBones);
    if (!candidate || typeof candidate !== "object") return Object.freeze({ valid:false, errors:Object.freeze(["motion spec must be an object"]) });
    for (const field of ["exerciseId","motionId","version","skeleton","durationSeconds","phases","phaseOrder","movementContractRef","movementContract","repetitionPlan","groundingPolicy","assessmentObservationContract"]) if (candidate[field] == null) errors.push(`${field} is required`);
    if (candidate.exerciseId !== "overhead_squat_assessment") errors.push("OHSA_EXERCISE_ID: overhead squat assessment identity required");
    if (candidate.repetitionPlan?.count !== 3) errors.push("OHSA_REP_COUNT: test contract requires three repetitions");
    if (!candidate.groundingPolicy?.enforceContactAnchors) errors.push("OHSA_GROUNDING: bilateral foot anchors must be enforced");
    if (!candidate.groundingPolicy?.enforceGeneratedIK) errors.push("OHSA_GROUNDING_IK: bilateral generated leg IK must be enforced");
    if (candidate.groundingPolicy?.anchorPhaseId !== "setup_overhead") errors.push("OHSA_ANCHOR_PHASE: setup_overhead must establish bilateral anchors");
    if (!(candidate.groundingPolicy?.continuousSolveSamplesPerTransition >= 2)) errors.push("OHSA_CONTINUOUS_GROUNDING: dense solved playback samples are required");
    const phases = Array.isArray(candidate.phases) ? candidate.phases : [];
    if (JSON.stringify(phases.map(item=>item.id)) !== JSON.stringify(candidate.phaseOrder || [])) errors.push("OHSA_PHASE_ORDER: phaseOrder must match phases");
    if (phases[0]?.normalizedTime !== 0 || phases.at(-1)?.normalizedTime !== 1) errors.push("OHSA_TIME_RANGE: motion must span normalized time 0 through 1");
    for (let i=1;i<phases.length;i+=1) if (!(phases[i].normalizedTime > phases[i-1].normalizedTime)) errors.push(`OHSA_TIME_ORDER: ${phases[i].id} must follow ${phases[i-1].id}`);
    for (const item of phases) {
      if (JSON.stringify(item.contacts || []) !== JSON.stringify(contacts)) errors.push(`OHSA_CONTACTS: dual-foot contact required for ${item.id}`);
      for (const t of item.boneTargets || []) if (!bones.has(t.bone)) errors.push(`OHSA_UNKNOWN_BONE: ${t.bone}`);
      const leftArm = item.boneTargets?.find(t=>t.bone === "mixamorig:LeftArm")?.rotationOffsetEulerDegrees?.[0];
      const rightArm = item.boneTargets?.find(t=>t.bone === "mixamorig:RightArm")?.rotationOffsetEulerDegrees?.[0];
      const leftElbow = item.boneTargets?.find(t=>t.bone === "mixamorig:LeftForeArm")?.rotationOffsetEulerDegrees?.[0];
      const rightElbow = item.boneTargets?.find(t=>t.bone === "mixamorig:RightForeArm")?.rotationOffsetEulerDegrees?.[0];
      if (leftArm !== START.armPitch || rightArm !== START.armPitch) errors.push(`OHSA_ARMS: overhead arm target must remain constant for ${item.id}`);
      if (leftElbow !== 0 || rightElbow !== 0) errors.push(`OHSA_ELBOWS: elbows must remain straight for ${item.id}`);
    }
    for (const rep of [1,2,3]) {
      const byId = new Map(phases.map(item=>[item.id,item]));
      const bottom = byId.get(`rep${rep}_bottom`), hold = byId.get(`rep${rep}_bottom_hold`), ascentMid = byId.get(`rep${rep}_ascent_mid`), descentMid = byId.get(`rep${rep}_descent_mid`);
      if (!bottom || !hold || JSON.stringify(bottom.root) !== JSON.stringify(hold.root) || JSON.stringify(bottom.boneTargets) !== JSON.stringify(hold.boneTargets)) errors.push(`OHSA_BOTTOM_HOLD: rep${rep} must preserve the bottom pose across the hold interval`);
      if (!ascentMid || !descentMid || JSON.stringify(ascentMid.root) !== JSON.stringify(descentMid.root) || JSON.stringify(ascentMid.boneTargets) !== JSON.stringify(descentMid.boneTargets)) errors.push(`OHSA_MIRRORED_ASCENT: rep${rep} ascent must reverse through the same MID geometry`);
    }
    if (!bones.has(candidate.skeleton?.rootBone)) errors.push(`OHSA_ROOT_BONE: unknown root bone ${candidate.skeleton?.rootBone}`);
    return Object.freeze({ valid:errors.length===0, errors:Object.freeze(errors) });
  }

  function summary(candidate = spec) {
    return Object.freeze({
      motionId:candidate.motionId,
      status:candidate.status,
      repetitions:candidate.repetitionPlan?.count || 0,
      phaseOrder:Object.freeze((candidate.phaseOrder || []).slice()),
      observationViews:Object.freeze((candidate.assessmentObservationContract?.views || []).slice()),
      observationCheckpoints:Object.freeze((candidate.assessmentObservationContract?.checkpoints || []).slice()),
      overheadPoseStatus:candidate.synthesisBoundary?.overheadPoseStatus || null,
      requiresHumanVisualCalibration:true,
      productionAssessmentScoring:false
    });
  }

  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});