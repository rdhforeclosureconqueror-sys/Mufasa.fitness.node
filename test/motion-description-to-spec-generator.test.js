'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Generator=require('../public/motion/motion-description-to-spec-generator');
const descriptions=require('../public/motion/yoga/beginner-flow-motion-descriptions.v1.json');
const plans=require('../public/motion/yoga/beginner-flow-generation-plans.v1.json');

const byDescription=new Map(descriptions.descriptions.map(item=>[item.exerciseId,item]));
const byPlan=new Map(plans.plans.map(item=>[item.exerciseId,item]));
const expected=['mountain','chair','warrior-ii','downward-dog','cobra','bridge'];
function requestFor(id){const description=byDescription.get(id);return {schemaVersion:1,requestType:'motion-description-to-draft',source:description.source,exerciseId:id,displayName:description.displayName,description,generationContract:{targetAvatarRole:'coach',targetSkeletonProfile:'avaturn-native-v1',generationMode:'phase-first-semantic-draft',autoplay:false,humanVisualAcceptanceRequired:true,preserveDescriptionAsAuthority:true}};}

test('Beginner Full-Body Flow has exactly six reusable generation plans',()=>{assert.deepEqual([...byPlan.keys()],expected);assert.equal(new Set(plans.plans.map(item=>item.archetype)).size,6);for(const plan of plans.plans){assert.ok(Array.isArray(plan.semanticRequirements)&&plan.semanticRequirements.length>=3);assert.ok(Array.isArray(plan.supports)&&plan.supports.length>=2);}});

test('Warrior II, Downward Dog, and Cobra descriptions classify reusable movement mechanics instead of rig rotations',()=>{
  const cases={
    'warrior-ii':{family:'standing-asymmetric-wide-lunge',arm:'opposed-lateral-reach-from-shoulders',reuse:'stationary-lunge-lower-body'},
    'downward-dog':{family:'four-point-inverted-hip-hinge',arm:'forward-support-line-from-shoulders',reuse:'four-point-support'},
    'cobra':{family:'prone-spinal-extension',arm:'hands-fixed-elbows-track-back-beside-ribs',reuse:'spinal-extension'}
  };
  for(const [id,expectedClass] of Object.entries(cases)){
    const description=byDescription.get(id),plan=byPlan.get(id);
    assert.ok(description?.movementClassification,id);
    assert.ok(description?.directionalRules,id);
    assert.equal(description.movementClassification.movementFamily,expectedClass.family,id);
    assert.equal(description.movementClassification.armPathPattern,expectedClass.arm,id);
    assert.ok(description.movementClassification.reuseFamilies.includes(expectedClass.reuse),id);
    assert.ok(Array.isArray(description.directionalRules.arms)&&description.directionalRules.arms.length>=2,id);
    assert.ok(description.directionalRules.prohibitedTrajectories.some(x=>/behind|posterior|backward/i.test(x)),id);
    assert.deepEqual(plan.movementClassification.movementFamily,description.movementClassification.movementFamily,id);
    assert.deepEqual(plan.movementClassification.armPathPattern,description.movementClassification.armPathPattern,id);
    assert.ok(plan.semanticRequirements.includes('no_posterior_arm_sweep'),id);
    const serialized=JSON.stringify(description);
    assert.doesNotMatch(serialized,/rotationOffsetEulerDegrees|\bEuler\b|\b-?\d+\s*degrees?\b/i,id);
  }
});

test('classified descriptions state the intended arm direction explicitly',()=>{
  const warrior=byDescription.get('warrior-ii');
  assert.ok(warrior.directionalRules.arms.some(x=>/laterally outward/i.test(x)));
  assert.ok(warrior.directionalRules.lowerBody.some(x=>/lunge/i.test(x)));
  assert.ok(warrior.directionalRules.prohibitedTrajectories.some(x=>/rear knee dropping/i.test(x)));

  const dog=byDescription.get('downward-dog');
  assert.ok(dog.directionalRules.arms.some(x=>/in front of the shoulders/i.test(x)));
  assert.ok(dog.directionalRules.arms.some(x=>/biceps.*ears/i.test(x)));
  assert.ok(dog.directionalRules.prohibitedTrajectories.some(x=>/arms sweeping behind/i.test(x)));

  const cobra=byDescription.get('cobra');
  assert.ok(cobra.directionalRules.arms.some(x=>/hands stay planted/i.test(x)));
  assert.ok(cobra.directionalRules.arms.some(x=>/elbows point backward beside the ribs/i.test(x)));
  assert.ok(cobra.directionalRules.prohibitedTrajectories.some(x=>/upper arms sweeping behind/i.test(x)));
});

test('generic generator produces Coach-targeted supported Motion Specs for all six descriptions',()=>{
  for(const id of expected){const out=Generator.generate(requestFor(id),byPlan.get(id));assert.equal(out.status,'ready',id);assert.equal(out.spec.exerciseId,id);assert.equal(out.spec.status,'development-test-only');assert.equal(out.spec.skeleton.targetSkeletonProfile,'avaturn-native-v1');assert.equal(out.spec.coachRetarget.targetAvatarProfileId,'avaturn-personalized-candidate');assert.equal(out.spec.generationMetadata.generatedDraft,true);assert.equal(out.spec.generationMetadata.descriptionAuthority,true);assert.ok(out.spec.phases.length>=4);assert.equal(out.spec.phases[0].normalizedTime,0);assert.equal(out.spec.phases.at(-1).normalizedTime,1);assert.equal(out.contract.validate(out.spec).valid,true);assert.equal(out.diagnostics.contactSolvingDeferred,false);assert.equal(out.diagnostics.endpointContactSolvingApplied,true);assert.equal(out.diagnostics.surfaceSupportSolvingDeferred,false);assert.equal(out.diagnostics.firstDeferredCapability,null);assert.ok(out.spec.groundingPolicy.contacts.length>=2);assert.ok(out.spec.groundingPolicy.kinematicChains.length>=2);}
});

test('Chair keeps arms-down start/finish but uses rig-aware ear-line semantics during loaded phases',()=>{
  const out=Generator.generate(requestFor('chair'),byPlan.get('chair'));
  assert.equal(out.status,'ready');
  assert.deepEqual(out.spec.phases.map(x=>x.id),['start','descent','target','hold','ascent','finish']);
  const start=out.spec.phases[0],descent=out.spec.phases[1],target=out.spec.phases[2],hold=out.spec.phases[3],finish=out.spec.phases[5];
  const bone=(phase,name)=>phase.boneTargets.find(x=>x.bone===name).rotationOffsetEulerDegrees;
  assert.deepEqual(bone(start,'LeftArm'),[0,0,88]);
  assert.deepEqual(bone(start,'RightArm'),[0,0,-88]);
  assert.deepEqual(bone(descent,'LeftArm'),[0,0,88]);
  assert.deepEqual(bone(target,'LeftArm'),[0,0,88]);
  assert.deepEqual(bone(hold,'RightArm'),[0,0,-88]);
  assert.deepEqual(bone(finish,'LeftArm'),bone(start,'LeftArm'));
  assert.deepEqual(bone(finish,'RightArm'),bone(start,'RightArm'));
  assert.ok(descent.root.positionOffset[1]<start.root.positionOffset[1]);
  assert.ok(target.root.positionOffset[1]<descent.root.positionOffset[1]);
  assert.deepEqual(bone(target,'LeftUpLeg'),[78,0,2]);
  assert.deepEqual(bone(target,'LeftLeg'),[-95,0,0]);
  assert.deepEqual(hold.root.positionOffset,target.root.positionOffset);
  const semantic=out.spec.semanticPosePolicy;
  assert.equal(semantic.mode,'target-rig-body-relative');
  assert.equal(semantic.targets.filter(x=>x.type==='bone_direction_reference').length,2);
  assert.equal(semantic.targets.filter(x=>x.type==='hand_plane_faces_reference').length,2);
  for(const item of semantic.targets){assert.deepEqual(item.activePhaseIds,['descent','target','hold','ascent']);}
  for(const item of semantic.targets.filter(x=>x.type==='bone_direction_reference')){assert.equal(item.referenceBone,'Neck');assert.equal(item.referenceChildBone,'Head');}
});

test('body-surface policy is present only when the description declares body-surface support',()=>{
  for(const id of ['mountain','chair','warrior-ii','downward-dog']){const out=Generator.generate(requestFor(id),byPlan.get(id));assert.equal(out.spec.surfaceSupportPolicy.constraints.length,0,id);}
  for(const id of ['cobra','bridge']){const out=Generator.generate(requestFor(id),byPlan.get(id));assert.equal(out.diagnostics.bodySurfaceSolvingApplied,true,id);assert.ok(out.spec.surfaceSupportPolicy.constraints.length>=3,id);assert.equal(out.spec.surfaceSupportPolicy.anchorPhaseId,'start',id);}
});

test('floor archetypes no longer teleport back to standing on exit',()=>{
  for(const id of ['cobra','bridge']){const out=Generator.generate(requestFor(id),byPlan.get(id));const first=out.spec.phases[0],last=out.spec.phases.at(-1);assert.deepEqual(last.root.positionOffset,first.root.positionOffset,id);assert.deepEqual(last.root.rotationOffsetEulerDegrees,first.root.rotationOffsetEulerDegrees,id);assert.notDeepEqual(first.root.rotationOffsetEulerDegrees,[0,0,0],id);}
});

test('generator fails closed for missing or conflicting generation plan',()=>{assert.equal(Generator.generate(requestFor('mountain'),null).code,'GEN_PLAN_MISSING');const bad={...byPlan.get('mountain'),archetype:'not-real'};assert.equal(Generator.generate(requestFor('mountain'),bad).code,'GEN_CLASSIFICATION_ARCHETYPE_MISMATCH');});

test('generator remains archetype-driven rather than keyed to exercise IDs',()=>{assert.deepEqual([...Generator.ARCHETYPES].sort(),['bilateral-squat-overhead-hold','inverted-v-four-point','neutral-standing-hold','prone-spinal-extension','supine-hip-extension','wide-split-stance-lateral-reach'].sort());const source=fs.readFileSync(path.join(__dirname,'../public/motion/motion-description-to-spec-generator.js'),'utf8');for(const id of expected)assert.doesNotMatch(source,new RegExp(`exerciseId\\s*===?\\s*["']${id}["']`));});

test('Motion Lab installs semantic direction compiler before runtime playback',()=>{const source=fs.readFileSync(path.join(__dirname,'../motion-lab/motion-lab-bootstrap.js'),'utf8');const clip=source.indexOf('motion_spec_clip');const semantic=source.indexOf('motion_spec_semantic_direction_policy');const runtime=source.indexOf('motion_lab_runtime');assert.ok(clip>=0);assert.ok(semantic>clip);assert.ok(runtime>semantic);assert.match(source,/PocketPTMotionSpecSemanticDirectionPolicy\?\.install/);assert.match(source,/__semanticDirectionPolicyInstalled/);});

test('Yoga Motion Lab intake runs generator -> supports -> Coach -> compile -> playable boundaries',()=>{const source=fs.readFileSync(path.join(__dirname,'../public/motion/yoga-motion-description-intake.js'),'utf8');assert.match(source,/Create Motion Draft/);assert.match(source,/runtime\.loadAvatar\(profiles\.profiles\.personalized\)/);assert.match(source,/runtime\.loadMotionSpec\(generated\.contract\)/);for(const id of ['handoff','resources','description','template','request','plan','generator','supports','coach','compile','playback'])assert.match(source,new RegExp(`stage\\(["']${id}["']`));});

test('all six descriptions now resolve to reusable movement families',()=>{
  const families={mountain:'neutral-standing',chair:'bilateral-squat','warrior-ii':'standing-asymmetric-wide-lunge','downward-dog':'four-point-inverted-hip-hinge',cobra:'prone-spinal-extension',bridge:'supine-hip-extension'};
  for(const [id,family] of Object.entries(families)){
    const out=Generator.classifyDescription(byDescription.get(id));
    assert.ok(out.classification,id);
    assert.equal(out.classification.movementFamily,family,id);
  }
});

test('Chair description is consumed and translated into reusable overhead operators',()=>{
  const out=Generator.generate(requestFor('chair'),byPlan.get('chair'));
  assert.equal(out.status,'ready');
  assert.equal(out.spec.generationMetadata.descriptionClassificationConsumed,true);
  assert.equal(out.spec.generationMetadata.classificationSource,'structured-description-inference');
  assert.equal(out.spec.generationMetadata.movementClassification.movementFamily,'bilateral-squat');
  const ids=out.spec.generationMetadata.selectedMovementOperators.map(x=>x.id);
  assert.ok(ids.includes('arm:ear-line-overhead'));
  assert.ok(ids.includes('guard:no-posterior-arm-sweep'));
  assert.equal(out.spec.semanticPosePolicy.targets.length,4);
});

test('Warrior II, Downward Dog, and Cobra select generic arm-path operators from descriptions',()=>{
  const operators={'warrior-ii':'arm:opposed-lateral-shoulder-axis','downward-dog':'arm:forward-support-ear-line',cobra:'arm:ribside-elbows-toward-pelvis'};
  for(const [id,operator] of Object.entries(operators)){
    const out=Generator.generate(requestFor(id),byPlan.get(id));
    assert.equal(out.status,'ready',id);
    assert.equal(out.spec.generationMetadata.descriptionClassificationConsumed,true,id);
    assert.equal(out.spec.generationMetadata.classificationSource,'explicit-movementClassification',id);
    assert.ok(out.spec.generationMetadata.selectedMovementOperators.some(x=>x.id===operator),id);
    assert.ok(out.spec.semanticPosePolicy.targets.length>=2,id);
  }
});

test('description and generation-plan classification disagreement fails at the translation boundary',()=>{
  const plan=byPlan.get('warrior-ii');
  const bad={...plan,movementClassification:{...plan.movementClassification,armPathPattern:'forward-support-line-from-shoulders'}};
  const out=Generator.generate(requestFor('warrior-ii'),bad);
  assert.equal(out.status,'failed');
  assert.equal(out.code,'GEN_CLASSIFICATION_PLAN_MISMATCH');
});

test('operator observability is wired before generated Yoga compilation',()=>{
  const index=fs.readFileSync(path.join(__dirname,'../motion-lab/index.html'),'utf8');
  const gate=fs.readFileSync(path.join(__dirname,'../public/motion/generator-operator-observability-gate.js'),'utf8');
  assert.match(index,/generator-operator-observability-gate\.js/);
  assert.match(gate,/pocketpt:motion-spec-generated/);
  assert.match(gate,/installObservability/);
  const source=fs.readFileSync(path.join(__dirname,'../public/motion/motion-description-to-spec-generator.js'),'utf8');
  assert.match(source,/GENERATOR OPERATOR DIAGNOSTICS/);
  assert.match(source,/semanticDirectionPolicyApplied/);
  assert.match(source,/semanticDirectionTargets/);
  assert.match(source,/DESCRIPTION_CLASSIFICATION_NOT_CONSUMED/);
  assert.match(source,/SEMANTIC_DIRECTION_POLICY_NOT_APPLIED/);
  assert.match(source,/Post-semantic changed bones/);
});
