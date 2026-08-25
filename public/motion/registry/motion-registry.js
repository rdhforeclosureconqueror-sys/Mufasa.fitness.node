(function (root, factory) {
  const data = typeof module === "object" && module.exports
    ? { exerciseIndex: require("./exercise-motion-index.json"), motions: require("./motions.json"), fixtures: require("./fixtures.json"), avatars: require("./avatar-profiles.json"), skeletons: require("./skeleton-profiles.json") }
    : {"exerciseIndex":{"schemaVersion":1,"records":[{"exerciseId":"push-up","preferredMotionId":"push_up/avaturn_native_v1","avatarProfileId":"avaturn-personalized-candidate","cameraPreset":"exercise-side","loop":true,"status":"active","audience":"product"},{"exerciseId":"phase-e-dance-development","preferredMotionId":"phase_e/dance_fixture_v1","avatarProfileId":"phase-e-reference","cameraPreset":"three-quarter","loop":true,"status":"development","audience":"development"}]},"motions":{"schemaVersion":1,"records":[{"motionId":"push_up/avaturn_native_v1","exerciseId":"push-up","displayName":"Push-Up","version":1,"provenanceReference":"/motion/assets/exercises/push-up/avaturn-push-up-animation.provenance.json","loopPolicy":"loop","trimPolicy":"source-interval-0-to-1.5333333015441895","rootMotionPolicy":"preserve","reductionPolicy":"none","compressionPolicy":"source","fixtureIdsBySkeletonProfile":{"avaturn-native-v1":"avaturn-push-up-animation"},"status":"active","audience":"product"},{"motionId":"phase_e/dance_fixture_v1","exerciseId":"phase-e-dance-development","displayName":"Phase E Dance Fixture","version":1,"provenanceReference":"/motion/phase-e-assets.js","loopPolicy":"loop","trimPolicy":"none","rootMotionPolicy":"preserve","reductionPolicy":"none","compressionPolicy":"source","fixtureIdsBySkeletonProfile":{"mixamo-phase-e":"phase-e-animation-fixture"},"status":"development","audience":"development"}]},"fixtures":{"schemaVersion":1,"records":[{"fixtureId":"avaturn-push-up-animation","motionId":"push_up/avaturn_native_v1","skeletonProfileId":"avaturn-native-v1","compatibleAvatarProfileIds":["avaturn-personalized-candidate"],"assetUrl":"/motion/assets/exercises/push-up/avaturn-push-up-animation.glb","clipName":"avaturn_push_up_native_v1","duration":1.5333333015441895,"expectedTrackCount":40,"expectedBoundTrackCount":40,"expectedUnboundTrackCount":0,"structuralExpectations":{"nodes":40,"meshes":0,"skins":0,"animations":1},"provenanceReference":"/motion/assets/exercises/push-up/avaturn-push-up-animation.provenance.json","sha256":"046034dd86350c4962ede767c2483e6c68d87b8115ccda5a9e26d4483615205f","fileSizeBytes":52232,"status":"active","audience":"product","developmentOnly":true},{"fixtureId":"phase-e-animation-fixture","motionId":"phase_e/dance_fixture_v1","skeletonProfileId":"mixamo-phase-e","compatibleAvatarProfileIds":["phase-e-reference"],"assetUrl":"/motion/assets/phase-e/animation-fixture.glb","clipName":"Armature|mixamo.com|Layer0","expectedTrackCount":195,"expectedBoundTrackCount":195,"expectedUnboundTrackCount":0,"structuralExpectations":{"nodes":66,"meshes":0,"skins":1,"animations":1},"provenanceReference":"/motion/phase-e-assets.js","sha256":"f090478822f71cdbc850ce0cf88c3c778a35ac670c928ac90418667a6ab8dc06","fileSizeBytes":186532,"status":"development","audience":"development","developmentOnly":true}]},"avatars":{"schemaVersion":1,"records":[{"avatarProfileId":"avaturn-personalized-candidate","displayName":"Push-Up Challenge Avatar","skeletonProfileId":"avaturn-native-v1","assetUrl":"/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb","assetResolver":"authenticated-product-backend","sourceAssetReference":"exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb","sourceSha256":"ec21fb1b5ba8499f2e410b49272e2b7f30e09257cd737c9efe25c0cd3d21adb6","runtimeAudience":"product","productEligible":true,"status":"active","licenseStatus":"not-cleared","licenseReference":"not-present-in-repository","expectedSkeletonRoot":"Hips","expectedJointCount":54,"developmentOnly":true},{"avatarProfileId":"phase-e-reference","displayName":"Phase E Reference Avatar","skeletonProfileId":"mixamo-phase-e","assetUrl":"/motion/assets/phase-e/canonical-avatar.glb","assetResolver":"public-static","sourceAssetReference":"public/motion/assets/phase-e/canonical-avatar.glb","runtimeAudience":"development","productEligible":false,"status":"development","licenseStatus":"development-test-only","licenseReference":"/motion/phase-e-assets.js","expectedSkeletonRoot":"mixamorigHips","expectedJointCount":65,"developmentOnly":true}]},"skeletons":{"schemaVersion":1,"records":[{"skeletonProfileId":"avaturn-native-v1","rootJoint":"Hips","jointCount":54,"requiredAnimationTargets":["Hips","LeftUpLeg","LeftLeg","LeftFoot","Spine","Spine1","Spine2","LeftShoulder","LeftArm","LeftForeArm","LeftHand","LeftHandRing1","LeftHandRing2","LeftHandThumb1","LeftHandThumb2","LeftHandPinky1","LeftHandPinky2","LeftHandMiddle1","LeftHandMiddle2","LeftHandIndex1","LeftHandIndex2","Neck","RightShoulder","RightArm","RightForeArm","RightHand","RightHandThumb1","RightHandThumb2","RightHandMiddle1","RightHandMiddle2","RightHandRing1","RightHandRing2","RightHandIndex1","RightHandIndex2","RightHandPinky1","RightHandPinky2","RightUpLeg","RightLeg","RightFoot"],"units":"meters","upAxis":"+Y","forwardAxis":"unknown","compatibilityStatus":"native-validated","status":"active","audience":"product"},{"skeletonProfileId":"mixamo-phase-e","rootJoint":"mixamorigHips","jointCount":65,"requiredAnimationTargets":[],"units":"unknown","upAxis":"unknown","forwardAxis":"unknown","compatibilityStatus":"development-fixture-only","status":"development","audience":"development"}]}};
  const api = factory(data);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (initialData) {
  "use strict";
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
  function validateRegistry(input) {
    const errors = [];
    const sets = {};
    const groups = [["exercise", input.exerciseIndex, "exerciseId"], ["motion", input.motions, "motionId"], ["fixture", input.fixtures, "fixtureId"], ["avatar", input.avatars, "avatarProfileId"], ["skeleton", input.skeletons, "skeletonProfileId"]];
    for (const [name, group, key] of groups) {
      if (group?.schemaVersion !== 1 || !Array.isArray(group.records)) { errors.push(name + ": invalid envelope"); continue; }
      sets[name] = new Set();
      for (const record of group.records) {
        if (!record || typeof record[key] !== "string" || !record[key]) errors.push(name + ": missing " + key);
        else if (sets[name].has(record[key])) errors.push(name + ": duplicate " + record[key]);
        else sets[name].add(record[key]);
      }
    }
    if (errors.length) return Object.freeze({ valid: false, errors: Object.freeze(errors) });
    for (const exercise of input.exerciseIndex.records) {
      const motion = input.motions.records.find(item => item.motionId === exercise.preferredMotionId);
      if (!motion || motion.exerciseId !== exercise.exerciseId) errors.push("exercise motion reference: " + exercise.exerciseId);
      if (!sets.avatar.has(exercise.avatarProfileId)) errors.push("exercise avatar reference: " + exercise.exerciseId);
    }
    for (const motion of input.motions.records) {
      if (!sets.exercise.has(motion.exerciseId)) errors.push("motion exercise reference: " + motion.motionId);
      for (const [skeletonId, fixtureId] of Object.entries(motion.fixtureIdsBySkeletonProfile || {})) {
        const fixture = input.fixtures.records.find(item => item.fixtureId === fixtureId);
        if (!fixture || fixture.motionId !== motion.motionId || fixture.skeletonProfileId !== skeletonId) errors.push("motion fixture reference: " + motion.motionId);
      }
    }
    for (const avatar of input.avatars.records) if (!sets.skeleton.has(avatar.skeletonProfileId)) errors.push("avatar skeleton reference: " + avatar.avatarProfileId);
    for (const fixture of input.fixtures.records) {
      if (!sets.motion.has(fixture.motionId) || !sets.skeleton.has(fixture.skeletonProfileId)) errors.push("fixture reference: " + fixture.fixtureId);
      if (!Array.isArray(fixture.compatibleAvatarProfileIds) || fixture.compatibleAvatarProfileIds.some(id => !sets.avatar.has(id))) errors.push("fixture avatar reference: " + fixture.fixtureId);
      if (!Number.isInteger(fixture.expectedTrackCount) || fixture.expectedTrackCount !== fixture.expectedBoundTrackCount + fixture.expectedUnboundTrackCount) errors.push("fixture track contract: " + fixture.fixtureId);
      if (!/^\/motion\/assets\/.+\.glb$/.test(fixture.assetUrl || "") || !/^[a-f0-9]{64}$/.test(fixture.sha256 || "") || !Number.isInteger(fixture.fileSizeBytes) || fixture.fileSizeBytes < 1) errors.push("fixture asset metadata: " + fixture.fixtureId);
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }
  const validation = validateRegistry(initialData);
  if (!validation.valid) fail("invalid_registry", validation.errors.join("; "));
  const find = (group, key, id, code) => { const record = initialData[group].records.find(item => item[key] === id); if (!record) fail(code, "Unknown registry ID: " + id); return clone(record); };
  function resolveExercise(id) { return find("exerciseIndex", "exerciseId", id, "unknown_exercise"); }
  function resolveDefaultExercise() { const records=initialData.exerciseIndex.records.filter(item => item.audience === "product" && item.status === "active"); if (records.length !== 1) fail("ambiguous_default_exercise", "Registry must have exactly one active product exercise"); return Object.freeze(clone(records[0])); }
  function resolveMotion(id) { return find("motions", "motionId", id, "unknown_motion"); }
  function resolveAvatarProfile(id) { const r=find("avatars", "avatarProfileId", id, "unknown_avatar_profile"); return Object.freeze({...r, avatarId:r.avatarProfileId, skeletonProfile:r.skeletonProfileId, source:r.sourceAssetReference}); }
  function resolveSkeletonProfile(id) { return Object.freeze(find("skeletons", "skeletonProfileId", id, "unknown_skeleton_profile")); }
  function resolveFixture({ motionId, skeletonProfileId, avatarProfileId, fixtureId } = {}) {
    const motion = resolveMotion(motionId);
    const selectedId = motion.fixtureIdsBySkeletonProfile?.[skeletonProfileId];
    if (!selectedId || (fixtureId && fixtureId !== selectedId)) fail("unknown_fixture", "No fixture for the requested motion and skeleton");
    const r = find("fixtures", "fixtureId", selectedId, "unknown_fixture");
    if (r.motionId !== motionId || r.skeletonProfileId !== skeletonProfileId) fail("skeleton_mismatch", "Fixture skeleton mismatch");
    if (!r.compatibleAvatarProfileIds.includes(avatarProfileId)) fail("incompatible_pairing", "Avatar profile is incompatible with fixture");
    return Object.freeze({...r, skeletonProfile:r.skeletonProfileId, compatibleAvatarProfile:r.compatibleAvatarProfileIds.length === 1 ? r.compatibleAvatarProfileIds[0] : null});
  }
  function resolveExerciseMotion(exerciseId, avatarProfileId) {
    const exercise=resolveExercise(exerciseId), avatar=resolveAvatarProfile(avatarProfileId || exercise.avatarProfileId), motion=resolveMotion(exercise.preferredMotionId), skeleton=resolveSkeletonProfile(avatar.skeletonProfileId), fixture=resolveFixture({motionId:motion.motionId,skeletonProfileId:skeleton.skeletonProfileId,avatarProfileId:avatar.avatarProfileId});
    return Object.freeze({ exercise:Object.freeze(exercise), motion:Object.freeze(motion), fixture, avatar, skeleton });
  }
  return Object.freeze({ resolveExercise, resolveDefaultExercise, resolveMotion, resolveFixture, resolveAvatarProfile, resolveSkeletonProfile, resolveExerciseMotion, validateRegistry, validation, _data: clone(initialData) });
});
