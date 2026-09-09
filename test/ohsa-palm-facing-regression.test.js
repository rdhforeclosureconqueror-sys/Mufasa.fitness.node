'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');
const Semantic = require('../public/motion/motion-spec-semantic-direction-policy');

function buildHandFixture() {
  const avatar = new THREE.Object3D();
  const hand = new THREE.Bone(); hand.name = 'LeftHand';
  const middle = new THREE.Bone(); middle.name = 'LeftHandMiddle1'; middle.position.set(0.12, 0, 0);
  const index = new THREE.Bone(); index.name = 'LeftHandIndex1'; index.position.set(0.10, 0.03, 0.03);
  const pinky = new THREE.Bone(); pinky.name = 'LeftHandPinky1'; pinky.position.set(0.10, -0.03, 0.03);
  const head = new THREE.Bone(); head.name = 'Head'; head.position.set(0, 0, 1);
  avatar.add(hand); avatar.add(head);
  hand.add(middle); hand.add(index); hand.add(pinky);
  avatar.updateMatrixWorld(true);
  return { avatar, hand, middle, index, pinky, head };
}

function projectedPhysicalPalmNormal(hand, middle, index, pinky) {
  const origin = hand.getWorldPosition(new THREE.Vector3());
  const axis = middle.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const a = index.getWorldPosition(new THREE.Vector3()).sub(origin);
  const b = pinky.getWorldPosition(new THREE.Vector3()).sub(origin);
  const physicalPalm = a.cross(b).multiplyScalar(-1);
  physicalPalm.addScaledVector(axis, -physicalPalm.dot(axis));
  return physicalPalm.normalize();
}

test('palms-in solver targets anatomical palm surface rather than back-of-hand plane normal', () => {
  const { avatar, hand, middle, index, pinky, head } = buildHandFixture();
  const out = Semantic.orientPalmTowardReference(THREE, avatar, {
    id: 'left_palm_in',
    type: 'hand_plane_faces_reference',
    bone: 'LeftHand',
    childBone: 'LeftHandMiddle1',
    planePointA: 'LeftHandIndex1',
    planePointB: 'LeftHandPinky1',
    referenceBone: 'Head',
    normalSign: 1
  });

  assert.equal(out.status, 'ready');
  assert.equal(out.diagnostics.palmNormalConvention, 'negative-mirrored-index-pinky-cross');
  avatar.updateMatrixWorld(true);

  const origin = hand.getWorldPosition(new THREE.Vector3());
  const axis = middle.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const desired = head.getWorldPosition(new THREE.Vector3()).sub(origin);
  desired.addScaledVector(axis, -desired.dot(axis)).normalize();

  const palm = projectedPhysicalPalmNormal(hand, middle, index, pinky);
  const residual = THREE.MathUtils.radToDeg(palm.angleTo(desired));
  assert.ok(residual < 0.001, `anatomical palm should face inward; residual=${residual}°`);
  assert.ok(out.diagnostics.residualDegrees < 0.001);
});
