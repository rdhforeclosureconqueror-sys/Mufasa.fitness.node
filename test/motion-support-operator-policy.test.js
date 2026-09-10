'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Policy=require('../public/motion/motion-support-operator-policy');
const Generator=require('../public/motion/motion-description-to-spec-generator');
const descriptions=require('../public/motion/yoga/beginner-flow-motion-descriptions.v1.json');
const plans=require('../public/motion/yoga/beginner-flow-generation-plans.v1.json');

const desc=new Map(descriptions.descriptions.map(x=>[x.exerciseId,x]));
const plan=new Map(plans.plans.map(x=>[x.exerciseId,x]));
function request(id){const d=desc.get(id);return {requestType:'motion-description-to-draft',exerciseId:id,displayName:d.displayName,description:d,source:d.source};}

test('support policy classifies endpoint versus body-surface supports',()=>{
  assert.deepEqual(Policy.classify(['left_foot','right_foot']).endpoint,['left_foot','right_foot']);
  const cobra=Policy.classify(plan.get('cobra').supports);
  assert.deepEqual(cobra.endpoint,['left_hand','right_hand']);
  assert.deepEqual(cobra.surface,['pelvis','left_leg','right_leg']);
  assert.deepEqual(cobra.unsupported,[]);
});

test('Chair automatically promotes both planted feet into generated leg IK',()=>{
  const out=Generator.generate(request('chair'),plan.get('chair'));
  assert.equal(out.status,'ready');
  assert.equal(out.spec.groundingPolicy.enforceContactAnchors,true);
  assert.equal(out.spec.groundingPolicy.enforceGeneratedIK,true);
  assert.equal(out.spec.groundingPolicy.anchorPhaseId,'start');
  assert.deepEqual(out.spec.groundingPolicy.contacts,['left_foot','right_foot']);
  assert.equal(out.spec.groundingPolicy.kinematicChains.length,2);
  for(const phase of out.spec.phases)assert.deepEqual(phase.contacts,['left_foot','right_foot']);
});

test('Downward Dog promotes four endpoint supports with two arm and two leg chains',()=>{
  const out=Generator.generate(request('downward-dog'),plan.get('downward-dog'));
  assert.equal(out.status,'ready');
  assert.equal(out.spec.groundingPolicy.anchorPhaseId,'target');
  assert.deepEqual(out.spec.groundingPolicy.contacts,['left_hand','right_hand','left_foot','right_foot']);
  assert.equal(out.spec.groundingPolicy.kinematicChains.length,4);
  assert.deepEqual(out.spec.phases.find(x=>x.id==='start').contacts,[]);
  assert.deepEqual(out.spec.phases.find(x=>x.id==='target').contacts,['left_hand','right_hand','left_foot','right_foot']);
  assert.deepEqual(out.spec.phases.find(x=>x.id==='hold').contacts,['left_hand','right_hand','left_foot','right_foot']);
});

test('Cobra uses a prone floor setup and promotes pelvis/leg surfaces to support-plane constraints',()=>{
  const cobra=Generator.generate(request('cobra'),plan.get('cobra'));
  assert.equal(cobra.status,'ready');
  assert.deepEqual(cobra.spec.phases[0].root.rotationOffsetEulerDegrees,[90,0,0]);
  assert.deepEqual(cobra.spec.phases.at(-1).root.rotationOffsetEulerDegrees,[90,0,0]);
  assert.equal(cobra.spec.groundingPolicy.anchorPhaseId,'start');
  assert.deepEqual(cobra.spec.groundingPolicy.contacts,['left_hand','right_hand']);
  assert.deepEqual(cobra.diagnostics.supportOperators.surfaceSupports,['pelvis','left_leg','right_leg']);
  assert.equal(cobra.spec.surfaceSupportPolicy.anchorPhaseId,'start');
  assert.deepEqual(cobra.spec.surfaceSupportPolicy.constraints.map(x=>x.bone),['Hips','LeftUpLeg','RightUpLeg']);
  assert.equal(cobra.diagnostics.surfaceSupportSolvingDeferred,false);
});

test('Bridge starts and finishes supine, keeps feet on limb IK, and validates upper-back/head/upper-arm support without rotating the Hips root through trunk IK',()=>{
  const bridge=Generator.generate(request('bridge'),plan.get('bridge'));
  assert.equal(bridge.status,'ready');
  assert.deepEqual(bridge.spec.phases[0].root.rotationOffsetEulerDegrees,[-90,0,0]);
  assert.deepEqual(bridge.spec.phases.at(-1).root.rotationOffsetEulerDegrees,[-90,0,0]);
  assert.ok(bridge.spec.phases.find(x=>x.id==='target').root.positionOffset[1] > bridge.spec.phases[0].root.positionOffset[1]);
  assert.deepEqual(bridge.spec.groundingPolicy.contacts,['left_foot','right_foot']);
  assert.equal(bridge.spec.groundingPolicy.kinematicChains.some(x=>x.rootBone==='Hips'),false);
  assert.deepEqual(bridge.spec.surfaceSupportPolicy.constraints.map(x=>x.bone),['Spine2','Head','LeftArm','RightArm']);
  assert.equal(bridge.diagnostics.supportOperators.bodySurfaceSolvingApplied,true);
  assert.equal(bridge.diagnostics.firstDeferredCapability,null);
});

test('unknown support semantics fail closed instead of being silently ignored',()=>{
  const fake={...plan.get('mountain'),supports:['left_foot','mystery_contact']};
  const out=Generator.generate(request('mountain'),fake);
  assert.equal(out.status,'failed');
  assert.equal(out.code,'SUPPORT_OPERATOR_UNSUPPORTED');
});

test('Motion Spec compiler contains fail-closed body-surface residual validation',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/motion-spec-clip.js'),'utf8');
  assert.match(source,/surfaceSupportPolicy/);
  assert.match(source,/motion_surface_support_drift/);
  assert.match(source,/SURFACE_SUPPORT_DRIFT/);
  assert.match(source,/surfaceSupportResiduals/);
});

test('Yoga first-failure panel reports body-surface operators instead of deferred metadata',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/yoga-motion-description-intake.js'),'utf8');
  assert.match(source,/Support\/contact operators/);
  assert.match(source,/body surfaces:/);
  assert.match(source,/plane checks:/);
  assert.doesNotMatch(source,/deferred body-surface supports/);
});
