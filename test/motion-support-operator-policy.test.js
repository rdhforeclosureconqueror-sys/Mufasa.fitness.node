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
  assert.equal(out.diagnostics.endpointContactSolvingApplied,true);
  assert.equal(out.diagnostics.surfaceSupportSolvingDeferred,false);
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
  assert.deepEqual(out.spec.phases.find(x=>x.id==='finish').contacts,[]);
});

test('Cobra and Bridge report body-surface supports as the next explicit engine capability',()=>{
  const cobra=Generator.generate(request('cobra'),plan.get('cobra'));
  assert.equal(cobra.status,'ready');
  assert.deepEqual(cobra.diagnostics.supportOperators.surfaceSupportsDeferred,['pelvis','left_leg','right_leg']);
  assert.equal(cobra.diagnostics.firstDeferredCapability,'BODY_SURFACE_SUPPORT_SOLVER');
  const bridge=Generator.generate(request('bridge'),plan.get('bridge'));
  assert.equal(bridge.status,'ready');
  assert.deepEqual(bridge.diagnostics.supportOperators.surfaceSupportsDeferred,['upper_back','head','upper_arms']);
  assert.equal(bridge.diagnostics.firstDeferredCapability,'BODY_SURFACE_SUPPORT_SOLVER');
});

test('unknown support semantics fail closed instead of being silently ignored',()=>{
  const fake={...plan.get('mountain'),supports:['left_foot','mystery_contact']};
  const out=Generator.generate(request('mountain'),fake);
  assert.equal(out.status,'failed');
  assert.equal(out.code,'SUPPORT_OPERATOR_UNSUPPORTED');
  assert.deepEqual(out.diagnostics.unsupportedSupports,['mystery_contact']);
});

test('Motion Lab loads support policy then generator then Yoga intake',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../motion-lab/index.html'),'utf8');
  const policy=html.indexOf('/dev/motion-lab-assets/motion-support-operator-policy.js');
  const generator=html.indexOf('/dev/motion-lab-assets/motion-description-to-spec-generator.js');
  const intake=html.indexOf('/dev/motion-lab-assets/yoga-motion-description-intake.js');
  assert.ok(policy>=0&&generator>policy&&intake>generator);
});

test('Yoga first-failure panel includes an explicit support/contact operator boundary',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/yoga-motion-description-intake.js'),'utf8');
  assert.match(source,/stage\("supports","Support\/contact operators"/);
  assert.match(source,/surfaceSupportsDeferred/);
  assert.match(source,/enforcedContacts/);
});
