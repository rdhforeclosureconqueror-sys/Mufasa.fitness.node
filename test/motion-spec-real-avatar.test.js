"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const compiler = require("../public/motion/motion-spec-clip");
const squat = require("../public/motion/squat-motion-spec");
const pushUp = require("../public/motion/push-up-motion-spec");
const runtime = require("../public/motion/disposable-motion-session");

async function referenceAvatar() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  // Parse the shipped skeleton and geometry. These Node checks make no texture
  // or rendered-appearance claim; browser/device acceptance remains separate.
  const loader = new GLTFLoader().register(() => ({ name: "node-test-textures", loadTexture: () => Promise.resolve(null) }));
  const bytes = fs.readFileSync(path.join(__dirname, "../public/motion/assets/phase-e/canonical-avatar.glb"));
  const asset = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  return { THREE, avatar: asset.scene };
}

test("both engineering specs bind to the shipped GLTFLoader reference skeleton", async () => {
  const { THREE, avatar } = await referenceAvatar();
  assert.ok(avatar.getObjectByName("mixamorigHips"));
  assert.equal(avatar.getObjectByName("mixamorig:Hips"), undefined);
  for (const contract of [squat, pushUp]) {
    const result = compiler.compile(THREE, contract.spec, avatar);
    assert.equal(result.status, "ready");
    assert.equal(result.diagnostics.unboundTargetCount, 0);
    assert.ok(result.diagnostics.aliasBindingCount > 0);
    for (const track of result.clip.tracks) {
      const parsed = THREE.PropertyBinding.parseTrackName(track.name);
      const node = THREE.PropertyBinding.findNode(avatar, parsed.nodeName);
      assert.ok(node && parsed.propertyName in node, track.name);
      assert.ok(Array.from(track.values).every(Number.isFinite));
    }
  }
  const missing = structuredClone(squat.spec);
  missing.phases[0].boneTargets[0].bone = "unknown:Spine";
  assert.equal(compiler.compile(THREE, missing, avatar).code, "motion_targets_unbound");
  const ambiguous = new THREE.Bone();
  ambiguous.name = "MIXAMORIG:HIPs";
  avatar.add(ambiguous);
  assert.equal(compiler.compile(THREE, squat.spec, avatar).code, "motion_targets_ambiguous");
});

test("squat root offsets use avatar height through the rotated, scaled armature", async () => {
  const { THREE, avatar } = await referenceAvatar();
  avatar.updateMatrixWorld(true);
  const root = avatar.getObjectByName("mixamorigHips");
  const original = root.getWorldPosition(new THREE.Vector3());
  const restRotation = root.quaternion.clone();
  const height = new THREE.Box3().setFromObject(avatar).getSize(new THREE.Vector3()).y;
  const { clip } = compiler.compile(THREE, squat.spec, avatar);
  const mixer = new THREE.AnimationMixer(avatar);
  mixer.clipAction(clip).play();
  for (const phase of squat.spec.phases) {
    mixer.setTime(phase.normalizedTime * squat.spec.durationSeconds);
    avatar.updateMatrixWorld(true);
    const actual = root.getWorldPosition(new THREE.Vector3());
    const expected = original.clone().add(new THREE.Vector3(...phase.root.positionOffset).multiplyScalar(height));
    assert.ok(actual.distanceTo(expected) < 1e-5, phase.id);
    const angles = phase.root.rotationOffsetEulerDegrees.map(THREE.MathUtils.degToRad);
    const rotation = restRotation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles, "XYZ")));
    assert.ok(root.quaternion.angleTo(rotation) < 0.001, phase.id + " pelvis rotation");
  }
  assert.notEqual(squat.spec.phases[2].root.rotationOffsetEulerDegrees[0], 0);
});

test("switching specs during playback recompiles from rest without pose accumulation", async t => {
  const { THREE, avatar } = await referenceAvatar();
  const session = runtime.createMotionSession();
  Object.assign(session, { THREE, avatar, mixer: new THREE.AnimationMixer(avatar) });
  t.after(() => session.dispose());
  const values = clip => clip.tracks.map(track => Array.from(track.values));
  const expected = values(compiler.compile(THREE, squat.spec, avatar).clip);
  for (let cycle = 0; cycle < 6; cycle++) {
    assert.equal(session.loadMotionSpec(pushUp.spec, compiler).status, "ready");
    assert.equal(session.action.isRunning(), false, "loading must not autoplay");
    session.play(); session.mixer.update(1.4); session.pause();
    assert.equal(session.loadMotionSpec(squat.spec, compiler).status, "ready");
    assert.deepEqual(values(session.sessionClip), expected);
    assert.equal(session.action.isRunning(), false);
    session.play(); session.mixer.update(1.1); session.pause();
  }
  session.dispose();
  assert.deepEqual(runtime.diagnostics(), { activeSessions:0, activeRafs:0, listeners:0, timers:0, canvases:0 });
});

test("the reference squat avoids reversed knee travel and catastrophic foot drift", async () => {
  const { THREE, avatar } = await referenceAvatar();
  avatar.updateMatrixWorld(true);
  const height = new THREE.Box3().setFromObject(avatar).getSize(new THREE.Vector3()).y;
  const { clip } = compiler.compile(THREE, squat.spec, avatar);
  const mixer = new THREE.AnimationMixer(avatar);
  mixer.clipAction(clip).play(); mixer.update(0); avatar.updateMatrixWorld(true);
  const feet = ["LeftFoot", "RightFoot"].map(name => avatar.getObjectByName("mixamorig" + name));
  const startFeet = feet.map(bone => bone.getWorldPosition(new THREE.Vector3()));
  for (let sample = 0; sample <= 100; sample++) {
    mixer.setTime(sample / 100 * squat.spec.durationSeconds); avatar.updateMatrixWorld(true);
    feet.forEach((bone, index) => {
      const displacement = bone.getWorldPosition(new THREE.Vector3()).distanceTo(startFeet[index]);
      // Engineering regression bound, not a human/biomechanical acceptance rule.
      assert.ok(displacement < height * 0.025, "foot drift at sample " + sample);
    });
  }
  mixer.setTime(squat.spec.durationSeconds / 2); avatar.updateMatrixWorld(true);
  for (const side of ["Left", "Right"]) {
    const knee = avatar.getObjectByName("mixamorig" + side + "Leg").getWorldPosition(new THREE.Vector3());
    const hip = avatar.getObjectByName("mixamorig" + side + "UpLeg").getWorldPosition(new THREE.Vector3());
    assert.ok(knee.z > hip.z, side + " knee should travel forward on the reference rig");
  }
});
