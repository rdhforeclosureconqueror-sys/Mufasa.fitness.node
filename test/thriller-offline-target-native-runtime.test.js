"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const runtime = require("../public/motion/thriller-offline-target-native-runtime");
const catalog = require("../public/motion/thriller-motion-catalog");

function track(name) { return { name, times: new Float32Array([0, 1]), values: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]) }; }
function fixtureClip() {
  const names = ["Hips", ...Array.from({ length: 53 }, (_, i) => `Bone${i + 1}`)];
  const tracks = [];
  for (const name of names) {
    tracks.push(track(`${name}.quaternion`));
    tracks.push({ name: `${name}.position`, times: new Float32Array([0, 1]), values: new Float32Array([0, 0, 0, 0, 0, 0]) });
    tracks.push({ name: `${name}.scale`, times: new Float32Array([0, 1]), values: new Float32Array([1, 1, 1, 1, 1, 1]) });
  }
  return { name: "Thriller_Part_1_Avaturn", duration: 29.866, tracks };
}
function mapping() {
  const canonicalMap = { Hips: "Hips" };
  for (let i = 1; i < 20; i++) canonicalMap[`Joint${i}`] = `Bone${i}`;
  return { canonicalMap };
}
function transform(values) { return { values:[...values], toArray(){ return [...this.values]; }, fromArray(next){ this.values=[...next]; } }; }
function avatarScene() {
  const hips = { name:"Hips", isBone:true, parent:null, position:transform([0,1,0]), quaternion:transform([0,0,0,1]), scale:transform([1,1,1]) };
  const bones = [hips];
  for (let i=1;i<20;i++) bones.push({ name:`Bone${i}`, isBone:true, parent:hips, position:transform([0,0.05+i/100,0]), quaternion:transform([0,0,0,1]), scale:transform([1,1,1]) });
  return { name:"PersonalizedAvatar", uuid:"avatar-test", updateMatrixWorld(){}, traverse(visitor){ bones.forEach(visitor); }, bones };
}
const THREE = { AnimationClip: class AnimationClip { constructor(name, duration, tracks) { this.name = name; this.duration = duration; this.tracks = tracks; } } };

test("offline Avaturn Thriller uses target-native filter-only clip instead of runtime quaternion conversion", () => {
  const source = fixtureClip();
  const out = runtime.makeSafeClip(THREE, source, mapping());
  assert.equal(out.status, "ready");
  assert.equal(out.diagnostics.runtimeRetargetSkipped, true);
  assert.equal(out.diagnostics.worldBasisConversion, false);
  assert.equal(out.diagnostics.sourceTrackCount, 162);
  assert.equal(out.diagnostics.playableTrackCount, 21);
  assert.equal(out.diagnostics.canonicalJointsRetained, 20);
  assert.equal(out.diagnostics.rootPositionTracks, 1);
  assert.equal(out.diagnostics.droppedScaleTracks, 54);
  assert.equal(out.diagnostics.droppedNonRootPositionTracks, 53);
  assert.equal(out.diagnostics.droppedAuxiliaryQuaternionTracks, 34);
  assert.equal(out.clip.tracks.some(item => item.name === "Hips.position"), true);
  assert.equal(out.clip.tracks.some(item => /\.scale$/.test(item.name)), false);
  assert.equal(out.clip.tracks.some(item => /^Bone20\.quaternion$/.test(item.name)), false);
  assert.equal(out.clip.tracks[0], source.tracks[0], "retained keyframe tracks are reused without copying their arrays");
});

test("offline target-native path requires the saved 20-joint Gym mapping", () => {
  const out = runtime.makeSafeClip(THREE, fixtureClip(), { canonicalMap: { Hips: "Hips" } });
  assert.equal(out.status, "failed");
  assert.equal(out.code, "gym_mapping_required");
});

test("Thriller catalog is explicitly offline-retargeted to Avaturn and qualifies for target-native playback", () => {
  const motion = catalog.parts[0];
  const session = { avatarProfile: { skeletonProfile: "avaturn-native-v1" } };
  assert.equal(motion.bindingMode, runtime.OFFLINE_BINDING);
  assert.match(motion.runtimeClipName, /_Avaturn$/);
  assert.equal(runtime.isOfflineTargetNative(motion, session), true);
});

test("offline target-native selection bypasses the full independent loader and binds only the filtered clip", async () => {
  const previousCompatibility = globalThis.PocketPTMotionLabGymCompatibility;
  globalThis.PocketPTMotionLabGymCompatibility = { loadProfile(){ return mapping(); } };
  let originalLoadCalls = 0, disposedScenes = 0, boundClip = null;
  const avatar = avatarScene(), sourceClip = fixtureClip(), sourceScene = { traverse(){}, name:"OfflineFixture" };
  const session = {
    THREE,
    avatar,
    avatarProfile:{ avatarId:"avaturn-personalized-candidate", skeletonProfile:"avaturn-native-v1" },
    mixer:{ getRoot(){ return avatar; }, clipAction(clip){ boundClip=clip; return { setLoop(){}, play(){}, stop(){}, time:0 }; } },
    loop:true,
    async loadIndependentRetargetedMotion(){ originalLoadCalls++; throw new Error("full loader must not run for target-native Thriller"); },
    async loadAsset(){ return { scene:sourceScene, animations:[sourceClip], parser:{json:{skins:[],meshes:[]}} }; },
    inspectClipBindings(clip){ return { boundTrackCount:clip.tracks.length, unboundTrackCount:0, unboundTracks:Object.freeze([]) }; },
    disposeObjectResources(scene){ if(scene===sourceScene) disposedScenes++; },
    snapshotRepresentativeBones(){ return Object.freeze([]); },
    stop(){ return {status:"stopped"}; },
    unloadMotion(){ return {status:"ready"}; },
    setLoop(){}
  };
  try {
    runtime.decorateSession(session);
    const out = await session.loadIndependentRetargetedMotion(catalog.parts[0]);
    assert.equal(out.status,"ready");
    assert.equal(originalLoadCalls,0,"target-native path must never enter the old 162-track full loader");
    assert.equal(out.diagnostics.fullIndependentLoaderSkipped,true);
    assert.equal(out.diagnostics.runtimeRetargetSkipped,true);
    assert.equal(out.diagnostics.trackCount,21);
    assert.equal(boundClip.tracks.length,21);
    assert.equal(disposedScenes,1,"source GLB scene should be released immediately after extracting the safe clip");
  } finally {
    if(previousCompatibility===undefined) delete globalThis.PocketPTMotionLabGymCompatibility;
    else globalThis.PocketPTMotionLabGymCompatibility=previousCompatibility;
  }
});

test("Motion Lab loads offline target-native runtime after review hardening and before runtime installation", () => {
  const integration = fs.readFileSync(path.join(__dirname, "../public/motion/motion-lab-gym-compatibility-integration.js"), "utf8");
  const hardening = integration.indexOf("retarget-motion-compatibility-review-fix.js");
  const offline = integration.indexOf("thriller-offline-target-native-runtime.js");
  const install = integration.indexOf("RETARGET_COMPATIBILITY_INSTALL");
  assert.ok(hardening >= 0 && offline > hardening);
  assert.ok(install > offline);
  assert.match(integration, /__thrillerOfflineTargetNativeRuntimeInstalled/);
});
