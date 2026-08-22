(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTAvaturnPushUpFixture = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const fixture = Object.freeze({ fixtureId: "avaturn-push-up-animation", motionId: "push_up/avaturn_native_v1",
    assetUrl: "/dev/motion-lab-avatar-assets/avaturn-push-up-animation.glb", clipName: "avaturn_push_up_native_v1",
    skeletonProfile: "avaturn-native-v1", compatibleAvatarProfile: "avaturn-personalized-candidate", developmentOnly: true });
  function compatibility(avatarProfileId) { return avatarProfileId === fixture.compatibleAvatarProfile ? "NATIVE" : "RETARGET REQUIRED"; }
  return Object.freeze({ fixture, compatibility });
});
