(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTAvatarProfiles = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const profiles = Object.freeze({
    reference: Object.freeze({ avatarId: "phase-e-reference", displayName: "Phase E Reference Avatar", source: "phase-e-canonical", assetUrl: "/motion/assets/phase-e/canonical-avatar.glb", skeletonProfile: "mixamo-phase-e", status: "reference-fallback", developmentOnly: true }),
    personalized: Object.freeze({ avatarId: "avaturn-personalized-candidate", displayName: "Personalized Avaturn Avatar", source: "exercise-generation/source-assets/avaturn/avaturn-push-up-source.glb", assetUrl: "/dev/motion-lab-avatar-assets/avaturn-push-up-source.glb", skeletonProfile: "avaturn-native-v1", status: "candidate-after-normalization", developmentOnly: true })
  });
  function get(avatarId) { return Object.values(profiles).find(profile => profile.avatarId === avatarId) || null; }
  return Object.freeze({ profiles, get });
});
