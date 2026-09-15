(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PocketPTMotionDescriptionLowerBodyGeometryPolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='1.0.0-split-stance-geometry';
  const PATTERN='front-knee-bent-rear-leg-straight';
  const TARGET_PHASES=new Set(['target','hold']);
  const OPERATORS=Object.freeze([
    Object.freeze({id:'lower:split-stance-knee-over-ankle',category:'lower-body-geometry',source:'description.lowerBodyPattern'}),
    Object.freeze({id:'geometry:split-stance-leg-proportional-width',category:'geometry',source:'description.segmentRelationships'}),
    Object.freeze({id:'root:pelvis-low-between-feet',category:'root-trajectory',source:'description.targetShape'}),
    Object.freeze({id:'guard:rear-leg-stays-long',category:'trajectory-guard',source:'description.direction'})
  ]);
  const DEFAULTS=Object.freeze({stanceAbductionDegrees:34,frontHipFlexDegrees:34,frontKneeFlexDegrees:82,rearHipExtensionDegrees:10,rearKneeFlexDegrees:4,pelvisDropAvatarHeight:.18});

  function findTarget(phase,bone){return (phase?.boneTargets||[]).find(item=>item.bone===bone)||null;}
  function degrees(phase,bone,index=0){return Number(findTarget(phase,bone)?.rotationOffsetEulerDegrees?.[index])||0;}
  function withMagnitude(value,magnitude,fallbackSign=1){const sign=value===0?fallbackSign:Math.sign(value);return sign*Math.max(Math.abs(value),magnitude);}
  function withMaxMagnitude(value,magnitude,fallbackSign=-1){const sign=value===0?fallbackSign:Math.sign(value);return sign*Math.min(Math.abs(value),magnitude);}
  function replaceRotation(targets,bone,rotation){let found=false;const next=(targets||[]).map(item=>{if(item.bone!==bone)return item;found=true;return Object.freeze({...item,rotationOffsetEulerDegrees:Object.freeze(rotation.slice())});});if(!found)next.push(Object.freeze({bone,rotationOffsetEulerDegrees:Object.freeze(rotation.slice())}));return next;}
  function patchBone(targets,bone,index,value){const current=findTarget({boneTargets:targets},bone)?.rotationOffsetEulerDegrees||[0,0,0];const rotation=current.slice();rotation[index]=value;return replaceRotation(targets,bone,rotation);}

  function detectFrontSide(spec){
    const target=(spec?.phases||[]).find(phase=>phase.id==='target')||(spec?.phases||[]).find(phase=>phase.id==='hold');
    const left=Math.abs(degrees(target,'LeftLeg',0)),right=Math.abs(degrees(target,'RightLeg',0));
    return right>left?'right':'left';
  }

  function geometryPolicy(frontSide){return Object.freeze({
    id:'split-stance-knee-over-ankle-v1',version:VERSION,mode:'joint-chain-relative',movementFamily:'standing-split-stance',frontSide,
    constraints:Object.freeze(['front_knee_over_ankle','front_shin_near_vertical','front_thigh_toward_horizontal','rear_leg_extended','pelvis_low_between_feet','stance_width_scales_with_leg_chain']),
    targets:DEFAULTS,
    rule:'Use bilateral leg-chain angles rather than a fixed inch distance so stance width scales with avatar proportions; sink the pelvis between planted feet while the front knee bends strongly and the rear leg remains long.'
  });}

  function patchPhase(phase,frontSide){
    if(!TARGET_PHASES.has(phase?.id))return phase;
    const front=frontSide==='right'?{thigh:'RightUpLeg',leg:'RightLeg'}:{thigh:'LeftUpLeg',leg:'LeftLeg'};
    const rear=frontSide==='right'?{thigh:'LeftUpLeg',leg:'LeftLeg'}:{thigh:'RightUpLeg',leg:'RightLeg'};
    let targets=(phase.boneTargets||[]).slice();
    const frontThighX=withMagnitude(degrees(phase,front.thigh,0),DEFAULTS.frontHipFlexDegrees,1);
    const frontSpread=withMagnitude(degrees(phase,front.thigh,2),DEFAULTS.stanceAbductionDegrees,frontSide==='right'?-1:1);
    const rearThighX=withMagnitude(degrees(phase,rear.thigh,0),DEFAULTS.rearHipExtensionDegrees,-1);
    const rearSpread=withMagnitude(degrees(phase,rear.thigh,2),DEFAULTS.stanceAbductionDegrees,frontSide==='right'?1:-1);
    const frontKnee=withMagnitude(degrees(phase,front.leg,0),DEFAULTS.frontKneeFlexDegrees,-1);
    const rearKnee=withMaxMagnitude(degrees(phase,rear.leg,0),DEFAULTS.rearKneeFlexDegrees,-1);
    targets=patchBone(targets,front.thigh,0,frontThighX);targets=patchBone(targets,front.thigh,2,frontSpread);targets=patchBone(targets,front.leg,0,frontKnee);
    targets=patchBone(targets,rear.thigh,0,rearThighX);targets=patchBone(targets,rear.thigh,2,rearSpread);targets=patchBone(targets,rear.leg,0,rearKnee);
    const root=phase.root||{},position=(root.positionOffset||[0,0,0]).slice();position[1]=Math.min(Number(position[1])||0,-DEFAULTS.pelvisDropAvatarHeight);
    return Object.freeze({...phase,root:Object.freeze({...root,positionOffset:Object.freeze(position)}),boneTargets:Object.freeze(targets)});
  }

  function apply(spec){
    const classification=spec?.generationMetadata?.movementClassification;
    if(classification?.lowerBodyPattern!==PATTERN)return Object.freeze({status:'ready',applied:false,spec,diagnostics:Object.freeze({policyVersion:VERSION,pattern:classification?.lowerBodyPattern||null})});
    const frontSide=detectFrontSide(spec),policy=geometryPolicy(frontSide),phases=Object.freeze((spec.phases||[]).map(phase=>patchPhase(phase,frontSide)));
    const existing=(spec.generationMetadata?.selectedMovementOperators||[]).slice(),ids=new Set(existing.map(item=>item?.id).filter(Boolean));
    for(const item of OPERATORS)if(!ids.has(item.id))existing.push(item);
    const generationMetadata=Object.freeze({...spec.generationMetadata,selectedMovementOperators:Object.freeze(existing),lowerBodyGeometryPolicyVersion:VERSION});
    const patched=Object.freeze({...spec,generationMetadata,movementGeometryPolicy:policy,phases});
    return Object.freeze({status:'ready',applied:true,spec:patched,diagnostics:Object.freeze({policyVersion:VERSION,frontSide,operators:OPERATORS,movementGeometryPolicy:policy})});
  }

  function wrapGenerator(generator){
    if(!generator?.generate||generator.__lowerBodyGeometryPolicyInstalled===true)return generator;
    const originalGenerate=generator.generate.bind(generator);
    return Object.freeze({...generator,__lowerBodyGeometryPolicyInstalled:true,lowerBodyGeometryPolicyVersion:VERSION,generate(request,plan){
      const generated=originalGenerate(request,plan);if(generated?.status!=='ready'||!generated?.spec)return generated;
      const applied=apply(generated.spec);if(applied.status!=='ready'||!applied.applied)return generated;
      const contract=Object.freeze({...generated.contract,spec:applied.spec});
      return Object.freeze({...generated,spec:applied.spec,contract,diagnostics:Object.freeze({...generated.diagnostics,lowerBodyGeometryPolicy:applied.diagnostics})});
    }});
  }

  function install(scope=root){
    if(!scope?.PocketPTMotionDescriptionGenerator)return null;
    const wrapped=wrapGenerator(scope.PocketPTMotionDescriptionGenerator);scope.PocketPTMotionDescriptionGenerator=wrapped;return wrapped;
  }

  return Object.freeze({VERSION,PATTERN,DEFAULTS,OPERATORS,detectFrontSide,geometryPolicy,apply,wrapGenerator,install});
});
