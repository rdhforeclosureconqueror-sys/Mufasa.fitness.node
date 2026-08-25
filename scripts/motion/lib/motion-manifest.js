"use strict";
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../../..");
const MANIFEST = path.join(ROOT, "motion-sources/avaturn-push-up.source.json");
function fail(message) { throw new Error(`invalid motion source manifest: ${message}`); }
function validateManifest(value) {
  if (!value || value.schemaVersion !== 1) fail("schemaVersion must be 1");
  for (const group of ["source", "animationSelection", "output", "clipPolicy", "channelPolicy", "rootMotionPolicy", "reductionPolicy", "compressionPolicy", "structuralExpectations"]) if (!value[group] || typeof value[group] !== "object") fail(`${group} is required`);
  for (const key of ["sourceId", "path", "sha256", "format", "licenseStatus", "licenseReference", "audience", "status"]) if (typeof value.source[key] !== "string" || !value.source[key]) fail(`source.${key} is required`);
  if (value.source.format !== "glb") fail("only source format glb is supported");
  if (!/^[a-f0-9]{64}$/.test(value.source.sha256)) fail("source.sha256 must be lowercase SHA-256");
  if (typeof value.animationSelection.sourceClipName !== "string" || !value.animationSelection.sourceClipName) fail("animationSelection.sourceClipName is required");
  for (const key of ["fixtureId", "motionId", "skeletonProfileId", "outputPath", "provenancePath", "outputClipName", "generator", "sceneName"]) if (typeof value.output[key] !== "string" || !value.output[key]) fail(`output.${key} is required`);
  if (!Array.isArray(value.output.compatibleAvatarProfileIds) || !value.output.compatibleAvatarProfileIds.length) fail("output.compatibleAvatarProfileIds is required");
  if (!/^[a-f0-9]{64}$/.test(value.output.sha256) || !Number.isInteger(value.output.bytes)) fail("output checksum metadata is required");
  if (value.channelPolicy.include !== "skeletal-transform-tracks" || !Array.isArray(value.channelPolicy.exclude) || !value.channelPolicy.exclude.includes("weights") || value.channelPolicy.preserveStaticSkeletalTracks !== true) fail("unsupported channel policy");
  if (value.rootMotionPolicy.mode !== "preserve") fail(`unsupported root motion policy: ${value.rootMotionPolicy.mode}`);
  if (value.clipPolicy.mode !== "preserve-existing-complete-clip") fail(`unsupported clip policy: ${value.clipPolicy.mode}`);
  if (value.clipPolicy.start !== 0 || !Number.isFinite(value.clipPolicy.end)) fail("preserve clip policy requires start 0 and a finite end");
  if (value.reductionPolicy.mode !== "none") fail(`unsupported reduction policy: ${value.reductionPolicy.mode}`);
  if (value.compressionPolicy.mode !== "none") fail(`unsupported compression policy: ${value.compressionPolicy.mode}`);
  for (const key of ["animationCount", "trackCount", "targetCount", "nodeCount", "meshCount", "skinCount", "materialCount", "textureCount", "imageCount", "morphTrackCount", "duration"]) if (!Number.isFinite(value.structuralExpectations[key])) fail(`structuralExpectations.${key} is required`);
  return value;
}
function loadManifest(file = MANIFEST) { const manifestPath = path.resolve(file); return { manifest: validateManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8"))), manifestPath }; }
function resolveRepoPath(relative) { const result = path.resolve(ROOT, relative); if (result !== ROOT && !result.startsWith(ROOT + path.sep)) fail(`path escapes repository: ${relative}`); return result; }
module.exports = { ROOT, MANIFEST, loadManifest, validateManifest, resolveRepoPath };
