"use strict";
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
module.exports = Object.freeze({
  source: path.join(ROOT, "exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb"),
  output: path.join(ROOT, "public/motion/assets/exercises/push-up/avaturn-push-up-animation.glb"),
  provenance: path.join(ROOT, "public/motion/assets/exercises/push-up/avaturn-push-up-animation.provenance.json"),
  sourceSha256: "ec21fb1b5ba8499f2e410b49272e2b7f30e09257cd737c9efe25c0cd3d21adb6",
  sourceClip: "avaturn_animation", clipName: "avaturn_push_up_native_v1",
  interval: Object.freeze({ start: 0, end: 1.5333333015441895 }),
  motionId: "push_up/avaturn_native_v1", fixtureId: "avaturn-push-up-animation",
  skeletonProfile: "avaturn-native-v1", avatarProfile: "avaturn-personalized-candidate",
  expected: Object.freeze({ tracks: 40, targets: 39, nodes: 40, meshes: 0, skins: 0, materials: 0, textures: 0, images: 0, morphTracks: 0 })
});
