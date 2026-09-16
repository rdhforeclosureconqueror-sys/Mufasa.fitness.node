'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const policy=require('../public/motion/lower-body-spatial-policy');
const Generator=require('../public/motion/motion-description-to-spec-generator');
const Compiler=require('../public/motion/motion-spec-clip');
const SemanticDirection=require('../public/motion/motion-spec-semantic-direction-policy');
const descriptions=require('../public/motion/yoga/beginner-flow-motion-descriptions.v1.json');
const plans=require('../public/motion/yoga/beginner-flow-generation-plans.v1.json');
const classification=descriptions.descriptions.find(x=>x.exerciseId==='warrior-ii').movementClassification;
function fixture(scale=1,leadLeg='left'){
  return policy.resolve({classification:{...classification,leadLeg},groundY:0,center:{x:0,z:0},left:{hip:{x:.1*scale,y:1*scale,z:0},knee:{x:.1*scale,y:.5*scale,z:0},upperLength:.5*scale,lowerLength:.5*scale},right:{hip:{x:-.1*scale,y:1*scale,z:0},knee:{x:-.1*scale,y:.5*scale,z:0},upperLength:.5*scale,lowerLength:.5*scale}});
}
test('classification selects asymmetric wide-lunge, never symmetric straddle',()=>{const request={requestType:'motion-description-to-draft',exerciseId:'warrior-ii',displayName:'Warrior II',description:descriptions.descriptions.find(x=>x.exerciseId==='warrior-ii')};const out=Generator.generate(request,plans.plans.find(x=>x.exerciseId==='warrior-ii'));assert.equal(out.status,'ready');assert.equal(out.spec.generationMetadata.movementClassification.movementFamily,'standing-asymmetric-wide-lunge');assert.ok(out.spec.generationMetadata.selectedMovementOperators.some(x=>x.id==='lower-body:standing-asymmetric-wide-lunge-v1'));assert.ok(!out.spec.generationMetadata.selectedMovementOperators.some(x=>/straddle/.test(x.id)));assert.equal(out.spec.lowerBodySpatialPolicy.scaleReference,'effective-leg-length');assert.deepEqual(out.spec.lowerBodySpatialPolicy.activePhaseIds,['target','hold']);assert.deepEqual(out.spec.phases.find(x=>x.id==='target').contacts,['left_foot','right_foot']);assert.deepEqual(out.spec.phases.find(x=>x.id==='hold').contacts,['left_foot','right_foot']);});
test('stance width derives from leg length, hip breadth, and requested rear-knee extension',()=>{const short=fixture(1),tall=fixture(1.4);assert.equal(short.status,'ready');assert.equal(tall.status,'ready');assert.ok(short.resolvedStanceWidth>1.5&&short.resolvedStanceWidth<1.7);assert.ok(Math.abs(tall.resolvedStanceWidth-short.resolvedStanceWidth*1.4)<1e-9);for(const x of [short,tall]){assert.ok(x.requiredStanceWidthRatio>=classification.stanceWidthLegLengthRatio.minimum);assert.ok(x.requiredStanceWidthRatio<=classification.stanceWidthLegLengthRatio.maximum);assert.equal(x.trailingKneeAngleRequestedDegrees,170);assert.ok(x.leadKneeHint);assert.ok(x.trailKneeHint);assert.equal(x.leadKneeAngleMeasuredDegrees,null);assert.equal(x.actualHeelToHeelDistance,null);}});
test('mirroring swaps lead/trail anchors without changing stance depth',()=>{const left=fixture(1,'left'),right=fixture(1,'right');assert.equal(left.leadLeg,'left');assert.equal(right.leadLeg,'right');assert.equal(left.resolvedStanceWidth,right.resolvedStanceWidth);assert.equal(left.leadAnchor.x,-right.leadAnchor.x);assert.equal(left.trailAnchor.x,-right.trailAnchor.x);});
test('non-wide-lunge poses remain free of the spatial operator',()=>{for(const id of ['mountain','chair','downward-dog','cobra','bridge']){const description=descriptions.descriptions.find(x=>x.exerciseId===id),plan=plans.plans.find(x=>x.exerciseId===id),out=Generator.generate({requestType:'motion-description-to-draft',exerciseId:id,displayName:description.displayName,description},plan);assert.equal(out.status,'ready');assert.equal(out.spec.lowerBodySpatialPolicy,undefined,id);}});

test('generated Warrior II compiles and validates on the shipped personalized Avaturn avatar',async()=>{
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
  const file=path.resolve(__dirname,'../exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb');
  const bytes=fs.readFileSync(file);
  const loader=new GLTFLoader().register(()=>({name:'node-test-textures',loadTexture:()=>Promise.resolve(null)}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const description=descriptions.descriptions.find(x=>x.exerciseId==='warrior-ii');
  const plan=plans.plans.find(x=>x.exerciseId==='warrior-ii');
  const generated=Generator.generate({requestType:'motion-description-to-draft',exerciseId:'warrior-ii',displayName:'Warrior II',description},plan);
  const compiled=SemanticDirection.install(Compiler).compile(THREE,generated.spec,asset.scene);
  assert.equal(compiled.status,'ready',compiled.code);
  assert.equal(compiled.diagnostics.semanticDirectionPolicyApplied,true);
  assert.equal(compiled.diagnostics.semanticDirectionSolvedPhaseCount,2);
  const measured=compiled.diagnostics.lowerBodySpatialDiagnostics;
  assert.equal(measured.ikSupportEnforcementSucceeded,true);
  assert.equal(measured.measurements.length,2);
  assert.ok(measured.resolvedStanceWidthRatio>1.5);
  assert.ok(measured.resolvedStanceWidthRatio<1.7);
  assert.ok(Math.abs(measured.actualHeelToHeelDistance-measured.resolvedStanceWidth)<1e-5);
  assert.ok(measured.leadKneeAngleMeasuredDegrees>=80&&measured.leadKneeAngleMeasuredDegrees<=105);
  assert.ok(measured.leadKneeToAnkleHorizontalError<=measured.effectiveLegLength*.05);
  assert.ok(measured.trailingKneeAngleDegrees>=160);
  assert.equal(measured.leftFootContact,true);
  assert.equal(measured.rightFootContact,true);
});
