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

test('generic generator produces Coach-targeted supported Motion Specs for all six descriptions',()=>{
  for(const id of expected){const out=Generator.generate(requestFor(id),byPlan.get(id));assert.equal(out.status,'ready',id);assert.equal(out.spec.exerciseId,id);assert.equal(out.spec.status,'development-test-only');assert.equal(out.spec.skeleton.targetSkeletonProfile,'avaturn-native-v1');assert.equal(out.spec.coachRetarget.targetAvatarProfileId,'avaturn-personalized-candidate');assert.equal(out.spec.generationMetadata.generatedDraft,true);assert.equal(out.spec.generationMetadata.descriptionAuthority,true);assert.ok(out.spec.phases.length>=4);assert.equal(out.spec.phases[0].normalizedTime,0);assert.equal(out.spec.phases.at(-1).normalizedTime,1);assert.equal(out.contract.validate(out.spec).valid,true);assert.equal(out.diagnostics.contactSolvingDeferred,false);assert.equal(out.diagnostics.endpointContactSolvingApplied,true);assert.equal(out.diagnostics.surfaceSupportSolvingDeferred,false);assert.equal(out.diagnostics.firstDeferredCapability,null);assert.ok(out.spec.groundingPolicy.contacts.length>=2);assert.ok(out.spec.groundingPolicy.kinematicChains.length>=2);}
});

test('body-surface policy is present only when the description declares body-surface support',()=>{
  for(const id of ['mountain','chair','warrior-ii','downward-dog']){const out=Generator.generate(requestFor(id),byPlan.get(id));assert.equal(out.spec.surfaceSupportPolicy.constraints.length,0,id);}
  for(const id of ['cobra','bridge']){const out=Generator.generate(requestFor(id),byPlan.get(id));assert.equal(out.diagnostics.bodySurfaceSolvingApplied,true,id);assert.ok(out.spec.surfaceSupportPolicy.constraints.length>=3,id);assert.equal(out.spec.surfaceSupportPolicy.anchorPhaseId,'start',id);}
});

test('floor archetypes no longer teleport back to standing on exit',()=>{
  for(const id of ['cobra','bridge']){const out=Generator.generate(requestFor(id),byPlan.get(id));const first=out.spec.phases[0],last=out.spec.phases.at(-1);assert.deepEqual(last.root.positionOffset,first.root.positionOffset,id);assert.deepEqual(last.root.rotationOffsetEulerDegrees,first.root.rotationOffsetEulerDegrees,id);assert.notDeepEqual(first.root.rotationOffsetEulerDegrees,[0,0,0],id);}
});

test('generator fails closed for missing or unsupported generation plan',()=>{assert.equal(Generator.generate(requestFor('mountain'),null).code,'GEN_PLAN_MISSING');const bad={...byPlan.get('mountain'),archetype:'not-real'};assert.equal(Generator.generate(requestFor('mountain'),bad).code,'GEN_ARCHETYPE_UNSUPPORTED');});

test('generator remains archetype-driven rather than keyed to exercise IDs',()=>{assert.deepEqual([...Generator.ARCHETYPES].sort(),['bilateral-squat-overhead-hold','inverted-v-four-point','neutral-standing-hold','prone-spinal-extension','supine-hip-extension','wide-split-stance-lateral-reach'].sort());const source=fs.readFileSync(path.join(__dirname,'../public/motion/motion-description-to-spec-generator.js'),'utf8');for(const id of expected)assert.doesNotMatch(source,new RegExp(`exerciseId\\s*===?\\s*["']${id}["']`));});

test('Yoga Motion Lab intake runs generator -> supports -> Coach -> compile -> playable boundaries',()=>{const source=fs.readFileSync(path.join(__dirname,'../public/motion/yoga-motion-description-intake.js'),'utf8');assert.match(source,/Create Motion Draft/);assert.match(source,/runtime\.loadAvatar\(profiles\.profiles\.personalized\)/);assert.match(source,/runtime\.loadMotionSpec\(generated\.contract\)/);for(const id of ['handoff','resources','description','template','request','plan','generator','supports','coach','compile','playback'])assert.match(source,new RegExp(`stage\\(["']${id}["']`));});
