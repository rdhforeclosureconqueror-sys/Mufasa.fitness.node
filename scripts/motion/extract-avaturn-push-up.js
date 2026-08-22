#!/usr/bin/env node
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const contract = require("./avaturn-push-up-contract");
const { parseGlb, encodeGlb } = require("./glb-utils");
const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");

function extract() {
  const source = fs.readFileSync(contract.source);
  if (sha256(source) !== contract.sourceSha256) throw new Error("source SHA-256 does not match the approved immutable asset");
  const { json, binary } = parseGlb(source);
  const sourceAnimation = json.animations?.find(animation => animation.name === contract.sourceClip);
  if (!sourceAnimation) throw new Error(`missing source animation ${contract.sourceClip}`);
  const channels = sourceAnimation.channels.filter(channel => channel.target.path !== "weights");
  if (channels.length !== contract.expected.tracks) throw new Error(`expected ${contract.expected.tracks} skeletal tracks, found ${channels.length}`);

  const requiredNodes = new Set(channels.map(channel => channel.target.node));
  const parents = new Map();
  json.nodes.forEach((node, index) => (node.children || []).forEach(child => parents.set(child, index)));
  for (const node of [...requiredNodes]) for (let parent = parents.get(node); parent !== undefined; parent = parents.get(parent)) requiredNodes.add(parent);
  const oldNodes = [...requiredNodes].sort((a, b) => a - b), nodeMap = new Map(oldNodes.map((old, index) => [old, index]));
  const nodes = oldNodes.map(old => {
    const sourceNode = json.nodes[old], node = {};
    for (const key of ["name", "translation", "rotation", "scale", "matrix"]) if (sourceNode[key] !== undefined) node[key] = sourceNode[key];
    const children = (sourceNode.children || []).filter(child => nodeMap.has(child)).map(child => nodeMap.get(child));
    if (children.length) node.children = children;
    return node;
  });

  const accessors = [], bufferViews = [], chunks = [], accessorMap = new Map(); let byteOffset = 0;
  function copyAccessor(oldIndex) {
    if (accessorMap.has(oldIndex)) return accessorMap.get(oldIndex);
    const sourceAccessor = json.accessors[oldIndex], sourceView = json.bufferViews[sourceAccessor.bufferView];
    if (sourceAccessor.sparse || sourceAccessor.byteOffset || sourceView.byteStride) throw new Error("unsupported non-contiguous animation accessor");
    const bytes = binary.subarray(sourceView.byteOffset || 0, (sourceView.byteOffset || 0) + sourceView.byteLength);
    const viewIndex = bufferViews.length, accessorIndex = accessors.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length }); chunks.push(bytes); byteOffset += bytes.length;
    const accessor = { bufferView: viewIndex, componentType: sourceAccessor.componentType, count: sourceAccessor.count, type: sourceAccessor.type };
    for (const key of ["min", "max", "normalized"]) if (sourceAccessor[key] !== undefined) accessor[key] = sourceAccessor[key];
    accessors.push(accessor); accessorMap.set(oldIndex, accessorIndex); return accessorIndex;
  }
  const samplers = [], outputChannels = [];
  for (const channel of channels) {
    const sourceSampler = sourceAnimation.samplers[channel.sampler], sampler = { input: copyAccessor(sourceSampler.input), output: copyAccessor(sourceSampler.output) };
    if (sourceSampler.interpolation) sampler.interpolation = sourceSampler.interpolation;
    const samplerIndex = samplers.length; samplers.push(sampler);
    outputChannels.push({ sampler: samplerIndex, target: { node: nodeMap.get(channel.target.node), path: channel.target.path } });
  }
  const outputJson = { asset: { version: "2.0", generator: "PocketPT deterministic native Avaturn animation extractor" }, scene: 0,
    scenes: [{ name: "avaturn_push_up_animation_fixture", nodes: oldNodes.filter(old => !parents.has(old) || !requiredNodes.has(parents.get(old))).map(old => nodeMap.get(old)) }],
    nodes, animations: [{ name: contract.clipName, samplers, channels: outputChannels }], accessors, bufferViews, buffers: [{ byteLength: byteOffset }] };
  const output = encodeGlb(outputJson, Buffer.concat(chunks));
  fs.mkdirSync(path.dirname(contract.output), { recursive: true }); fs.writeFileSync(contract.output, output);
  const provenance = { schemaVersion: 1, fixtureId: contract.fixtureId, motionId: contract.motionId, skeletonProfile: contract.skeletonProfile,
    compatibleAvatarProfile: contract.avatarProfile, incompatibleAvatarProfiles: ["phase-e-reference"], incompatibleResult: "RETARGET REQUIRED",
    source: path.relative(path.resolve(__dirname, "../.."), contract.source).replaceAll(path.sep, "/"), sourceSha256: contract.sourceSha256,
    sourceClip: contract.sourceClip, extractedIntervalSeconds: contract.interval, outputClip: contract.clipName,
    policy: { skeletalTracks: "retain-all-including-static", morphWeightTracks: "remove", renderingContent: "exclude" },
    humanVisualStatus: "PENDING HUMAN VERIFICATION", knownDefectNotAddressed: "avaturn_head_face_transparency_during_pushup" };
  fs.writeFileSync(contract.provenance, JSON.stringify(provenance, null, 2) + "\n");
  return { bytes: output.length, sha256: sha256(output) };
}
if (require.main === module) console.log(JSON.stringify(extract(), null, 2));
module.exports = { extract };
