(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTPhaseEAssets = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const manifest = {
    schemaVersion: 1,
    phase: "E",
    availability: "optional-development-fixture",
    licenseStatus: "development-test-only",
    canonicalAvatar: { id: "canonical-avatar", path: "/motion/assets/phase-e/canonical-avatar.glb", requires: { mesh: true, skin: true, skeleton: true, animations: 0 } },
    animationFixture: { id: "animation-fixture", path: "/motion/assets/phase-e/animation-fixture.glb", requires: { mesh: false, skin: false, skeleton: false, animations: 1 } }
  };
  return Object.freeze({ manifest: Object.freeze(manifest), paths: Object.freeze({ avatar: manifest.canonicalAvatar.path, animation: manifest.animationFixture.path }) });
});
