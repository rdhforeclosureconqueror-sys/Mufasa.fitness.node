(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTLungeMotionSpec = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CANONICAL_BONES = Object.freeze([
    'mixamorig:Hips','mixamorig:Spine','mixamorig:Spine1',
    'mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot','mixamorig:LeftToeBase',
    'mixamorig:RightUpLeg','mixamorig:RightLeg','mixamorig:RightFoot','mixamorig:RightToeBase'
  ]);
  const freezeVec = values => Object.freeze(values.slice());
  const target = (bone, x) => Object.freeze({ bone, rotationOffsetEulerDegrees: freezeVec([x,0,0]) });
  function phase(id, kind, normalizedTime, rootPosition, pose, extra = {}) {
    const { contacts = [], ...rest } = extra;
    return Object.freeze({
      id, kind, normalizedTime, interpolation: 'quaternion_slerp',
      root: Object.freeze({ positionOffset: freezeVec(rootPosition), positionUnit: 'avatar_height', rotationOffsetEulerDegrees: freezeVec([pose.hipPitch,0,0]) }),
      boneTargets: Object.freeze([
        target('mixamorig:Spine', pose.spinePitch), target('mixamorig:Spine1', pose.spine1Pitch),
        target('mixamorig:LeftUpLeg', pose.leftThigh), target('mixamorig:LeftLeg', pose.leftKnee), target('mixamorig:LeftFoot', pose.leftAnkle),
        target('mixamorig:RightUpLeg', pose.rightThigh), target('mixamorig:RightLeg', pose.rightKnee), target('mixamorig:RightFoot', pose.rightAnkle)
      ]),
      contacts: Object.freeze(contacts.slice()), ...rest
    });
  }

  const STANDING = Object.freeze({ hipPitch:0, spinePitch:0, spine1Pitch:0, leftThigh:0, leftKnee:0, leftAnkle:0, rightThigh:0, rightKnee:0, rightAnkle:0 });
  const STEP = Object.freeze({ hipPitch:1, spinePitch:-1, spine1Pitch:0, leftThigh:55, leftKnee:-18, leftAnkle:6, rightThigh:-6, rightKnee:-4, rightAnkle:-1 });
  const SPLIT_TOP = Object.freeze({ hipPitch:2, spinePitch:-1, spine1Pitch:0, leftThigh:40, leftKnee:-10, leftAnkle:4, rightThigh:-34, rightKnee:-6, rightAnkle:-3 });
  const SPLIT_PLANT = Object.freeze({ ...SPLIT_TOP, rightKnee:-1 });
  const DESCENT = Object.freeze({ hipPitch:3, spinePitch:-1, spine1Pitch:0, leftThigh:49, leftKnee:-50, leftAnkle:9, rightThigh:-22, rightKnee:-50, rightAnkle:-5 });
  const BOTTOM = Object.freeze({ hipPitch:3, spinePitch:-1, spine1Pitch:0, leftThigh:58, leftKnee:-88, leftAnkle:12, rightThigh:-12, rightKnee:-92, rightAnkle:-7 });
  const LOADED_CONTACTS = Object.freeze(['left_front_foot','right_rear_forefoot']);
  const verticalDown = Object.freeze({ target:'pelvis', direction:'down', dominantAxis:'vertical', horizontalTravelIntent:'minimal', rearKneeDirection:'down_toward_floor' });
  const verticalUp = Object.freeze({ target:'pelvis', direction:'up', dominantAxis:'vertical', horizontalTravelIntent:'minimal', returnTo:'split_top' });

  const spec = Object.freeze({
    schemaVersion:1,
    exerciseId:'stationary_lunge_left',
    motionId:'lunge/stationary_left_movement_definition_v2_3_owner_split_knee',
    displayName:'Stationary Left Lunge Movement Definition v2.3 — Owner Split-Plant Knee Calibration',
    version:2.3,
    status:'development-test-only',
    sourceManifest:'/motion-sources/stationary-lunge-left-synthesis-v1.source.json',
    movementContractRef:'/motion/contracts/stationary-lunge-left.v2.json',
    skeleton:Object.freeze({ id:'canonical_phase_e_mixamo', rootBone:'mixamorig:Hips', rotationSpace:'rest_relative_local' }),
    durationSeconds:7.2,
    loop:false,
    movementContract:Object.freeze({
      style:'step into a left-forward stationary lunge, complete three controlled repetitions, then step back to standing',
      startAndFinish:'upright neutral standing position',
      setupIntent:'begin from rest-relative standing; create a long split stance before loading',
      stepIntent:'drive the left hip farther into flexion so the left foot travels far enough forward before loading',
      frontKneeBottomInsideAngleTargetDegrees:90, frontKneeBottomToleranceDegrees:10,
      rearKneeBottomInsideAngleTargetDegrees:90, rearKneeBottomToleranceDegrees:15,
      descentIntent:'after the feet are planted, drive the pelvis mostly straight down instead of translating forward',
      rearKneeIntent:'right rear knee tracks down toward the floor while the right forefoot remains planted',
      frontShinIntent:'front shin remains approximately vertical at the bottom',
      ascentIntent:'drive the pelvis mostly straight up to the same split-stance top',
      exitIntent:'release loaded split-stance contact authority before step_back',
      torsoIntent:'remain tall with only small balance lean', armsPriority:'secondary-after-lower-body-approval'
    }),
    authoringGeometryGate:Object.freeze({
      purpose:'Reject short entry geometry that contradicts the declared 90-degree lunge target.',
      stepForwardMinimumLeftHipFlexionDegrees:50,
      splitPlantMinimumLeftHipFlexionDegrees:35,
      splitPlantMinimumRearHipExtensionDegrees:30,
      bottomMinimumFrontKneeFlexionOffsetDegrees:80,
      bottomMinimumRearKneeFlexionOffsetDegrees:85,
      targetFrontKneeInsideAngleDegrees:90,
      targetFrontKneeToleranceDegrees:10,
      firstFailingBoundary:'LUNGE_ENTRY_GEOMETRY'
    }),
    ownerCalibration:Object.freeze({
      phaseId:'split_plant', target:'right_knee', bone:'mixamorig:RightLeg', axis:'x',
      approvedDeltaDegrees:5, v22BasePitchDegrees:-6, requiredPitchDegrees:-1,
      firstFailingBoundary:'LUNGE_OWNER_CALIBRATION',
      scope:'split_plant_only',
      note:'Owner-approved Motion Lab correction. Repetition-top SPLIT_TOP remains at the v2.2 -6 degree pitch until separately reviewed.'
    }),
    repetitionPlan:Object.freeze({ count:3, entryPhase:'split_plant', loadedTopPhases:Object.freeze(['rep1_top','rep2_top','rep3_top']), bottomPhases:Object.freeze(['rep1_bottom','rep2_bottom','rep3_bottom']), exitPhase:'step_back', rule:'Feet remain anchored through all three repetitions; release loaded authority before step_back.' }),
    groundingPolicy:Object.freeze({
      mode:'phase-aware-step-in-then-split-stance-anchor-lock', contacts:LOADED_CONTACTS,
      contactBones:Object.freeze({ left_front_foot:'mixamorig:LeftFoot', right_rear_forefoot:'mixamorig:RightToeBase' }),
      enforceContactAnchors:true, enforceGeneratedIK:true,
      kinematicChains:Object.freeze([
        Object.freeze({ id:'left_leg', contact:'left_front_foot', rootBone:'mixamorig:LeftUpLeg', jointBone:'mixamorig:LeftLeg', endBone:'mixamorig:LeftFoot', contactBone:'mixamorig:LeftFoot' }),
        Object.freeze({ id:'right_leg', contact:'right_rear_forefoot', rootBone:'mixamorig:RightUpLeg', jointBone:'mixamorig:RightLeg', endBone:'mixamorig:RightFoot', contactBone:'mixamorig:RightToeBase' })
      ]),
      anchorPhaseId:'split_plant',
      anchorValidity:Object.freeze({ requiredGroundContacts:LOADED_CONTACTS, rejectAirborneRearToe:true, reviewRule:'Do not begin loaded descent until split_plant has both support contacts on the ground plane.' }),
      rule:'Capture both loaded anchors at split_plant, preserve them through rep3_top, then release before step_back.'
    }),
    trajectoryPolicy:Object.freeze({ loadedDescent:verticalDown, loadedAscent:verticalUp, frontFoot:'plant split_plant through rep3_top', rearForefoot:'plant split_plant through rep3_top', frontKnee:'approach 90 degrees', frontShin:'approximately vertical', rearKnee:'approach floor by moving downward', torso:'upright' }),
    synthesisBoundary:Object.freeze({ method:'movement-lego-composition-with-phase-aware-contact-constraints-entry-geometry-gate-and-owner-calibration', copiedNamedLungeAnimation:false, unsupported:Object.freeze(['biomechanical ground truth','production scoring thresholds','individual anthropometric fit','medical diagnosis']) }),
    phaseOrder:Object.freeze(['stand_start','step_forward','split_plant','rep1_descent','rep1_bottom','rep1_top','rep2_descent','rep2_bottom','rep2_top','rep3_descent','rep3_bottom','rep3_top','step_back','stand_finish']),
    phases:Object.freeze([
      phase('stand_start','setup',0.00,[0,0,0],STANDING,{ contacts:[], movementIntent:'neutral standing' }),
      phase('step_forward','transition',0.08,[0,0,0],STEP,{ contacts:[], movementIntent:'long forward step before loading' }),
      phase('split_plant','position',0.16,[0,0,0],SPLIT_PLANT,{ contacts:LOADED_CONTACTS, movementIntent:'owner-calibrated split plant' }),
      phase('rep1_descent','eccentric',0.25,[0,-0.07,0],DESCENT,{ contacts:LOADED_CONTACTS, trajectory:verticalDown }),
      phase('rep1_bottom','isometric',0.32,[0,-0.14,0],BOTTOM,{ contacts:LOADED_CONTACTS, trajectory:verticalDown, holdDurationSeconds:0.12 }),
      phase('rep1_top','concentric',0.40,[0,0,0],SPLIT_TOP,{ contacts:LOADED_CONTACTS, trajectory:verticalUp }),
      phase('rep2_descent','eccentric',0.48,[0,-0.07,0],DESCENT,{ contacts:LOADED_CONTACTS, trajectory:verticalDown }),
      phase('rep2_bottom','isometric',0.55,[0,-0.14,0],BOTTOM,{ contacts:LOADED_CONTACTS, trajectory:verticalDown, holdDurationSeconds:0.12 }),
      phase('rep2_top','concentric',0.63,[0,0,0],SPLIT_TOP,{ contacts:LOADED_CONTACTS, trajectory:verticalUp }),
      phase('rep3_descent','eccentric',0.71,[0,-0.07,0],DESCENT,{ contacts:LOADED_CONTACTS, trajectory:verticalDown }),
      phase('rep3_bottom','isometric',0.78,[0,-0.14,0],BOTTOM,{ contacts:LOADED_CONTACTS, trajectory:verticalDown, holdDurationSeconds:0.12 }),
      phase('rep3_top','concentric',0.86,[0,0,0],SPLIT_TOP,{ contacts:LOADED_CONTACTS, trajectory:verticalUp }),
      phase('step_back','transition',0.94,[0,0,0],STEP,{ contacts:[], movementIntent:'loaded anchors released; return toward standing' }),
      phase('stand_finish','completion',1.00,[0,0,0],STANDING,{ contacts:[], movementIntent:'same neutral standing pose as start' })
    ])
  });

  function bonePitch(item,bone){ return item?.boneTargets?.find(t=>t.bone===bone)?.rotationOffsetEulerDegrees?.[0]; }
  function validate(candidate, availableBones = CANONICAL_BONES) {
    const errors=[]; const bones=new Set(availableBones); const phases=Array.isArray(candidate?.phases)?candidate.phases:[];
    if (!candidate || typeof candidate !== 'object') return Object.freeze({ valid:false, errors:Object.freeze(['motion spec must be an object']) });
    for (const field of ['exerciseId','motionId','version','skeleton','durationSeconds','phases','phaseOrder','movementContractRef','repetitionPlan','trajectoryPolicy','authoringGeometryGate','ownerCalibration']) if (candidate[field] == null) errors.push(`${field} is required`);
    if (!(candidate.durationSeconds>0)) errors.push('durationSeconds must be positive');
    if (candidate.loop!==false) errors.push('step-in lunge must finish at standing');
    if (!candidate.groundingPolicy?.enforceContactAnchors || !candidate.groundingPolicy?.enforceGeneratedIK) errors.push('lunge requires contact anchors and generated IK');
    if (candidate.groundingPolicy?.anchorPhaseId!=='split_plant') errors.push('loaded anchors must begin at split_plant');
    if (candidate.repetitionPlan?.count!==3) errors.push('lunge requires three authored repetitions');
    if (JSON.stringify(phases.map(p=>p.id))!==JSON.stringify(candidate.phaseOrder||[])) errors.push('phaseOrder must match phases');
    let previous=-1; for(const p of phases){ if(!Number.isFinite(p.normalizedTime)||p.normalizedTime<=previous||p.normalizedTime<0||p.normalizedTime>1) errors.push(`invalid normalized time for ${p.id}`); previous=p.normalizedTime; for(const t of p.boneTargets||[]) if(!bones.has(t.bone)) errors.push(`unknown bone target ${t.bone}`); }
    const start=phases.find(p=>p.id==='stand_start'), finish=phases.find(p=>p.id==='stand_finish');
    if(!start||!finish||JSON.stringify(start.root)!==JSON.stringify(finish.root)||JSON.stringify(start.boneTargets)!==JSON.stringify(finish.boneTargets)) errors.push('stand_start and stand_finish must match');
    const split=phases.find(p=>p.id==='split_plant'), step=phases.find(p=>p.id==='step_forward'), gate=candidate.authoringGeometryGate||{};
    if(JSON.stringify(split?.contacts||[])!==JSON.stringify(LOADED_CONTACTS)) errors.push('split_plant must establish both loaded contacts');
    if(!(bonePitch(step,'mixamorig:LeftUpLeg')>=gate.stepForwardMinimumLeftHipFlexionDegrees)) errors.push('LUNGE_ENTRY_GEOMETRY: step_forward stride is too short');
    if(!(bonePitch(split,'mixamorig:LeftUpLeg')>=gate.splitPlantMinimumLeftHipFlexionDegrees) || !(Math.abs(bonePitch(split,'mixamorig:RightUpLeg'))>=gate.splitPlantMinimumRearHipExtensionDegrees)) errors.push('LUNGE_ENTRY_GEOMETRY: split_plant stance is too short');
    for(const id of candidate.repetitionPlan?.bottomPhases||[]){ const p=phases.find(x=>x.id===id); if(Math.abs(bonePitch(p,'mixamorig:LeftLeg')||0)<gate.bottomMinimumFrontKneeFlexionOffsetDegrees||Math.abs(bonePitch(p,'mixamorig:RightLeg')||0)<gate.bottomMinimumRearKneeFlexionOffsetDegrees) errors.push(`LUNGE_BOTTOM_GEOMETRY: ${id} does not meet authored knee-flexion gate`); }
    const calibrated=bonePitch(split,candidate.ownerCalibration?.bone); if(calibrated!==candidate.ownerCalibration?.requiredPitchDegrees) errors.push(`LUNGE_OWNER_CALIBRATION: split_plant right-knee pitch ${calibrated}° must equal ${candidate.ownerCalibration?.requiredPitchDegrees}°`);
    for(const id of ['rep1_top','rep2_top','rep3_top']) if(bonePitch(phases.find(p=>p.id===id),'mixamorig:RightLeg')!==-6) errors.push(`${id} must preserve unreviewed v2.2 right-knee pitch -6°`);
    const exit=phases.find(p=>p.id==='step_back'); if((exit?.contacts||[]).length) errors.push('step_back must release loaded split-stance contact authority');
    return Object.freeze({ valid:errors.length===0, errors:Object.freeze(errors) });
  }
  function summary(candidate=spec){ return Object.freeze({ motionId:candidate.motionId, version:candidate.version, status:candidate.status, durationSeconds:candidate.durationSeconds, phaseOrder:Object.freeze(candidate.phaseOrder.slice()), repetitionCount:candidate.repetitionPlan.count, frontKneeTargetDegrees:candidate.movementContract.frontKneeBottomInsideAngleTargetDegrees, rearKneeTargetDegrees:candidate.movementContract.rearKneeBottomInsideAngleTargetDegrees, ownerSplitPlantRightKneePitchDegrees:candidate.ownerCalibration.requiredPitchDegrees, geometryGateBoundary:candidate.authoringGeometryGate.firstFailingBoundary, ownerCalibrationBoundary:candidate.ownerCalibration.firstFailingBoundary, evidenceOnly:true, requiresHumanMoveNetReview:true }); }
  return Object.freeze({ CANONICAL_BONES, spec, validate, summary });
});
