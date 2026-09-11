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

test("Motion Lab loads offline target-native runtime after review hardening and before runtime installation", () => {
  const integration = fs.readFileSync(path.join(__dirname, "../public/motion/motion-lab-gym-compatibility-integration.js"), "utf8");
  const hardening = integration.indexOf("retarget-motion-compatibility-review-fix.js");
  const offline = integration.indexOf("thriller-offline-target-native-runtime.js");
  const install = integration.indexOf("RETARGET_COMPATIBILITY_INSTALL");
  assert.ok(hardening >= 0 && offline > hardening);
  assert.ok(install > offline);
  assert.match(integration, /__thrillerOfflineTargetNativeRuntimeInstalled/);
});
