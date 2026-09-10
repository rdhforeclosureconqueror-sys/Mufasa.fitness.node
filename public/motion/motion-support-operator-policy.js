(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PocketPTMotionSupportOperatorPolicy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="1.0.0-yoga-support-operators";
  const ENDPOINTS=Object.freeze({
    left_foot:Object.freeze({contact:"left_foot",bone:"LeftFoot",chain:Object.freeze({id:"left_leg",contact:"left_foot",rootBone:"LeftUpLeg",jointBone:"LeftLeg",endBone:"LeftFoot",contactBone:"LeftFoot"})}),
    right_foot:Object.freeze({contact:"right_foot",bone:"RightFoot",chain:Object.freeze({id:"right_leg",contact:"right_foot",rootBone:"RightUpLeg",jointBone:"RightLeg",endBone:"RightFoot",contactBone:"RightFoot"})}),
    left_hand:Object.freeze({contact:"left_hand",bone:"LeftHand",chain:Object.freeze({id:"left_arm",contact:"left_hand",rootBone:"LeftArm",jointBone:"LeftForeArm",endBone:"LeftHand",contactBone:"LeftHand"})}),
    right_hand:Object.freeze({contact:"right_hand",bone:"RightHand",chain:Object.freeze({id:"right_arm",contact:"right_hand",rootBone:"RightArm",jointBone:"RightForeArm",endBone:"RightHand",contactBone:"RightHand"})})
  });
  const SURFACE_SUPPORTS=new Set(["pelvis","left_leg","right_leg","upper_back","head","upper_arms"]);
  const START_ANCHORED=new Set(["neutral-standing-hold","bilateral-squat-overhead-hold"]);
  function classify(supports){
    const endpoint=[],surface=[],unsupported=[];
    for(const support of supports||[]){
      if(ENDPOINTS[support])endpoint.push(support);
      else if(SURFACE_SUPPORTS.has(support))surface.push(support);
      else unsupported.push(support);
    }
    return Object.freeze({endpoint:Object.freeze(endpoint),surface:Object.freeze(surface),unsupported:Object.freeze(unsupported)});
  }
  function activePhaseIds(archetype,phases){
    if(START_ANCHORED.has(archetype))return Object.freeze(phases.map(p=>p.id));
    return Object.freeze(phases.filter(p=>p.id==="target"||p.id==="hold").map(p=>p.id));
  }
  function compile(plan,phases){
    const classification=classify(plan?.supports||[]);
    if(classification.unsupported.length)return Object.freeze({status:"failed",code:"SUPPORT_OPERATOR_UNSUPPORTED",diagnostics:Object.freeze({unsupportedSupports:classification.unsupported})});
    const activeIds=activePhaseIds(plan.archetype,phases);
    const endpointRecords=classification.endpoint.map(id=>ENDPOINTS[id]);
    const contacts=endpointRecords.map(x=>x.contact);
    const contactBones=Object.freeze(Object.fromEntries(endpointRecords.map(x=>[x.contact,x.bone])));
    const chains=Object.freeze(endpointRecords.map(x=>x.chain));
    const anchorPhaseId=START_ANCHORED.has(plan.archetype)?"start":"target";
    const nextPhases=Object.freeze(phases.map(phase=>Object.freeze({...phase,contacts:Object.freeze(activeIds.includes(phase.id)?contacts.slice():[])})));
    const hasEndpoint=contacts.length>0;
    return Object.freeze({
      status:"ready",
      phases:nextPhases,
      groundingPolicy:Object.freeze({
        mode:hasEndpoint?"generated-endpoint-supports-v1":"description-supports-no-endpoints",
        contacts:Object.freeze(contacts.slice()),
        contactBones,
        anchorPhaseId:hasEndpoint?anchorPhaseId:null,
        kinematicChains:chains,
        enforceContactAnchors:hasEndpoint,
        enforceGeneratedIK:hasEndpoint
      }),
      diagnostics:Object.freeze({
        operatorVersion:VERSION,
        declaredSupports:Object.freeze((plan.supports||[]).slice()),
        endpointSupports:classification.endpoint,
        enforcedContacts:Object.freeze(contacts.slice()),
        activePhaseIds:activeIds,
        anchorPhaseId:hasEndpoint?anchorPhaseId:null,
        surfaceSupportsDeferred:classification.surface,
        firstDeferredCapability:classification.surface.length?"BODY_SURFACE_SUPPORT_SOLVER":null,
        endpointContactSolvingApplied:hasEndpoint
      })
    });
  }
  return Object.freeze({VERSION,ENDPOINTS,SURFACE_SUPPORTS:Object.freeze([...SURFACE_SUPPORTS]),classify,compile});
});
