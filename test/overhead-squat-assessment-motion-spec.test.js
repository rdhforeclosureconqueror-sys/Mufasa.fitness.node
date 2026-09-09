const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');

const ROOT = path.resolve(__dirname, '..');
const Ohsa = require('../public/motion/overhead-squat-assessment-motion-spec');
const SemanticDirection = require('../public/motion/motion-spec-semantic-direction-policy');

function byId(id) {
  return Ohsa.spec.phases.find(phase => phase.id === id);
}

function makeArmRig() {
  const avatar = new THREE.Object3D();
  avatar.name = 'Avatar';
  const hips = new THREE.Bone(); hips.name = 'Hips';
  const spine = new THREE.Bone(); spine.name = 'Spine';
  const spine1 = new THREE.Bone(); spine1.name = 'Spine1';
  const shoulderParent = new THREE.Bone(); shoulderParent.name = 'Spine2';
  const arm = new THREE.Bone(); arm.name = 'LeftArm';
  const forearm = new THREE.Bone(); forearm.name = 'LeftForeArm';
  // Deliberately model a rig whose arm's rest segment points along local +X.
  forearm.position.set(1, 0, 0);
  avatar.add(hips); hips.add(spine); spine.add(spine1); spine1.add(shoulderParent); shoulderParent.add(arm); arm.add(forearm);
  avatar.updateMatrixWorld(true);
  return { avatar, hips, spine, spine1, shoulderParent, arm, forearm };
}

function armDirection(arm, forearm) {
  return forearm.getWorldPosition(new THREE.Vector3()).sub(arm.getWorldPosition(new THREE.Vector3())).normalize();
}

test('OHSA motion spec validates and exposes three controlled reps', () => {
  const result = Ohsa.validate(Ohsa.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Ohsa.spec.exerciseId, 'overhead_squat_assessment');
  assert.equal(Ohsa.spec.repetitionPlan.count, 3);
  assert.equal(Ohsa.spec.loop, false);
  assert.deepEqual(Ohsa.spec.groundingPolicy.contacts, ['left_foot', 'right_foot']);
  assert.equal(Ohsa.spec.groundingPolicy.enforceContactAnchors, true);
  assert.equal(Ohsa.spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(Ohsa.spec.groundingPolicy.anchorPhaseId, 'setup_overhead');
  assert.equal(Ohsa.spec.groundingPolicy.kinematicChains.length, 2);
});

test('OHSA expresses overhead arms semantically instead of copying a local Euler-axis guess', () => {
  assert.equal(Ohsa.spec.semanticPosePolicy.mode, 'target-rig-world-direction');
  assert.equal(Ohsa.spec.semanticPosePolicy.targets.length, 2);
  for (const semantic of Ohsa.spec.semanticPosePolicy.targets) {
    assert.equal(semantic.type, 'bone_direction_world');
    assert.deepEqual(semantic.worldDirection, [0, 1, 0]);
  }
  for (const phase of Ohsa.spec.phases) {
    for (const bone of ['mixamorig:LeftArm','mixamorig:RightArm','mixamorig:LeftForeArm','mixamorig:RightForeArm']) {
      assert.deepEqual(phase.boneTargets.find(item => item.bone === bone).rotationOffsetEulerDegrees, [0, 0, 0]);
    }
  }
  assert.equal(Ohsa.spec.synthesisBoundary.overheadPoseStatus, 'semantic-world-up-owner-visual-verification-required');
});

test('semantic direction solver points a target-rig arm overhead even when its rest bone axis is +X', () => {
  const { avatar, arm, forearm } = makeArmRig();
  const result = SemanticDirection.orientBoneToWorldDirection(THREE, avatar, {
    id:'left_overhead', type:'bone_direction_world', bone:'LeftArm', childBone:'LeftForeArm', worldDirection:[0,1,0]
  });
  assert.equal(result.status, 'ready');
  avatar.updateMatrixWorld(true);
  const direction = armDirection(arm, forearm);
  assert.ok(direction.distanceTo(new THREE.Vector3(0,1,0)) < 1e-6, `solved direction was ${direction.toArray()}`);
  assert.ok(result.diagnostics.beforeAngleDegrees > 80);
  assert.ok(result.diagnostics.residualDegrees < 1e-5);
});

test('phase-specific semantic solve compensates changing torso rotation instead of reusing one rest-pose quaternion', () => {
  const { avatar, hips, spine, spine1, arm, forearm } = makeArmRig();
  const original = arm.quaternion.clone();
  const spec = {
    skeleton:{ rootBone:'Hips' },
    durationSeconds:2,
    semanticPosePolicy:{ targets:[{ id:'left_overhead', type:'bone_direction_world', bone:'LeftArm', childBone:'LeftForeArm', worldDirection:[0,1,0] }] },
    phases:[
      { id:'top', normalizedTime:0, root:{ positionOffset:[0,0,0], rotationOffsetEulerDegrees:[0,0,0] }, boneTargets:[
        { bone:'Spine', rotationOffsetEulerDegrees:[0,0,0] },
        { bone:'Spine1', rotationOffsetEulerDegrees:[0,0,0] },
        { bone:'LeftArm', rotationOffsetEulerDegrees:[0,0,0] },
        { bone:'LeftForeArm', rotationOffsetEulerDegrees:[0,0,0] }
      ]},
      { id:'bottom', normalizedTime:1, root:{ positionOffset:[0,0,0], rotationOffsetEulerDegrees:[20,0,0] }, boneTargets:[
        { bone:'Spine', rotationOffsetEulerDegrees:[18,0,0] },
        { bone:'Spine1', rotationOffsetEulerDegrees:[11,0,0] },
        { bone:'LeftArm', rotationOffsetEulerDegrees:[0,0,0] },
        { bone:'LeftForeArm', rotationOffsetEulerDegrees:[0,0,0] }
      ]}
    ]
  };

  const prepared = SemanticDirection.buildPhaseSpecificSpec(THREE, spec, avatar);
  assert.equal(prepared.status, 'ready');
  assert.equal(prepared.diagnostics.solvedPhaseCount, 2);
  const topArm = prepared.spec.phases[0].boneTargets.find(item => item.bone === 'LeftArm').rotationOffsetEulerDegrees;
  const bottomArm = prepared.spec.phases[1].boneTargets.find(item => item.bone === 'LeftArm').rotationOffsetEulerDegrees;
  assert.notDeepEqual(bottomArm, topArm, 'torso rotation must produce a phase-specific local arm solution');

  const rest = new Map([[hips, hips.quaternion.clone()], [spine, spine.quaternion.clone()], [spine1, spine1.quaternion.clone()], [arm, original.clone()]]);
  function applyPreparedPhase(phase) {
    for (const [node, q] of rest) node.quaternion.copy(q);
    const rootEuler = phase.root.rotationOffsetEulerDegrees.map(THREE.MathUtils.degToRad);
    hips.quaternion.copy(rest.get(hips)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rootEuler, 'XYZ')));
    for (const target of phase.boneTargets) {
      const node = target.bone === 'Spine' ? spine : target.bone === 'Spine1' ? spine1 : target.bone === 'LeftArm' ? arm : null;
      if (!node || !rest.has(node)) continue;
      const e = target.rotationOffsetEulerDegrees.map(THREE.MathUtils.degToRad);
      node.quaternion.copy(rest.get(node)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...e, 'XYZ')));
    }
    avatar.updateMatrixWorld(true);
  }

  for (const phase of prepared.spec.phases) {
    applyPreparedPhase(phase);
    const direction = armDirection(arm, forearm);
    assert.ok(direction.distanceTo(new THREE.Vector3(0,1,0)) < 1e-5, `${phase.id} direction was ${direction.toArray()}`);
  }
  assert.ok(arm.quaternion.angleTo(original) > 0, 'test application should alter arm after verification');
  arm.quaternion.copy(original);
  avatar.updateMatrixWorld(true);
});

test('semantic compiler policy prepares phase-specific targets and restores the avatar after preparation', () => {
  const { avatar, arm } = makeArmRig();
  const original = arm.quaternion.clone();
  let receivedPhaseSpecific = false;
  const base = {
    compile(_THREE, preparedSpec) {
      receivedPhaseSpecific = preparedSpec?.semanticPoseCompilation?.mode === 'phase-specific-after-ancestor-pose';
      return { status:'ready', clip:{}, diagnostics:{} };
    }
  };
  const wrapped = SemanticDirection.install(base);
  const out = wrapped.compile(THREE, {
    skeleton:{ rootBone:'Hips' },
    durationSeconds:1,
    semanticPosePolicy:{ targets:[{ type:'bone_direction_world', bone:'LeftArm', childBone:'LeftForeArm', worldDirection:[0,1,0] }] },
    phases:[{ id:'setup', normalizedTime:0, root:{ positionOffset:[0,0,0], rotationOffsetEulerDegrees:[0,0,0] }, boneTargets:[{ bone:'LeftArm', rotationOffsetEulerDegrees:[0,0,0] }, { bone:'LeftForeArm', rotationOffsetEulerDegrees:[0,0,0] }] }]
  }, avatar);
  assert.equal(out.status, 'ready');
  assert.equal(receivedPhaseSpecific, true);
  assert.equal(out.diagnostics.semanticDirectionPolicyApplied, true);
  assert.equal(out.diagnostics.semanticDirectionSolveMode, 'phase-specific-after-ancestor-pose');
  assert.ok(arm.quaternion.angleTo(original) < 1e-10, 'avatar rest quaternion must be restored before/after compilation');
});

test('OHSA encodes a real 0.18 second bottom hold for all three reps', () => {
  for (const rep of [1, 2, 3]) {
    const bottom = byId(`rep${rep}_bottom`);
    const hold = byId(`rep${rep}_bottom_hold`);
    assert.deepEqual(hold.root, bottom.root);
    assert.deepEqual(hold.boneTargets, bottom.boneTargets);
    const seconds = (hold.normalizedTime - bottom.normalizedTime) * Ohsa.spec.durationSeconds;
    assert.ok(Math.abs(seconds - 0.18) < 1e-9, `rep${rep} hold was ${seconds}s`);
  }
});

test('OHSA ascent mirrors descent through the same MID geometry', () => {
  for (const rep of [1, 2, 3]) {
    const descent = byId(`rep${rep}_descent_mid`);
    const ascent = byId(`rep${rep}_ascent_mid`);
    assert.deepEqual(ascent.root, descent.root);
    assert.deepEqual(ascent.boneTargets, descent.boneTargets);
  }
});

test('OHSA phase-first sequence returns to exact overhead top after each rep', () => {
  const setup = byId('setup_overhead');
  for (const id of ['rep1_top', 'rep2_top', 'rep3_top', 'finish_overhead']) {
    assert.deepEqual(byId(id).boneTargets, setup.boneTargets);
    assert.deepEqual(byId(id).root.positionOffset, [0, 0, 0]);
  }
  for (const id of ['rep1_bottom', 'rep2_bottom', 'rep3_bottom']) {
    assert.ok(byId(id).root.positionOffset[1] < 0);
    assert.ok(byId(id).root.positionOffset[2] < 0);
  }
});

test('OHSA Coach preview expands grounded transitions into solved playback samples', () => {
  const source = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-overhead-squat-assessment-preview.js'), 'utf8');
  const document = { getElementById() { return null; } };
  const window = { document };
  vm.runInNewContext(source, { window, document, Object, Array, Map, Set, JSON, Math, Number });
  const api = window.PocketPTMotionLabOverheadSquatAssessmentPreview;
  assert.equal(typeof api.densifyMappedContract, 'function');

  const mapped = {
    status: 'ready',
    spec: { ...Ohsa.spec, phases: Ohsa.spec.phases, groundingPolicy: Ohsa.spec.groundingPolicy },
    contract: { spec: Ohsa.spec },
    diagnostics: {}
  };
  const expanded = api.densifyMappedContract(mapped);
  assert.equal(expanded.status, 'ready');
  assert.ok(expanded.spec.phases.length > Ohsa.spec.phases.length);
  assert.ok(expanded.spec.playbackGroundingExpansion.insertedGroundingSamples > 0);
  assert.equal(expanded.spec.playbackGroundingExpansion.segmentsPerGroundedTransition, 4);
  assert.equal(expanded.contract.validate(expanded.spec).valid, true);
  assert.equal(expanded.spec.semanticPosePolicy.targets.length, 2);

  const generated = expanded.spec.phases.filter(phase => phase.generatedPlaybackSample);
  assert.ok(generated.length > 0);
  for (const phase of generated) assert.deepEqual(Array.from(phase.contacts), ['left_foot', 'right_foot']);
});

test('OHSA keeps demonstration separate from scoring and lists review views/checkpoints', () => {
  const summary = Ohsa.summary();
  assert.equal(summary.productionAssessmentScoring, false);
  assert.equal(summary.requiresHumanVisualCalibration, true);
  assert.equal(summary.semanticDirectionTargetCount, 2);
  assert.deepEqual(summary.observationViews, ['front', 'right_side', 'back_optional']);
  assert.ok(summary.observationCheckpoints.includes('knee_tracking'));
  assert.ok(summary.observationCheckpoints.includes('arms_overhead_retention'));
});

test('Motion Lab bridge installs semantic policy before OHSA and remaps semantic bone identities', () => {
  const bridge = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');
  const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-overhead-squat-assessment-preview.js'), 'utf8');
  assert.match(bridge, /motion-spec-semantic-direction-policy\.js/);
  assert.match(bridge, /PocketPTMotionSpecSemanticDirectionPolicy\?\.install/);
  assert.match(bridge, /remapSemanticTarget/);
  assert.match(bridge, /semantic_world_direction_plus_rest_relative_local/);
  assert.match(bridge, /loadOverheadSquatAssessment/);
  assert.match(bridge, /overhead-squat-assessment-motion-spec\.js/);
  assert.match(preview, /buildCoachSpec/);
  assert.match(preview, /ownerCalibrationTarget:\s*"setup_overhead"/);
  assert.match(preview, /densifyMappedContract/);
});

test('OHSA movement contract records the retarget lesson and information required for desired motion', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/overhead-squat-assessment.v1.json'), 'utf8'));
  assert.equal(contract.exerciseId, 'overhead_squat_assessment');
  assert.ok(contract.inputsRequiredForDesiredMotion.startPosition.length >= 6);
  assert.ok(contract.inputsRequiredForDesiredMotion.phaseSequence.length >= 4);
  assert.ok(contract.inputsRequiredForDesiredMotion.contactConstraints.length >= 2);
  assert.ok(contract.inputsRequiredForDesiredMotion.trajectoryConstraints.length >= 5);
  assert.ok(contract.inputsRequiredForDesiredMotion.rigSemanticConstraints.length >= 4);
  assert.equal(contract.inputsRequiredForDesiredMotion.timing.repetitions, 3);
  assert.equal(contract.calibrationPolicy.provisionalField, 'exact arms-by-ears spacing after semantic world-up solve');
  assert.match(contract.retargetLesson.previousMistake, /Mixamo/);
  assert.match(contract.retargetLesson.whyItFailed, /local coordinate axes differ/);
});
