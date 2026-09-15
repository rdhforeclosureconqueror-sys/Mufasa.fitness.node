'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Generator=require('../public/motion/motion-description-to-spec-generator');

test('operator observability reads post-semantic compiler truth',()=>{
  const scope={
    PocketPTMotionSpecClip:{compile(){return {status:'ready',diagnostics:{semanticDirectionPolicyApplied:true,semanticDirectionPolicyVersion:'test-policy',semanticDirectionTargets:[{phaseId:'target',bone:'LeftArm'},{phaseId:'target',bone:'RightArm'},{phaseId:'hold',bone:'LeftArm'},{phaseId:'hold',bone:'RightArm'}]}};}},
    PocketPTMotionIntelligenceDiagnostics:{diagnosticsText(){return 'BASE';}},
    dispatchEvent(){}
  };
  const installed=Generator.installObservability(scope);
  assert.equal(installed.compilerWrapped,true);
  assert.equal(installed.diagnosticsWrapped,true);
  const spec={generationMetadata:{generatorVersion:'g',descriptionOperatorTranslatorVersion:'t',descriptionClassificationConsumed:true,classificationSource:'explicit',movementClassification:{movementFamily:'bilateral-squat'},selectedMovementOperators:[{id:'arm:ear-line-overhead'}],prohibitedTrajectories:['no backward sweep']}};
  const result=scope.PocketPTMotionSpecClip.compile({},spec,{});
  assert.equal(result.status,'ready');
  const snapshot=scope.PocketPTMotionIntelligenceDiagnostics.generatorOperatorSnapshot();
  assert.equal(snapshot.status,'PASS');
  assert.deepEqual([...snapshot.semanticSolvedPhases],['target','hold']);
  assert.deepEqual([...snapshot.postSemanticChangedBones],['LeftArm','RightArm']);
  assert.match(scope.PocketPTMotionIntelligenceDiagnostics.diagnosticsText(),/Post-semantic changed bones: LeftArm, RightArm/);
});

test('classified arm intent changes reusable operator without exercise-name branching',()=>{
  const description={movementClassification:{movementFamily:'standing-split-stance',supportPattern:'dual-foot-grounded',lowerBodyPattern:'front-knee-bent-rear-leg-straight',trunkPattern:'upright-side-open',armPathPattern:'opposed-lateral-reach-from-shoulders',headPattern:'rotate-toward-front-hand'},directionalRules:{prohibitedTrajectories:['arm behind torso']}};
  const plan={movementClassification:{...description.movementClassification}};
  const lateral=Generator.translateDescriptionToOperators(description,plan,[{id:'start'},{id:'target'},{id:'hold'},{id:'finish'}]);
  assert.ok(lateral.selectedMovementOperators.some(x=>x.id==='arm:opposed-lateral-shoulder-axis'));
  const changedDescription={...description,movementClassification:{...description.movementClassification,armPathPattern:'forward-support-line-from-shoulders'}};
  const changedPlan={movementClassification:{...plan.movementClassification,armPathPattern:'forward-support-line-from-shoulders'}};
  const forward=Generator.translateDescriptionToOperators(changedDescription,changedPlan,[{id:'start'},{id:'target'},{id:'hold'},{id:'finish'}]);
  assert.ok(forward.selectedMovementOperators.some(x=>x.id==='arm:forward-support-ear-line'));
  assert.ok(!forward.selectedMovementOperators.some(x=>x.id==='arm:opposed-lateral-shoulder-axis'));
});
