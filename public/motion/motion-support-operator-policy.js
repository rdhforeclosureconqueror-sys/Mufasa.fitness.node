(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PocketPTMotionSupportOperatorPolicy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="1.1.0-body-surface-supports";
  const ENDPOINTS=Object.freeze({
    left_foot:Object.freeze({contact:"left_foot",bone:"LeftFoot",chain:Object.freeze({id:"left_leg",contact:"left_foot",rootBone:"LeftUpLeg",jointBone:"LeftLeg",endBone:"LeftFoot",contactBone:"LeftFoot"})}),
    right_foot:Object.freeze({contact:"right_foot",bone:"RightFoot",chain:Object.freeze({id:"right_leg",contact:"right_foot",rootBone:"RightUpLeg",jointBone:"RightLeg",endBone:"RightFoot",contactBone:"RightFoot"})}),
    left_hand:Object.freeze({contact:"left_hand",bone:"LeftHand",chain:Object.freeze({id:"left_arm",contact:"left_hand",rootBone:"LeftArm",jointBone:"LeftForeArm",endBone:"LeftHand",contactBone:"LeftHand"})}),
    right_hand:Object.freeze({contact:"right_hand",bone:"RightHand",chain:Object.freeze({id:"right_arm",contact:"right_hand",rootBone:"RightArm",jointBone:"RightForeArm",endBone:"RightHand",contactBone:"RightHand"})})
  });
  const SURFACES=Object.freeze({
    pelvis:Object.freeze({id:"pelvis",bones:Object.freeze(["Hips"]),mode:"support_plane_y"}),
    left_leg:Object.freeze({id:"left_leg_surface",bones:Object.freeze(["LeftUpLeg"]),mode:"support_plane_y"}),
    right_leg:Object.freeze({id:"right_leg_surface",bones:Object.freeze(["RightUpLeg"]),mode:"support_plane_y"}),
    head:Object.freeze({id:"head_surface",bones:Object.freeze(["Head"]),mode:"support_plane_y"}),
    upper_arms:Object.freeze({id:"upper_arms_surface",bones:Object.freeze(["LeftArm","RightArm"]),mode:"support_plane_y"}),
    upper_back:Object.freeze({id:"upper_back",bones:Object.freeze(["Spine2"]),mode:"anchored_chain",contact:"upper_back",bone:"Spine2",chain:Object.freeze({id:"upper_back_chain",contact:"upper_back",rootBone:"Hips",jointBone:"Spine",endBone:"Spine2",contactBone:"Spine2"})})
  });
  const START_ANCHORED=new Set(["neutral-standing-hold","bilateral-squat-overhead-hold","prone-spinal-extension","supine-hip-extension"]);
  function classify(supports){
    const endpoint=[],surface=[],unsupported=[];
    for(const support of supports||[]){if(ENDPOINTS[support])endpoint.push(support);else if(SURFACES[support])surface.push(support);else unsupported.push(support);}
    return Object.freeze({endpoint:Object.freeze(endpoint),surface:Object.freeze(surface),unsupported:Object.freeze(unsupported)});
  }
  function activePhaseIds(archetype,phases){
    if(START_ANCHORED.has(archetype))return Object.freeze(phases.map(p=>p.id));
    return Object.freeze(phases.filter(p=>p.id==="target"||p.id==="hold").map(p=>p.id));
  }
  function compile(plan,phases){
    const classification=classify(plan?.supports||[]);
    if(classification.unsupported.length)return Object.freeze({status:"failed",code:"SUPPORT_OPERATOR_UNSUPPORTED",diagnostics:Object.freeze({unsupportedSupports:classification.unsupported})});
    const activeIds=activePhaseIds(plan.archetype,phases),anchorPhaseId=START_ANCHORED.has(plan.archetype)?"start":"target";
    const endpointRecords=classification.endpoint.map(id=>ENDPOINTS[id]);
    const surfaceRecords=classification.surface.map(id=>SURFACES[id]);
    const promoted=surfaceRecords.filter(x=>x.mode==="anchored_chain");
    const planeSurfaces=surfaceRecords.filter(x=>x.mode==="support_plane_y");
    const contacts=[...endpointRecords.map(x=>x.contact),...promoted.map(x=>x.contact)];
    const contactBones=Object.freeze(Object.fromEntries([...endpointRecords.map(x=>[x.contact,x.bone]),...promoted.map(x=>[x.contact,x.bone])]));
    const chains=Object.freeze([...endpointRecords.map(x=>x.chain),...promoted.map(x=>x.chain)]);
    const nextPhases=Object.freeze(phases.map(phase=>Object.freeze({...phase,contacts:Object.freeze(activeIds.includes(phase.id)?contacts.slice():[])})));
    const surfaceSupportPolicy=Object.freeze({
      mode:"body-surface-plane-v1",anchorPhaseId,activePhaseIds:activeIds,
      toleranceAvatarHeight:.045,
      constraints:Object.freeze(planeSurfaces.flatMap(surface=>surface.bones.map(bone=>Object.freeze({id:`${surface.id}:${bone}`,sourceSupport:surface.id,bone,axis:"world_y"}))))
    });
    const hasAnchored=contacts.length>0;
    return Object.freeze({status:"ready",phases:nextPhases,groundingPolicy:Object.freeze({mode:hasAnchored?"generated-supports-v2":"description-supports-no-endpoints",contacts:Object.freeze(contacts.slice()),contactBones,anchorPhaseId:hasAnchored?anchorPhaseId:null,kinematicChains:chains,enforceContactAnchors:hasAnchored,enforceGeneratedIK:hasAnchored}),surfaceSupportPolicy,diagnostics:Object.freeze({operatorVersion:VERSION,declaredSupports:Object.freeze((plan.supports||[]).slice()),endpointSupports:classification.endpoint,surfaceSupports:classification.surface,enforcedContacts:Object.freeze(contacts.slice()),promotedSurfaceContacts:Object.freeze(promoted.map(x=>x.contact)),surfacePlaneConstraints:Object.freeze(surfaceSupportPolicy.constraints.map(x=>x.id)),activePhaseIds:activeIds,anchorPhaseId,endpointContactSolvingApplied:endpointRecords.length>0,bodySurfaceSolvingApplied:surfaceRecords.length>0,firstDeferredCapability:null})});
  }
  return Object.freeze({VERSION,ENDPOINTS,SURFACES,classify,compile});
});
