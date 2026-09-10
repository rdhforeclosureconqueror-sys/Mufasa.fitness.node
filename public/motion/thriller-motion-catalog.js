(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTThrillerMotionCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SOURCE_PROFILE = "mixamo-v1";
  const TARGET_PROFILE = "avaturn-native-v1";
  const RETARGET_PROFILE = "mixamo-to-avaturn-offline-v1";
  const parts = Object.freeze([1, 2, 3, 4].map(number => Object.freeze({
    id: `thriller-part-${number}`,
    displayName: `Thriller Part ${number}`,
    sourceFbxPath: `/motion/assets/thriller/Thriller Part ${number}.fbx`,
    runtimeAssetPath: `/motion/assets/thriller/runtime/Thriller Part ${number}.glb`,
    runtimeFormat: "GLB",
    sourceSkeletonProfile: SOURCE_PROFILE,
    targetAvatarProfile: "avaturn-personalized-candidate",
    targetSkeletonProfile: TARGET_PROFILE,
    retargetProfile: RETARGET_PROFILE,
    bindingMode: "OFFLINE RETARGETED / REVIEW REQUIRED"
  })));

  function get(id) { return parts.find(part => part.id === id) || null; }
  return Object.freeze({ parts, get, SOURCE_PROFILE, TARGET_PROFILE, RETARGET_PROFILE });
});
