'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('three');

const ROOT = path.resolve(__dirname, '..');
const Ohsa = require('../public/motion/overhead-squat-assessment-motion-spec');
const Semantic = require('../public/motion/motion-spec-semantic-direction-policy');

function byId(id) { return Ohsa.spec.phases.find(phase => phase.id === id); }

function makeSemanticRig() {
  const avatar = new THREE.Object3D(); avatar.name = 'Avatar';
  const hips = new THREE.Bone(); hips.name = 'Hips';
  const spine = new THREE.Bone(); spine.name = 'Spine'; spine.position.set(0, 1, 0);
  const spine1 = new THREE.Bone(); spine1.name = 'Spine1'; spine1.position.set(0, .3, 0);
  const spine2 = new THREE.Bone(); spine2.name = 'Spine2'; spine2.position.set(0, .25, 0);
  const neck = new THREE.Bone(); neck.name = 'Neck'; neck.position.set(0, .22, 0);
  const head = new THREE.Bone(); head.name = 'Head'; head.position.set(0, .22, 0);
  const arm = new THREE.Bone(); arm.name = 'LeftArm'; arm.position.set(.2, .18, 0);
  const forearm = new THREE.Bone(); forearm.name = 'LeftForeArm'; forearm.position.set(.28, 0, 0);
  const hand = new THREE.Bone(); hand.name = 'LeftHand'; hand.position.set(.26, 0, 0);
  const middle = new THREE.Bone(); middle.name = 'LeftHandMiddle1'; middle.position.set(.12, 0, 0);
  const index = new THREE.Bone(); index.name = 'LeftHandIndex1'; index.position.set(.1, .03, .03);
  const pinky = new THREE.Bone(); pinky.name = 'LeftHandPinky1'; pinky.position.set(.1, -.03, .03);
  avatar.add(hips); hips.add(spine); spine.add(spine1); spine1.add(spine2); spine2.add(neck); neck.add(head); spine2.add(arm); arm.add(forearm); forearm.add(hand); hand.add(middle); hand.add(index); hand.add(pinky);
  avatar.updateMatrixWorld(true);
  return { avatar, hips, spine, spine1, spine2, neck, head, arm, forearm, hand, middle, index, pinky };
}

function direction(a, b) {
  return b.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).normalize();
}

function palmNormal(hand, index, pinky) {
  const origin = hand.getWorldPosition(new THREE.Vector3());
  return index.getWorldPosition(new THREE.Vector3()).sub(origin)
    .cross(pinky.getWorldPosition(new THREE.Vector3()).sub(origin))
    .multiplyScalar(-1)
    .normalize();
}

test('OHSA spec validates and defines ear alignment plus palms-in explicitly', () => {
  const result = Ohsa.validate(Ohsa.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Ohsa.spec.version, 1.2);
  assert.equal(Ohsa.spec.repetitionPlan.count, 3);
  assert.equal(Ohsa.spec.semanticPosePolicy.mode, 'target-rig-body-relative');
  const targets = Ohsa.spec.semanticPosePolicy.targets;
  assert.equal(targets.filter(t => t.type === 'bone_direction_reference').length, 2);
  assert.equal(targets.filter(t => t.type === 'hand_plane_faces_reference').length, 2);
  for (const arm of targets.filter(t => t.type === 'bone_direction_reference')) {
    assert.equal(arm.referenceBone, 'Neck');
    assert.equal(arm.referenceChildBone, 'Head');
  }
  assert.match(Ohsa.spec.movementContract.armIntent, /ears/i);
  assert.match(Ohsa.spec.movementContract.handIntent, /palms face inward/i);
});

test('semantic resolver treats Mixamo-prefixed and Avaturn-style names as the same body identity', () => {
  const { avatar, neck, head } = makeSemanticRig();
  const neckMatch = Semantic.resolveNode(avatar, 'mixamorig:Neck');
  const headMatch = Semantic.resolveNode(avatar, 'mixamorig_Head');
  assert.equal(neckMatch.status, 'ready');
  assert.equal(headMatch.status, 'ready');
  assert.equal(neckMatch.object, neck);
  assert.equal(headMatch.object, head);
  assert.equal(Semantic.normalizedBoneKey('mixamorig:LeftHandIndex1'), Semantic.normalizedBoneKey('LeftHandIndex1'));
});

test('body-relative arm solver follows Neck-to-Head instead of absolute world-up', () => {
  const { avatar, spine2, neck, head, arm, forearm } = makeSemanticRig();
  spine2.rotation.x = THREE.MathUtils.degToRad(28);
  avatar.updateMatrixWorld(true);
  const reference = direction(neck, head).clone();
  assert.ok(reference.angleTo(new THREE.Vector3(0,1,0)) > THREE.MathUtils.degToRad(20), 'fixture must incline head line away from world-up');
  const out = Semantic.orientBoneToDirection(THREE, avatar, {
    id:'ear_line', type:'bone_direction_reference', bone:'LeftArm', childBone:'LeftForeArm', referenceBone:'Neck', referenceChildBone:'Head'
  });
  assert.equal(out.status, 'ready');
  avatar.updateMatrixWorld(true);
  assert.ok(direction(arm, forearm).angleTo(reference) < 1e-6, 'upper arm must parallel the head/ear line');
  assert.ok(direction(arm, forearm).angleTo(new THREE.Vector3(0,1,0)) > THREE.MathUtils.degToRad(20), 'arm must not remain room-vertical');
});

test('palm solver twists hand around its long axis so anatomical palm faces inward', () => {
  const { avatar, head, hand, middle, index, pinky } = makeSemanticRig();
  const out = Semantic.orientPalmTowardReference(THREE, avatar, {
    id:'left_palm_in', type:'hand_plane_faces_reference', bone:'LeftHand', childBone:'LeftHandMiddle1', planePointA:'LeftHandIndex1', planePointB:'LeftHandPinky1', referenceBone:'Head', normalSign:1
  });
  assert.equal(out.status, 'ready');
  avatar.updateMatrixWorld(true);
  const axis = direction(hand, middle);
  let desired = head.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3()));
  desired.addScaledVector(axis, -desired.dot(axis)).normalize();
  let normal = palmNormal(hand, index, pinky);
  normal.addScaledVector(axis, -normal.dot(axis)).normalize();
  assert.ok(normal.angleTo(desired) < 1e-5, `palm residual ${THREE.MathUtils.radToDeg(normal.angleTo(desired))}°`);
  assert.equal(out.diagnostics.palmNormalConvention, 'negative-mirrored-index-pinky-cross');
});

test('phase-specific preparation keeps arm beside ears while torso angle changes', () => {
  const { avatar, hips, spine, spine1, neck, head, arm, forearm } = makeSemanticRig();
  const spec = {
    skeleton:{ rootBone:'Hips' }, durationSeconds:2,
    semanticPosePolicy:{ targets:[{ type:'bone_direction_reference', bone:'LeftArm', childBone:'LeftForeArm', referenceBone:'Neck', referenceChildBone:'Head' }] },
    phases:[
      { id:'top', normalizedTime:0, root:{ positionOffset:[0,0,0], rotationOffsetEulerDegrees:[0,0,0] }, boneTargets:[{ bone:'Spine',rotationOffsetEulerDegrees:[0,0,0] },{ bone:'Spine1',rotationOffsetEulerDegrees:[0,0,0] },{ bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,0] }] },
      { id:'bottom', normalizedTime:1, root:{ positionOffset:[0,0,0], rotationOffsetEulerDegrees:[12,0,0] }, boneTargets:[{ bone:'Spine',rotationOffsetEulerDegrees:[15,0,0] },{ bone:'Spine1',rotationOffsetEulerDegrees:[8,0,0] },{ bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,0] }] }
    ]
  };
  const prepared = Semantic.buildPhaseSpecificSpec(THREE, spec, avatar);
  assert.equal(prepared.status, 'ready');
  const topArm = prepared.spec.phases[0].boneTargets.find(t => t.bone === 'LeftArm').rotationOffsetEulerDegrees;
  const bottomArm = prepared.spec.phases[1].boneTargets.find(t => t.bone === 'LeftArm').rotationOffsetEulerDegrees;
  assert.notDeepEqual(bottomArm, topArm, 'local solution should change as body reference changes');

  const rest = new Map([[hips,hips.quaternion.clone()],[spine,spine.quaternion.clone()],[spine1,spine1.quaternion.clone()],[arm,arm.quaternion.clone()]]);
  function apply(phase) {
    for (const [node,q] of rest) node.quaternion.copy(q);
    const r = phase.root.rotationOffsetEulerDegrees.map(THREE.MathUtils.degToRad);
    hips.quaternion.copy(rest.get(hips)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...r,'XYZ')));
    for (const t of phase.boneTargets) {
      const node = t.bone === 'Spine' ? spine : t.bone === 'Spine1' ? spine1 : t.bone === 'LeftArm' ? arm : null;
      if (!node || !rest.has(node)) continue;
      const e = t.rotationOffsetEulerDegrees.map(THREE.MathUtils.degToRad);
      node.quaternion.copy(rest.get(node)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...e,'XYZ')));
    }
    avatar.updateMatrixWorld(true);
  }
  for (const phase of prepared.spec.phases) {
    apply(phase);
    assert.ok(direction(arm,forearm).angleTo(direction(neck,head)) < 1e-5, `${phase.id} lost ear alignment`);
  }
});

test('bottom holds and mirrored ascent remain intact', () => {
  for (const rep of [1,2,3]) {
    const bottom = byId(`rep${rep}_bottom`), hold = byId(`rep${rep}_bottom_hold`);
    assert.deepEqual(hold.root, bottom.root);
    assert.deepEqual(hold.boneTargets, bottom.boneTargets);
    assert.ok(Math.abs((hold.normalizedTime - bottom.normalizedTime) * Ohsa.spec.durationSeconds - 0.18) < 1e-9);
    assert.deepEqual(byId(`rep${rep}_ascent_mid`).root, byId(`rep${rep}_descent_mid`).root);
    assert.deepEqual(byId(`rep${rep}_ascent_mid`).boneTargets, byId(`rep${rep}_descent_mid`).boneTargets);
  }
});

test('grounded preview expansion preserves all four semantic targets', () => {
  const source = fs.readFileSync(path.join(ROOT,'public/motion/motion-lab-overhead-squat-assessment-preview.js'),'utf8');
  const document = { getElementById(){ return null; } };
  const window = { document };
  vm.runInNewContext(source,{ window,document,Object,Array,Map,Set,JSON,Math,Number });
  const api = window.PocketPTMotionLabOverheadSquatAssessmentPreview;
  const mapped = { status:'ready', spec:{ ...Ohsa.spec, phases:Ohsa.spec.phases, groundingPolicy:Ohsa.spec.groundingPolicy }, contract:{ spec:Ohsa.spec }, diagnostics:{} };
  const expanded = api.densifyMappedContract(mapped);
  assert.equal(expanded.status,'ready');
  assert.ok(expanded.spec.playbackGroundingExpansion.insertedGroundingSamples > 0);
  assert.equal(expanded.spec.semanticPosePolicy.targets.length,4);
});

test('movement contract documents ear-relative alignment and palms-in requirement', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT,'public/motion/contracts/overhead-squat-assessment.v1.json'),'utf8'));
  assert.ok(contract.inputsRequiredForDesiredMotion.trajectoryConstraints.some(line => /neck-to-head/i.test(line)));
  assert.ok(contract.inputsRequiredForDesiredMotion.trajectoryConstraints.some(line => /palm/i.test(line)));
  assert.match(contract.retargetLesson.whyItFailed,/world-up/i);
  assert.match(contract.retargetLesson.systemUpgrade,/body-relative/i);
});
