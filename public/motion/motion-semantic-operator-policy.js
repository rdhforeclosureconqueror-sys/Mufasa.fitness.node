(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PocketPTMotionSemanticOperatorPolicy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="1.0.0-yoga-semantic-operators";
  const TARGET_PHASES=Object.freeze(["target","hold"]);
  const f=x=>Object.freeze(x);
  const arr=x=>Object.freeze(x.slice());
  const target=(value)=>f(value);

  function armByEars(){return [
    target({id:"left_arm_by_ear",type:"bone_direction_reference",bone:"LeftArm",childBone:"LeftForeArm",referenceBone:"Neck",referenceChildBone:"Head",phaseIds:TARGET_PHASES,intent:"left upper arm follows neck-to-head ear line"}),
    target({id:"right_arm_by_ear",type:"bone_direction_reference",bone:"RightArm",childBone:"RightForeArm",referenceBone:"Neck",referenceChildBone:"Head",phaseIds:TARGET_PHASES,intent:"right upper arm follows neck-to-head ear line"})
  ];}
  function palmsTogether(){return [
    target({id:"left_palm_in",type:"hand_plane_faces_reference",bone:"LeftHand",childBone:"LeftHandMiddle1",planePointA:"LeftHandIndex1",planePointB:"LeftHandPinky1",referenceBone:"Head",phaseIds:TARGET_PHASES,normalSign:1,intent:"left anatomical palm faces body centerline"}),
    target({id:"right_palm_in",type:"hand_plane_faces_reference",bone:"RightHand",childBone:"RightHandMiddle1",planePointA:"RightHandPinky1",planePointB:"RightHandIndex1",referenceBone:"Head",phaseIds:TARGET_PHASES,normalSign:1,intent:"right anatomical palm faces body centerline"})
  ];}
  function palmsInStanding(){return [
    target({id:"left_palm_in_standing",type:"hand_plane_faces_reference",bone:"LeftHand",childBone:"LeftHandMiddle1",planePointA:"LeftHandIndex1",planePointB:"LeftHandPinky1",referenceBone:"Hips",normalSign:1,intent:"left palm faces inward toward body centerline"}),
    target({id:"right_palm_in_standing",type:"hand_plane_faces_reference",bone:"RightHand",childBone:"RightHandMiddle1",planePointA:"RightHandPinky1",planePointB:"RightHandIndex1",referenceBone:"Hips",normalSign:1,intent:"right palm faces inward toward body centerline"})
  ];}
  function warriorArms(){return [
    target({id:"left_arm_horizontal",type:"bone_direction_world",bone:"LeftArm",childBone:"LeftForeArm",worldDirection:[-1,0,0],phaseIds:TARGET_PHASES,intent:"left arm reaches horizontally away from trunk"}),
    target({id:"right_arm_horizontal",type:"bone_direction_world",bone:"RightArm",childBone:"RightForeArm",worldDirection:[1,0,0],phaseIds:TARGET_PHASES,intent:"right arm reaches horizontally away from trunk"})
  ];}
  function palmsDown(){return [
    target({id:"left_palm_down",type:"hand_plane_faces_world",bone:"LeftHand",childBone:"LeftHandMiddle1",planePointA:"LeftHandIndex1",planePointB:"LeftHandPinky1",worldDirection:[0,-1,0],phaseIds:TARGET_PHASES,normalSign:1,intent:"left anatomical palm faces floor"}),
    target({id:"right_palm_down",type:"hand_plane_faces_world",bone:"RightHand",childBone:"RightHandMiddle1",planePointA:"RightHandPinky1",planePointB:"RightHandIndex1",worldDirection:[0,-1,0],phaseIds:TARGET_PHASES,normalSign:1,intent:"right anatomical palm faces floor"})
  ];}
  function gazeFrontHand(){return [
    target({id:"gaze_front_hand",type:"bone_points_to_reference",bone:"Neck",childBone:"Head",referenceBone:"LeftHand",phaseIds:TARGET_PHASES,intent:"head/neck line turns toward the front hand"})
  ];}
  function neckFollowsSpine(){return [
    target({id:"neck_follows_spine",type:"bone_direction_reference",bone:"Neck",childBone:"Head",referenceBone:"Spine1",referenceChildBone:"Spine2",phaseIds:TARGET_PHASES,intent:"neck continues the current upper-spine direction"})
  ];}

  const BUILDERS=Object.freeze({
    palms_in:palmsInStanding,
    arms_by_ears:armByEars,
    palms_face_each_other:palmsTogether,
    arms_horizontal_opposed:warriorArms,
    palms_down:palmsDown,
    gaze_front_hand:gazeFrontHand,
    neck_follows_spine:neckFollowsSpine
  });
  const DELEGATED=new Set(["bilateral_grounding","generated_leg_ik","dual_foot_grounding","four_point_grounding","feet_grounded","hands_grounded","pelvis_grounded","upper_back_grounded","head_grounded","neutral_stack","split_stance","hips_high","thoracic_extension","hip_extension"]);
  const DEFERRED=Object.freeze({front_knee_track:"RELATIONAL_JOINT_SOLVER",rear_leg_long:"JOINT_EXTENSION_CONSTRAINT",arms_long:"JOINT_EXTENSION_CONSTRAINT",spine_long:"MULTI_SEGMENT_SPINE_CONSTRAINT",shoulders_depressed:"SCAPULAR_ORIENTATION_SOLVER",knees_parallel:"RELATIONAL_JOINT_SOLVER"});

  function compile(requirements){
    const applied=[],delegated=[],deferred=[],unknown=[],targets=[];
    for(const requirement of requirements||[]){
      if(BUILDERS[requirement]){applied.push(requirement);targets.push(...BUILDERS[requirement]());continue;}
      if(DELEGATED.has(requirement)){delegated.push(requirement);continue;}
      if(DEFERRED[requirement]){deferred.push(f({requirement,capability:DEFERRED[requirement]}));continue;}
      unknown.push(requirement);
    }
    if(unknown.length)return f({status:"failed",code:"SEMANTIC_OPERATOR_UNSUPPORTED",diagnostics:f({unknownRequirements:arr(unknown)})});
    const policy=f({mode:"target-rig-body-relative",coordinateSpace:"phase-relative-world",appliesTo:"phase-scoped semantic targets",targets:arr(targets),rule:"Solve declared semantic relationships after each phase's authored root/torso pose; only apply targets to their declared phaseIds."});
    return f({status:"ready",semanticPosePolicy:policy,diagnostics:f({operatorVersion:VERSION,appliedRequirements:arr(applied),delegatedRequirements:arr(delegated),deferredRequirements:arr(deferred),targetCount:targets.length,semanticSolvingApplied:targets.length>0,firstDeferredCapability:deferred[0]?.capability||null})});
  }
  return Object.freeze({VERSION,BUILDERS:Object.freeze(Object.keys(BUILDERS)),DEFERRED,compile});
});
