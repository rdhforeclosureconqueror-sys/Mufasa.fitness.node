#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const contract = require("./avaturn-push-up-contract");
const { parseGlb } = require("./glb-utils");
const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");

function inventory(file = contract.output) {
  const data = fs.readFileSync(file), { json } = parseGlb(data), animation = json.animations?.[0];
  const channels = animation?.channels || [], targets = new Set(channels.map(channel => channel.target.node));
  const duration = Math.max(...(animation?.samplers || []).map(sampler => json.accessors[sampler.input].max?.[0] || 0));
  return { size: data.length, sha256: sha256(data), animationCount: json.animations?.length || 0, clip: animation?.name,
    duration, tracks: channels.length, targets: targets.size, nodes: json.nodes?.length || 0, meshes: json.meshes?.length || 0,
    skins: json.skins?.length || 0, materials: json.materials?.length || 0, textures: json.textures?.length || 0,
    images: json.images?.length || 0, morphTracks: channels.filter(channel => channel.target.path === "weights").length };
}
function validate() {
  assert.equal(sha256(fs.readFileSync(contract.source)), contract.sourceSha256, "approved source SHA-256");
  const result = inventory();
  assert.equal(result.animationCount, 1); assert.equal(result.clip, contract.clipName);
  assert.ok(Math.abs(result.duration - contract.interval.end) < 1e-6, `duration ${result.duration}`);
  for (const [key, expected] of Object.entries(contract.expected)) assert.equal(result[key], expected, key);
  const provenance = JSON.parse(fs.readFileSync(contract.provenance));
  assert.equal(provenance.sourceSha256, contract.sourceSha256); assert.equal(provenance.humanVisualStatus, "PENDING HUMAN VERIFICATION");
  return result;
}
if (require.main === module) console.log(JSON.stringify(validate(), null, 2));
module.exports = { inventory, validate };
