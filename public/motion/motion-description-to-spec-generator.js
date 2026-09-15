(function(root,factory){
  const policy=typeof module==="object"&&module.exports?require("./motion-support-operator-policy"):root.PocketPTMotionSupportOperatorPolicy;
  const api=factory(policy);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PocketPTMotionDescriptionGenerator=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(supportPolicy){
  "use strict";
  const VERSION="2.0.0-description-operator-translation";
  const OPERATOR_TRANSLATOR_VERSION="1.0.0-classification-to-semantic-operators";
  const BONES=Object.freeze({hips:"Hips",spine:"Spine",spine1:"Spine1",spine2:"Spine2",neck:"Neck",head:"Head",lShoulder:"LeftShoulder",rShoulder:"RightShoulder",lArm:"LeftArm",lFore:"LeftForeArm",lHand:"LeftHand",lMiddle:"LeftHandMiddle1",lIndex:"LeftHandIndex1",lPinky:"LeftHandPinky1",rArm:"RightArm",rFore:"RightForeArm",rHand:"RightHand",rMiddle:"RightHandMiddle1",rIndex:"RightHandIndex1",rPinky:"RightHandPinky1",lThigh:"LeftUpLeg",lLeg:"LeftLeg",lFoot:"LeftFoot",rThigh:"RightUpLeg",rLeg:"RightLeg",rFoot:"RightFoot"});
  const CLASSIFICATION_ARCHETYPES=Object.freeze({
    "bilateral-squat":"bilateral-squat-overhead-hold",
    "standing-split-stance":"wide-split-stance-lateral-reach",
    "four-point-inverted-hip-hinge":"inverted-v-four-point",
    "prone-spinal-extension":"prone-spinal-extension",
    "supine-hip-extension":"supine-hip-extension",
    "neutral-standing":"neutral-standing-hold"
  });
  const v=x=>Object.freeze(x.slice());
  const target=(bone,e)=>Object.freeze({bone,rotationOffsetEulerDegrees:v(e)});
  function phase(id,t,root,targets,contacts=[]){return Object.freeze({id,kind:"generated",normalizedTime:t,interpolation:"quaternion_slerp",root:Object.freeze({positionOffset:v(root.pos||[0,0,0]),positionUnit:"avatar_height",rotationOffsetEulerDegrees:v(root.rot||[0,0,0])}),boneTargets:Object.freeze(targets),contacts:Object.freeze(contacts.slice())});}
  function baseTargets(){return [target(BONES.spine,[0,0,0]),target(BONES.spine1,[0,0,0]),target(BONES.spine2,[0,0,0]),target(BONES.lArm,[0,0,0]),target(BONES.lFore,[0,0,0]),target(BONES.rArm,[0,0,0]),target(BONES.rFore,[0,0,0]),target(BONES.lThigh,[0,0,0]),target(BONES.lLeg,[0,0,0]),target(BONES.lFoot,[0,0,0]),target(BONES.rThigh,[0,0,0]),target(BONES.rLeg,[0,0,0]),target(BONES.rFoot,[0,0,0])];}
  function neutralStandingTargets(){return replace(baseTargets(),{[BONES.lArm]:[0,0,88],[BONES.rArm]:[0,0,-88]});}
  function replace(base,mods){const map=new Map(base.map(x=>[x.bone,x]));Object.entries(mods).forEach(([bone,e])=>map.set(bone,target(bone,e)));return [...map.values()];}
  function timing(plan){const p=plan.parameters||{},entry=Math.max(.5,Number(p.entrySeconds)||2),hold=Math.max(.1,Number(p.holdSeconds)||3),exit=Math.max(.5,Number(p.exitSeconds)||2),duration=entry+hold+exit;return {duration,targetTime:entry/duration,holdTime:(entry+hold)/duration};}
  function threePhase(plan,targetTargets,targetRoot={pos:[0,0,0],rot:[0,0,0]},base=baseTargets()){const x=timing(plan);return {duration:x.duration,phases:[phase("start",0,{pos:[0,0,0],rot:[0,0,0]},base),phase("target",x.targetTime,targetRoot,targetTargets),phase("hold",x.holdTime,targetRoot,targetTargets),phase("finish",1,{pos:[0,0,0],rot:[0,0,0]},base)]};}
  function chairPhases(plan){
    const x=timing(plan),stand=neutralStandingTargets();
    const mid=replace(stand,{[BONES.spine]:[4,0,0],[BONES.spine1]:[2,0,0],[BONES.lThigh]:[42,0,2],[BONES.rThigh]:[42,0,-2],[BONES.lLeg]:[-55,0,0],[BONES.rLeg]:[-55,0,0],[BONES.lFoot]:[18,0,0],[BONES.rFoot]:[18,0,0]});
    const bottom=replace(stand,{[BONES.spine]:[12,0,0],[BONES.spine1]:[5,0,0],[BONES.lThigh]:[78,0,2],[BONES.rThigh]:[78,0,-2],[BONES.lLeg]:[-95,0,0],[BONES.rLeg]:[-95,0,0],[BONES.lFoot]:[28,0,0],[BONES.rFoot]:[28,0,0]});
    const descentTime=Math.max(.08,x.targetTime*.5),ascentTime=x.holdTime+(1-x.holdTime)*.5;
    return {duration:x.duration,phases:[
      phase("start",0,{pos:[0,0,0],rot:[0,0,0]},stand),
      phase("descent",descentTime,{pos:[0,-.11,-.04],rot:[5,0,0]},mid),
      phase("target",x.targetTime,{pos:[0,-.22,-.05],rot:[10,0,0]},bottom),
      phase("hold",x.holdTime,{pos:[0,-.22,-.05],rot:[10,0,0]},bottom),
      phase("ascent",ascentTime,{pos:[0,-.11,-.04],rot:[5,0,0]},mid),
      phase("finish",1,{pos:[0,0,0],rot:[0,0,0]},stand)
    ]};
  }
  function floorPhase(plan,setupTargets,setupRoot,targetTargets,targetRoot){const x=timing(plan);return {duration:x.duration,phases:[phase("start",0,setupRoot,setupTargets),phase("target",x.targetTime,targetRoot,targetTargets),phase("hold",x.holdTime,targetRoot,targetTargets),phase("finish",1,setupRoot,setupTargets)]};}
  const ARCHETYPES=Object.freeze({
    "neutral-standing-hold":plan=>threePhase(plan,baseTargets()),
    "bilateral-squat-overhead-hold":plan=>chairPhases(plan),
    "wide-split-stance-lateral-reach":plan=>{const stand=neutralStandingTargets(),t=replace(stand,{[BONES.lThigh]:[20,0,18],[BONES.lLeg]:[-45,0,0],[BONES.rThigh]:[-8,0,-20],[BONES.rLeg]:[-8,0,0]});return threePhase(plan,t,{pos:[0,-.10,0],rot:[0,0,0]},stand);},
    "inverted-v-four-point":plan=>{const base=baseTargets(),t=replace(base,{[BONES.spine]:[20,0,0],[BONES.spine1]:[10,0,0],[BONES.lThigh]:[-55,0,0],[BONES.rThigh]:[-55,0,0],[BONES.lLeg]:[18,0,0],[BONES.rLeg]:[18,0,0]});return threePhase(plan,t,{pos:[0,-.55,0],rot:[65,0,0]},base);},
    "prone-spinal-extension":plan=>{const base=baseTargets(),setup=base,targetPose=replace(base,{[BONES.spine]:[-22,0,0],[BONES.spine1]:[-18,0,0],[BONES.spine2]:[-10,0,0]});return floorPhase(plan,setup,{pos:[0,-.78,0],rot:[90,0,0]},targetPose,{pos:[0,-.78,0],rot:[90,0,0]});},
    "supine-hip-extension":plan=>{const base=baseTargets(),setup=replace(base,{[BONES.lThigh]:[58,0,0],[BONES.rThigh]:[58,0,0],[BONES.lLeg]:[-92,0,0],[BONES.rLeg]:[-92,0,0],[BONES.lArm]:[0,0,-12],[BONES.rArm]:[0,0,12]}),targetPose=replace(setup,{[BONES.spine]:[-10,0,0],[BONES.spine1]:[8,0,0]});return floorPhase(plan,setup,{pos:[0,-.62,0],rot:[-90,0,0]},targetPose,{pos:[0,-.47,0],rot:[-90,0,0]});}
  });

  function activePhaseIds(phases,mode){
    const ids=(phases||[]).map(x=>x.id);
    if(mode==="all")return Object.freeze(ids);
    const loaded=ids.filter(id=>!["start","finish"].includes(id));
    return Object.freeze(loaded.length?loaded:ids.filter(id=>id==="target"||id==="hold"));
  }
  function semanticTarget(id,type,values){return Object.freeze({id,type,...values});}
  function operator(id,category,source){return Object.freeze({id,category,source});}
  function classificationMismatch(descriptionClass,planClass){
    if(!planClass)return null;
    for(const key of ["movementFamily","supportPattern","lowerBodyPattern","trunkPattern","armPathPattern","headPattern"]){
      if(descriptionClass?.[key]&&planClass?.[key]&&descriptionClass[key]!==planClass[key])return key;
    }
    return null;
  }
  function translateDescriptionToOperators(description,plan,phases){
    const c=description?.movementClassification||null;
    const prohibited=Object.freeze((description?.directionalRules?.prohibitedTrajectories||[]).slice());
    if(!c)return Object.freeze({status:"ready",consumed:false,movementFamily:null,selectedOperators:Object.freeze([]),prohibitedTrajectories:prohibited,semanticPosePolicy:null});
    const mismatch=classificationMismatch(c,plan?.movementClassification);
    if(mismatch)return Object.freeze({status:"failed",code:"GEN_CLASSIFICATION_PLAN_MISMATCH",diagnostics:Object.freeze({field:mismatch,descriptionValue:c[mismatch],planValue:plan?.movementClassification?.[mismatch]})});
    const selected=[
      operator(`support:${c.supportPattern||"unspecified"}`,"support","movementClassification.supportPattern"),
      operator(`lower:${c.lowerBodyPattern||"unspecified"}`,"lower-body","movementClassification.lowerBodyPattern"),
      operator(`trunk:${c.trunkPattern||"unspecified"}`,"trunk","movementClassification.trunkPattern"),
      operator(`head:${c.headPattern||"unspecified"}`,"head","movementClassification.headPattern")
    ];
    const targets=[];
    const armPattern=c.armPathPattern||null;
    if(armPattern==="overhead-ear-line-reach"){
      const active=activePhaseIds(phases,"loaded");
      selected.push(operator("arm:ear-line-overhead","arm-path","movementClassification.armPathPattern"),operator("hands:palms-in","hand-orientation","orientation"));
      targets.push(
        semanticTarget("left_upper_arm_ear_line","bone_direction_reference",{bone:BONES.lArm,childBone:BONES.lFore,referenceBone:BONES.neck,referenceChildBone:BONES.head,activePhaseIds:active}),
        semanticTarget("right_upper_arm_ear_line","bone_direction_reference",{bone:BONES.rArm,childBone:BONES.rFore,referenceBone:BONES.neck,referenceChildBone:BONES.head,activePhaseIds:active}),
        semanticTarget("left_palm_in","hand_plane_faces_reference",{bone:BONES.lHand,childBone:BONES.lMiddle,planePointA:BONES.lIndex,planePointB:BONES.lPinky,referenceBone:BONES.head,normalSign:1,activePhaseIds:active}),
        semanticTarget("right_palm_in","hand_plane_faces_reference",{bone:BONES.rHand,childBone:BONES.rMiddle,planePointA:BONES.rPinky,planePointB:BONES.rIndex,referenceBone:BONES.head,normalSign:1,activePhaseIds:active})
      );
    }else if(armPattern==="opposed-lateral-reach-from-shoulders"){
      const active=activePhaseIds(phases,"loaded");
      selected.push(operator("arm:opposed-lateral-shoulder-axis","arm-path","movementClassification.armPathPattern"));
      targets.push(
        semanticTarget("left_arm_lateral","bone_direction_reference",{bone:BONES.lArm,childBone:BONES.lFore,referenceBone:BONES.rShoulder,referenceChildBone:BONES.lShoulder,activePhaseIds:active}),
        semanticTarget("right_arm_lateral","bone_direction_reference",{bone:BONES.rArm,childBone:BONES.rFore,referenceBone:BONES.lShoulder,referenceChildBone:BONES.rShoulder,activePhaseIds:active})
      );
    }else if(armPattern==="forward-support-line-from-shoulders"){
      const active=activePhaseIds(phases,"loaded");
      selected.push(operator("arm:forward-support-ear-line","arm-path","movementClassification.armPathPattern"));
      targets.push(
        semanticTarget("left_arm_forward_support","bone_direction_reference",{bone:BONES.lArm,childBone:BONES.lFore,referenceBone:BONES.neck,referenceChildBone:BONES.head,activePhaseIds:active}),
        semanticTarget("right_arm_forward_support","bone_direction_reference",{bone:BONES.rArm,childBone:BONES.rFore,referenceBone:BONES.neck,referenceChildBone:BONES.head,activePhaseIds:active})
      );
    }else if(armPattern==="hands-fixed-elbows-track-back-beside-ribs"){
      const active=activePhaseIds(phases,"all");
      selected.push(operator("arm:ribside-elbows-toward-pelvis","arm-path","movementClassification.armPathPattern"),operator("hands:contact-lock","endpoint-contact","supports"));
      targets.push(
        semanticTarget("left_upper_arm_ribside","bone_direction_reference",{bone:BONES.lArm,childBone:BONES.lFore,referenceBone:BONES.spine2,referenceChildBone:BONES.hips,activePhaseIds:active}),
        semanticTarget("right_upper_arm_ribside","bone_direction_reference",{bone:BONES.rArm,childBone:BONES.rFore,referenceBone:BONES.spine2,referenceChildBone:BONES.hips,activePhaseIds:active})
      );
    }else if(armPattern){
      return Object.freeze({status:"failed",code:"GEN_ARM_PATH_OPERATOR_UNSUPPORTED",diagnostics:Object.freeze({armPathPattern:armPattern})});
    }
    if(prohibited.some(x=>/behind|posterior|backward/i.test(x)))selected.push(operator("guard:no-posterior-arm-sweep","trajectory-guard","directionalRules.prohibitedTrajectories"));
    const semanticPosePolicy=targets.length?Object.freeze({mode:"target-rig-body-relative",coordinateSpace:"phase-relative-world",targets:Object.freeze(targets),rule:`Generated from description armPathPattern=${armPattern}; description semantics are authoritative.`}):null;
    return Object.freeze({status:"ready",consumed:true,movementFamily:c.movementFamily||null,selectedOperators:Object.freeze(selected),prohibitedTrajectories:prohibited,semanticPosePolicy});
  }

  function resolvedArchetype(request,plan){
    const c=request?.description?.movementClassification;
    if(!c)return Object.freeze({status:"ready",archetype:plan?.archetype||null,classificationConsumed:false});
    const archetype=CLASSIFICATION_ARCHETYPES[c.movementFamily];
    if(!archetype)return Object.freeze({status:"failed",code:"GEN_MOVEMENT_FAMILY_UNSUPPORTED",diagnostics:Object.freeze({movementFamily:c.movementFamily||null})});
    if(plan?.archetype&&plan.archetype!==archetype)return Object.freeze({status:"failed",code:"GEN_CLASSIFICATION_ARCHETYPE_MISMATCH",diagnostics:Object.freeze({movementFamily:c.movementFamily,expectedArchetype:archetype,planArchetype:plan.archetype})});
    return Object.freeze({status:"ready",archetype,classificationConsumed:true});
  }
  function validateRequest(request,plan){const errors=[];if(request?.requestType!=="motion-description-to-draft")errors.push("GEN_REQUEST_TYPE");if(!request?.exerciseId)errors.push("GEN_EXERCISE_ID");if(!request?.description)errors.push("GEN_DESCRIPTION");if(!plan)errors.push("GEN_PLAN_MISSING");if(plan&&plan.exerciseId!==request.exerciseId)errors.push("GEN_PLAN_EXERCISE_MISMATCH");if(!supportPolicy?.compile)errors.push("GEN_SUPPORT_POLICY_UNAVAILABLE");return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors)});}
  function generate(request,plan){
    const check=validateRequest(request,plan);if(!check.valid)return Object.freeze({status:"failed",code:check.errors[0],diagnostics:Object.freeze({errors:check.errors})});
    const resolved=resolvedArchetype(request,plan);if(resolved.status!=="ready")return resolved;
    if(!ARCHETYPES[resolved.archetype])return Object.freeze({status:"failed",code:"GEN_ARCHETYPE_UNSUPPORTED",diagnostics:Object.freeze({archetype:resolved.archetype})});
    const built=ARCHETYPES[resolved.archetype](plan);
    const translated=translateDescriptionToOperators(request.description,plan,built.phases);if(translated.status!=="ready")return translated;
    const support=supportPolicy.compile({...plan,archetype:resolved.archetype},built.phases);
    if(support.status!=="ready")return Object.freeze({status:"failed",code:support.code||"GEN_SUPPORT_POLICY_FAILED",diagnostics:support.diagnostics||null});
    const generationMetadata=Object.freeze({generatorVersion:VERSION,descriptionOperatorTranslatorVersion:OPERATOR_TRANSLATOR_VERSION,generatedDraft:true,archetype:resolved.archetype,descriptionClassificationConsumed:translated.consumed,movementClassification:request.description?.movementClassification?Object.freeze({...request.description.movementClassification}):null,selectedMovementOperators:translated.selectedOperators,prohibitedTrajectories:translated.prohibitedTrajectories,semanticRequirements:Object.freeze((plan.semanticRequirements||[]).slice()),descriptionAuthority:true,humanVisualAcceptanceRequired:true,supportOperatorVersion:supportPolicy.VERSION});
    const spec=Object.freeze({schemaVersion:1,exerciseId:request.exerciseId,motionId:`generated/yoga/${request.exerciseId}/v1`,displayName:`${request.displayName} — Generated Draft`,version:1,status:"development-test-only",durationSeconds:built.duration,loop:false,skeleton:Object.freeze({id:"avaturn-native-v1",rootBone:BONES.hips,targetSkeletonProfile:"avaturn-native-v1",rotationSpace:"rest_relative_local"}),coachRetarget:Object.freeze({targetAvatarProfileId:"avaturn-personalized-candidate",targetSkeletonProfile:"avaturn-native-v1",source:"motion-description-generator-v2"}),generationMetadata,...(translated.semanticPosePolicy?{semanticPosePolicy:translated.semanticPosePolicy}:{}),trajectoryValidationPolicy:Object.freeze({prohibitedTrajectories:translated.prohibitedTrajectories,mode:"description-declared-keyframe-semantic-guard"}),groundingPolicy:support.groundingPolicy,surfaceSupportPolicy:support.surfaceSupportPolicy,phases:support.phases});
    const contract=Object.freeze({spec,validate(candidate){const errors=[];if(!candidate?.motionId)errors.push("motionId required");if(!Array.isArray(candidate?.phases)||candidate.phases.length<2)errors.push("phases required");if(candidate?.skeleton?.targetSkeletonProfile!=="avaturn-native-v1")errors.push("Coach target required");if(candidate?.generationMetadata?.movementClassification&&!candidate?.generationMetadata?.descriptionClassificationConsumed)errors.push("classified description was not consumed");if(candidate?.groundingPolicy?.enforceContactAnchors&&!candidate.groundingPolicy.anchorPhaseId)errors.push("contact anchor phase required");if(candidate?.surfaceSupportPolicy?.constraints?.length&&!candidate.surfaceSupportPolicy.anchorPhaseId)errors.push("surface anchor phase required");return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors)});}});
    return Object.freeze({status:"ready",spec,contract,diagnostics:Object.freeze({generatorVersion:VERSION,descriptionOperatorTranslatorVersion:OPERATOR_TRANSLATOR_VERSION,descriptionClassificationConsumed:translated.consumed,movementFamily:translated.movementFamily,selectedMovementOperators:translated.selectedOperators,prohibitedTrajectories:translated.prohibitedTrajectories,exerciseId:request.exerciseId,archetype:resolved.archetype,phaseCount:spec.phases.length,durationSeconds:spec.durationSeconds,semanticRequirements:Object.freeze((plan.semanticRequirements||[]).slice()),supports:Object.freeze((plan.supports||[]).slice()),supportOperators:support.diagnostics,contactSolvingDeferred:false,endpointContactSolvingApplied:support.diagnostics.endpointContactSolvingApplied,bodySurfaceSolvingApplied:support.diagnostics.bodySurfaceSolvingApplied,surfaceSupportSolvingDeferred:false,firstDeferredCapability:null})});
  }
  return Object.freeze({VERSION,OPERATOR_TRANSLATOR_VERSION,ARCHETYPES:Object.freeze(Object.keys(ARCHETYPES)),CLASSIFICATION_ARCHETYPES,translateDescriptionToOperators,resolvedArchetype,validateRequest,generate});
});
