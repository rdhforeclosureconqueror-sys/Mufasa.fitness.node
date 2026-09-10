"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const catalog = require("../public/motion/thriller-motion-catalog");
const sessionRuntime = require("../public/motion/disposable-motion-session");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Thriller catalog has stable ordered IDs and preserves source FBX separately from runtime GLB", () => {
  assert.equal(catalog.parts.length, 4);
  assert.deepEqual(catalog.parts.map(x => x.id), [1,2,3,4].map(x => `thriller-part-${x}`));
  assert.deepEqual(catalog.parts.map(x => x.sourceFbxPath), [1,2,3,4].map(x => `/motion/assets/thriller/Thriller Part ${x}.fbx`));
  assert.deepEqual(catalog.parts.map(x => x.runtimeAssetPath), [1,2,3,4].map(x => `/motion/assets/thriller/runtime/Thriller Part ${x}.glb`));
  assert.ok(catalog.parts.every(x => x.sourceSkeletonProfile === "mixamo-v1" && x.targetSkeletonProfile === "avaturn-native-v1"));
});

function runtimeHarness(loadResult) {
  const elements = new Map([...read("motion-lab/index.html").matchAll(/id="([^"]+)"/g)].map(match => [match[1], { disabled:true, value:"", replaceChildren(){}, append(){}, addEventListener(){} }]));
  elements.delete("stages");
  let plays = 0;
  const session = { state:"running", async start(){ return {status:"ready"}; },
    async loadAvatar(profile){ return {status:"ready",diagnostics:{avatarProfileId:profile.avatarId,boneCount:65,skinnedMeshCount:1}}; },
    async loadIndependentRetargetedMotion(){ return loadResult; }, unloadMotion(){ return {status:"ready"}; },
    playbackDiagnostics(){ return {state:loadResult.status === "ready" ? "ready" : "unloaded"}; },
    play(){ plays++; return {status:"playing"}; }, pause(){return {status:"paused"};}, resume(){return {status:"playing"};}, stop(){return {status:"stopped"};}, restart(){return {status:"playing"};}, setLoop(){}, unloadAvatar(){}, dispose(){} };
  const document = { getElementById:id => elements.get(id), querySelectorAll:()=>[], addEventListener(){}, removeEventListener(){} };
  const env = { document, addEventListener(){}, removeEventListener(){}, performance, navigator:{}, PocketPTThrillerMotionCatalog:catalog,
    PocketPTAvatarProfiles:require("../public/motion/avatar-profiles"), PocketPTDisposableMotionSession:{createMotionSession(){return session;}} };
  vm.runInNewContext(read("motion-lab/motion-lab-runtime.js"), env);
  env.MotionLabRuntime.mount({replaceChildren(){}}); env.MotionLabRuntime.initialize();
  return {lab:env.MotionLabRuntime,elements,get plays(){return plays;}};
}

test("Thriller selection requires personalized avatar, does not autoplay, and leaves Play disabled on missing GLB", async () => {
  const missing = {status:"failed",code:"THRILLER_BROWSER_ASSET_REQUIRED",diagnostics:{firstFailingBoundary:"asset availability",unboundTracks:[]}};
  const h = runtimeHarness(missing);
  assert.equal(h.elements.get("thrillerMotion").disabled, true);
  let out = await h.lab.selectThrillerMotion("thriller-part-1");
  assert.equal(out.code, "avatar_required");
  await h.lab.loadAvatar(require("../public/motion/avatar-profiles").profiles.personalized);
  assert.equal(h.elements.get("thrillerMotion").disabled, false);
  out = await h.lab.selectThrillerMotion("thriller-part-1");
  assert.equal(out.code, "THRILLER_BROWSER_ASSET_REQUIRED");
  assert.equal(h.plays, 0);
  assert.equal(h.elements.get("playAnimation").disabled, true);
  assert.equal(h.lab.snapshot().motion.runtimeAsset, "/motion/assets/thriller/runtime/Thriller Part 1.glb");
});

test("Play becomes available only for a fully bound Thriller clip and existing native controls remain present", async () => {
  const ready = {status:"ready",diagnostics:{firstFailingBoundary:"NONE",clipName:"Thriller Part 2",clipDuration:12,trackCount:3,intendedTrackCount:3,boundTrackCount:3,unboundTrackCount:0,unboundTracks:[]}};
  const h = runtimeHarness(ready);
  await h.lab.loadAvatar(require("../public/motion/avatar-profiles").profiles.personalized);
  await h.lab.selectThrillerMotion("thriller-part-2");
  assert.equal(h.plays, 0);
  assert.equal(h.elements.get("playAnimation").disabled, false);
  for (const id of ["playAnimation","pauseAnimation","resumeAnimation","stopAnimation","restartAnimation","loopAnimation","loadNativeAnimation","loadExtractedAnimation"]) assert.ok(h.elements.has(id));
});

test("independent motion loader fails closed for incompatible skeleton and unbound intended tracks", async () => {
  const session = sessionRuntime.createMotionSession();
  session.avatar = { traverse(visitor){ visitor({name:"Hips",quaternion:{}}); } };
  session.mixer = { clipAction(){ throw new Error("must not bind"); } };
  session.avatarProfile = {avatarId:"avaturn-personalized-candidate",skeletonProfile:"wrong-profile"};
  let out = await session.loadIndependentRetargetedMotion(catalog.parts[0]);
  assert.equal(out.code, "RETARGET REQUIRED"); assert.equal(out.diagnostics.firstFailingBoundary, "retarget compatibility");
  session.avatarProfile.skeletonProfile = "avaturn-native-v1";
  session.THREE = {PropertyBinding:{parseTrackName(name){return {nodeName:name.split(".")[0],propertyName:"quaternion"};},findNode(){return null;}}};
  session.loadAsset = async () => ({scene:{traverse(){}},animations:[{name:"clip",duration:1,tracks:[{name:"Missing.quaternion"}]}]});
  session.disposeObjectResources = () => ({});
  out = await session.loadIndependentRetargetedMotion(catalog.parts[0]);
  assert.equal(out.code, "animation_binding_failed"); assert.equal(out.diagnostics.intendedTrackCount, 1); assert.equal(out.diagnostics.boundTrackCount, 0); assert.deepEqual(out.diagnostics.unboundTracks, ["Missing.quaternion"]);
  session.dispose();
});

test("shared browser loader boundary is GLTF-only and never claims direct FBX support", () => {
  const loader = read("public/motion/shared3d-loader.js");
  assert.match(loader, /GLTFLoader/); assert.doesNotMatch(loader, /FBXLoader/);
});
