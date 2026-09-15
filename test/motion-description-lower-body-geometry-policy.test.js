'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Generator=require('../public/motion/motion-description-to-spec-generator');
const Policy=require('../public/motion/motion-description-lower-body-geometry-policy');
const descriptions=require('../public/motion/yoga/beginner-flow-motion-descriptions.v1.json');
const plans=require('../public/motion/yoga/beginner-flow-generation-plans.v1.json');
const byDescription=new Map(descriptions.descriptions.map(item=>[item.exerciseId,item]));
const byPlan=new Map(plans.plans.map(item=>[item.exerciseId,item]));
function requestFor(id){const description=byDescription.get(id);return {schemaVersion:1,requestType:'motion-description-to-draft',source:description.source,exerciseId:id,displayName:description.displayName,description,generationContract:{targetAvatarRole:'coach',targetSkeletonProfile:'avaturn-native-v1',generationMode:'phase-first-semantic-draft',autoplay:false,humanVisualAcceptanceRequired:true,preserveDescriptionAsAuthority:true}};}
function bone(phase,name){return phase.boneTargets.find(item=>item.bone===name)?.rotationOffsetEulerDegrees;}

test('split-stance geometry policy is classification-driven, not exercise-name-driven',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/motion-description-lower-body-geometry-policy.js'),'utf8');
  assert.doesNotMatch(source,/warrior-ii|Warrior II/);
  assert.match(source,/front-knee-bent-rear-leg-straight/);
});

test('policy widens and lowers any classified standing split stance using leg-chain-relative geometry',()=>{
  const base=Generator.generate(requestFor('warrior-ii'),byPlan.get('warrior-ii'));
  assert.equal(base.status,'ready');
  const applied=Policy.apply(base.spec);
  assert.equal(applied.status,'ready');
  assert.equal(applied.applied,true);
  const target=applied.spec.phases.find(phase=>phase.id==='target');
  const hold=applied.spec.phases.find(phase=>phase.id==='hold');
  assert.ok(target.root.positionOffset[1]<=-0.18);
  assert.ok(hold.root.positionOffset[1]<=-0.18);
  assert.ok(Math.abs(bone(target,'LeftUpLeg')[2])>=34);
  assert.ok(Math.abs(bone(target,'RightUpLeg')[2])>=34);
  assert.ok(Math.abs(bone(target,'LeftLeg')[0])>=82);
  assert.ok(Math.abs(bone(target,'RightLeg')[0])<=4);
  assert.equal(applied.spec.movementGeometryPolicy.mode,'joint-chain-relative');
  assert.ok(applied.spec.movementGeometryPolicy.constraints.includes('front_knee_over_ankle'));
  assert.ok(applied.spec.movementGeometryPolicy.constraints.includes('front_thigh_toward_horizontal'));
  assert.ok(applied.spec.movementGeometryPolicy.constraints.includes('stance_width_scales_with_leg_chain'));
});

test('policy selects front side from generated knee bend instead of pose identity',()=>{
  const base=Generator.generate(requestFor('warrior-ii'),byPlan.get('warrior-ii'));
  assert.equal(Policy.detectFrontSide(base.spec),'left');
  const swapped={...base.spec,phases:base.spec.phases.map(phase=>phase.id!=='target'?phase:{...phase,boneTargets:phase.boneTargets.map(item=>item.bone==='LeftLeg'?{...item,rotationOffsetEulerDegrees:[-5,0,0]}:item.bone==='RightLeg'?{...item,rotationOffsetEulerDegrees:[-70,0,0]}:item)})};
  assert.equal(Policy.detectFrontSide(swapped),'right');
});

test('wrapped generator records reusable split-stance operators and preserves semantic arm policy',()=>{
  const wrapped=Policy.wrapGenerator(Generator);
  const out=wrapped.generate(requestFor('warrior-ii'),byPlan.get('warrior-ii'));
  assert.equal(out.status,'ready');
  const ids=out.spec.generationMetadata.selectedMovementOperators.map(item=>item.id);
  for(const id of ['lower:split-stance-knee-over-ankle','geometry:split-stance-leg-proportional-width','root:pelvis-low-between-feet','guard:rear-leg-stays-long'])assert.ok(ids.includes(id),id);
  assert.ok(ids.includes('arm:opposed-lateral-shoulder-axis'));
  assert.ok(out.spec.semanticPosePolicy.targets.length>=2);
  assert.equal(out.contract.spec,out.spec);
});

test('non split-stance descriptions pass through unchanged',()=>{
  const chair=Generator.generate(requestFor('chair'),byPlan.get('chair'));
  const applied=Policy.apply(chair.spec);
  assert.equal(applied.applied,false);
  assert.equal(applied.spec,chair.spec);
});

test('Motion Lab gate loads and installs the lower-body geometry policy before observation',()=>{
  const gate=fs.readFileSync(path.join(__dirname,'../public/motion/generator-operator-observability-gate.js'),'utf8');
  assert.match(gate,/motion-description-lower-body-geometry-policy\.js/);
  assert.match(gate,/policy\?\.install\?\.\(root\)/);
  assert.match(gate,/installObservability/);
});
