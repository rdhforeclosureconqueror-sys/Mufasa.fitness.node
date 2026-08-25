"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { parseGlb, encodeGlb } = require("../glb-utils");
const { loadManifest, resolveRepoPath, ROOT } = require("./motion-manifest");
const { checksumFile, sha256 } = require("./checksum-manifest");

function inventory(input) {
  const data = Buffer.isBuffer(input) ? input : fs.readFileSync(input), { json } = parseGlb(data), animation = json.animations?.[0];
  const channels = animation?.channels || [], duration = Math.max(0, ...(animation?.samplers || []).map(s => json.accessors?.[s.input]?.max?.[0] || 0));
  return { size: data.length, sha256: sha256(data), animationCount: json.animations?.length || 0, clip: animation?.name, duration,
    tracks: channels.length, targets: new Set(channels.map(c => c.target.node)).size, nodes: json.nodes?.length || 0, meshes: json.meshes?.length || 0,
    skins: json.skins?.length || 0, materials: json.materials?.length || 0, textures: json.textures?.length || 0, images: json.images?.length || 0,
    morphTracks: channels.filter(c => c.target.path === "weights").length };
}
function registryRecords(registryData) {
  if (registryData) return registryData;
  const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, `public/motion/registry/${name}.json`), "utf8"));
  return { fixtures: read("fixtures"), motions: read("motions"), avatars: read("avatar-profiles"), skeletons: read("skeleton-profiles") };
}
function checkRegistry(manifest, registryData) {
  const records = registryRecords(registryData), fixture = records.fixtures.records.find(x => x.fixtureId === manifest.output.fixtureId);
  const motion = records.motions.records.find(x => x.motionId === manifest.output.motionId), skeleton = records.skeletons.records.find(x => x.skeletonProfileId === manifest.output.skeletonProfileId);
  assert.ok(fixture, "registry fixture is missing"); assert.ok(motion, "registry motion is missing"); assert.ok(skeleton, "registry skeleton profile is missing");
  assert.equal(fixture.motionId, manifest.output.motionId, "registry motion relationship");
  assert.equal(fixture.skeletonProfileId, manifest.output.skeletonProfileId, "registry skeleton relationship");
  assert.equal(motion.fixtureIdsBySkeletonProfile[manifest.output.skeletonProfileId], manifest.output.fixtureId, "registry fixture relationship");
  assert.deepEqual(fixture.compatibleAvatarProfileIds, manifest.output.compatibleAvatarProfileIds, "registry compatible avatars");
  for (const id of manifest.output.compatibleAvatarProfileIds) { const avatar = records.avatars.records.find(x => x.avatarProfileId === id); assert.ok(avatar, `registry avatar ${id}`); assert.equal(avatar.skeletonProfileId, manifest.output.skeletonProfileId, "registry avatar skeleton"); }
  assert.equal(fixture.clipName, manifest.output.outputClipName, "registry clip"); assert.equal(fixture.duration, manifest.structuralExpectations.duration, "registry duration");
  assert.equal(fixture.expectedTrackCount, manifest.structuralExpectations.trackCount, "registry track count"); assert.equal(fixture.expectedBoundTrackCount, manifest.structuralExpectations.trackCount, "registry bound tracks"); assert.equal(fixture.expectedUnboundTrackCount, 0, "registry unbound tracks");
  assert.equal(fixture.sha256, manifest.output.sha256, "registry output SHA-256"); assert.equal(fixture.fileSizeBytes, manifest.output.bytes, "registry output bytes");
  const structural = { animations: "animationCount", nodes: "nodeCount", meshes: "meshCount", skins: "skinCount" };
  for (const [registryKey, manifestKey] of Object.entries(structural)) assert.equal(fixture.structuralExpectations[registryKey], manifest.structuralExpectations[manifestKey], `registry ${registryKey}`);
  return { fixture, motion, skeleton };
}
function createFixture(manifest, sourceData) {
  const { json, binary } = parseGlb(sourceData), sourceAnimation = json.animations?.find(a => a.name === manifest.animationSelection.sourceClipName);
  if (!sourceAnimation) throw new Error(`missing declared source animation: ${manifest.animationSelection.sourceClipName}`);
  const channels = sourceAnimation.channels.filter(c => c.target.path !== "weights");
  if (channels.some(c => !["translation", "rotation", "scale"].includes(c.target.path))) throw new Error("channel policy found a non-skeletal transform track");
  if (channels.length !== manifest.structuralExpectations.trackCount) throw new Error(`expected ${manifest.structuralExpectations.trackCount} skeletal tracks, found ${channels.length}`);
  const requiredNodes = new Set(channels.map(c => c.target.node)), parents = new Map();
  json.nodes.forEach((node, index) => (node.children || []).forEach(child => parents.set(child, index)));
  for (const node of [...requiredNodes]) for (let parent = parents.get(node); parent !== undefined; parent = parents.get(parent)) requiredNodes.add(parent);
  const oldNodes = [...requiredNodes].sort((a, b) => a - b), nodeMap = new Map(oldNodes.map((old, index) => [old, index]));
  const nodes = oldNodes.map(old => { const sourceNode = json.nodes[old], node = {}; for (const key of ["name", "translation", "rotation", "scale", "matrix"]) if (sourceNode[key] !== undefined) node[key] = sourceNode[key]; const children = (sourceNode.children || []).filter(x => nodeMap.has(x)).map(x => nodeMap.get(x)); if (children.length) node.children = children; return node; });
  const accessors = [], bufferViews = [], chunks = [], accessorMap = new Map(); let byteOffset = 0;
  function copyAccessor(oldIndex) { if (accessorMap.has(oldIndex)) return accessorMap.get(oldIndex); const a = json.accessors[oldIndex], v = json.bufferViews[a.bufferView]; if (a.sparse || a.byteOffset || v.byteStride) throw new Error("unsupported non-contiguous animation accessor"); const bytes = binary.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength), viewIndex = bufferViews.length, accessorIndex = accessors.length; bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length }); chunks.push(bytes); byteOffset += bytes.length; const copy = { bufferView: viewIndex, componentType: a.componentType, count: a.count, type: a.type }; for (const key of ["min", "max", "normalized"]) if (a[key] !== undefined) copy[key] = a[key]; accessors.push(copy); accessorMap.set(oldIndex, accessorIndex); return accessorIndex; }
  const samplers = [], outputChannels = [];
  for (const channel of channels) { const s = sourceAnimation.samplers[channel.sampler], sampler = { input: copyAccessor(s.input), output: copyAccessor(s.output) }; if (s.interpolation) sampler.interpolation = s.interpolation; const samplerIndex = samplers.length; samplers.push(sampler); outputChannels.push({ sampler: samplerIndex, target: { node: nodeMap.get(channel.target.node), path: channel.target.path } }); }
  const outputJson = { asset: { version: "2.0", generator: manifest.output.generator }, scene: 0, scenes: [{ name: manifest.output.sceneName, nodes: oldNodes.filter(old => !parents.has(old) || !requiredNodes.has(parents.get(old))).map(old => nodeMap.get(old)) }], nodes, animations: [{ name: manifest.output.outputClipName, samplers, channels: outputChannels }], accessors, bufferViews, buffers: [{ byteLength: byteOffset }] };
  return encodeGlb(outputJson, Buffer.concat(chunks));
}
function provenanceReport(manifest, source, output, validationStatus = "passed") { return { schemaVersion: 1, generatorVersion: 1, sourceId: manifest.source.sourceId, source: manifest.source.path, sourceSha256: source.sha256, sourceBytes: source.bytes, sourceClip: manifest.animationSelection.sourceClipName, licenseStatus: manifest.source.licenseStatus, licenseReference: manifest.source.licenseReference, selectedIntervalSeconds: { start: manifest.clipPolicy.start, end: manifest.clipPolicy.end, mode: manifest.clipPolicy.mode }, channelPolicy: manifest.channelPolicy, rootMotionPolicy: manifest.rootMotionPolicy, reductionPolicy: manifest.reductionPolicy, compressionPolicy: manifest.compressionPolicy, fixtureId: manifest.output.fixtureId, motionId: manifest.output.motionId, skeletonProfile: manifest.output.skeletonProfileId, compatibleAvatarProfileIds: manifest.output.compatibleAvatarProfileIds, outputClip: manifest.output.outputClipName, outputSha256: output.sha256, outputBytes: output.bytes, validationStatus, humanVisualStatus: manifest.provenance?.humanVisualStatus, knownDefectNotAddressed: manifest.provenance?.knownDefectNotAddressed };
}
function build(manifestFile, options = {}) { const { manifest } = loadManifest(manifestFile); checkRegistry(manifest, options.registryData); const sourcePath = resolveRepoPath(manifest.source.path); if (!fs.existsSync(sourcePath)) throw new Error(`motion source does not exist: ${manifest.source.path}`); const source = checksumFile(sourcePath); if (source.sha256 !== manifest.source.sha256) throw new Error("source SHA-256 does not match manifest"); const data = createFixture(manifest, source.data), output = { sha256: sha256(data), bytes: data.length }; if (output.sha256 !== manifest.output.sha256) throw new Error(`output SHA-256 mismatch: ${output.sha256}`); if (output.bytes !== manifest.output.bytes) throw new Error(`output byte size mismatch: ${output.bytes}`); const outputPath = options.outputPath ? path.resolve(options.outputPath) : resolveRepoPath(manifest.output.outputPath); fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, data); const report = provenanceReport(manifest, source, output); if (options.writeProvenance !== false) { const reportPath = options.reportPath ? path.resolve(options.reportPath) : resolveRepoPath(manifest.output.provenancePath); fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n"); } return { ...output, sourceSha256: source.sha256, sourceBytes: source.bytes, outputPath, report };
}
function validate(manifestFile, fixtureFile, options = {}) { const { manifest } = loadManifest(manifestFile); checkRegistry(manifest, options.registryData); const source = checksumFile(resolveRepoPath(manifest.source.path)); assert.equal(source.sha256, manifest.source.sha256, "source SHA-256"); const file = fixtureFile ? path.resolve(fixtureFile) : resolveRepoPath(manifest.output.outputPath), result = inventory(file), e = manifest.structuralExpectations; assert.equal(result.sha256, manifest.output.sha256, "output SHA-256"); assert.equal(result.size, manifest.output.bytes, "output bytes"); assert.equal(result.animationCount, e.animationCount, "animation count"); assert.equal(result.clip, manifest.output.outputClipName, "clip name"); assert.ok(Math.abs(result.duration - e.duration) < 1e-6, `duration ${result.duration}`); for (const [actual, expected] of [["tracks","trackCount"],["targets","targetCount"],["nodes","nodeCount"],["meshes","meshCount"],["skins","skinCount"],["materials","materialCount"],["textures","textureCount"],["images","imageCount"],["morphTracks","morphTrackCount"]]) assert.equal(result[actual], e[expected], actual);
  if (options.validateProvenance !== false) { const provenance = JSON.parse(fs.readFileSync(options.provenancePath ? path.resolve(options.provenancePath) : resolveRepoPath(manifest.output.provenancePath), "utf8")); const pairs = [["sourceId",manifest.source.sourceId],["source",manifest.source.path],["sourceSha256",manifest.source.sha256],["sourceClip",manifest.animationSelection.sourceClipName],["fixtureId",manifest.output.fixtureId],["motionId",manifest.output.motionId],["skeletonProfile",manifest.output.skeletonProfileId],["outputClip",manifest.output.outputClipName],["outputSha256",manifest.output.sha256],["outputBytes",manifest.output.bytes],["validationStatus","passed"]]; for (const [key, expected] of pairs) assert.deepEqual(provenance[key], expected, `provenance ${key}`); assert.deepEqual(provenance.compatibleAvatarProfileIds, manifest.output.compatibleAvatarProfileIds, "provenance compatible avatars"); }
  return result; }
module.exports = { inventory, checkRegistry, createFixture, provenanceReport, build, validate };
