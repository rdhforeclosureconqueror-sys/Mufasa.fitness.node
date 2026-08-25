"use strict";
// Compatibility projection only. The declarative source manifest is authoritative.
const { MANIFEST, loadManifest, resolveRepoPath } = require("./lib/motion-manifest");
const manifest = loadManifest(MANIFEST).manifest, e = manifest.structuralExpectations;
module.exports = Object.freeze({ manifest: MANIFEST, source: resolveRepoPath(manifest.source.path), output: resolveRepoPath(manifest.output.outputPath), provenance: resolveRepoPath(manifest.output.provenancePath),
  sourceSha256: manifest.source.sha256, sourceClip: manifest.animationSelection.sourceClipName, clipName: manifest.output.outputClipName,
  interval: Object.freeze({ start: manifest.clipPolicy.start, end: manifest.clipPolicy.end }), motionId: manifest.output.motionId, fixtureId: manifest.output.fixtureId,
  skeletonProfile: manifest.output.skeletonProfileId, avatarProfile: manifest.output.compatibleAvatarProfileIds[0],
  expected: Object.freeze({ tracks: e.trackCount, targets: e.targetCount, nodes: e.nodeCount, meshes: e.meshCount, skins: e.skinCount, materials: e.materialCount, textures: e.textureCount, images: e.imageCount, morphTracks: e.morphTrackCount }) });
