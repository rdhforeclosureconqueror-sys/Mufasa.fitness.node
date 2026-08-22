"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), crypto = require("node:crypto");
const contract = require("../scripts/motion/avaturn-push-up-contract"), { extract } = require("../scripts/motion/extract-avaturn-push-up"), { validate } = require("../scripts/motion/validate-avaturn-push-up"), fixture = require("../public/motion/avaturn-push-up-fixture");
const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
test("extractor is deterministic and preserves the immutable source", () => { const before = sha(contract.source), first = extract(), second = extract(); assert.deepEqual(second, first); assert.equal(sha(contract.source), before); assert.equal(before, contract.sourceSha256); });
test("fixture contains only the approved native skeletal animation", () => { const value = validate(); assert.deepEqual({ animations: value.animationCount, tracks: value.tracks, targets: value.targets, meshes: value.meshes, skins: value.skins, materials: value.materials, textures: value.textures, images: value.images, morphTracks: value.morphTracks }, { animations: 1, tracks: 40, targets: 39, meshes: 0, skins: 0, materials: 0, textures: 0, images: 0, morphTracks: 0 }); });
test("native compatibility is explicit and Phase E requires future retargeting", () => { assert.equal(fixture.compatibility("avaturn-personalized-candidate"), "NATIVE"); assert.equal(fixture.compatibility("phase-e-reference"), "RETARGET REQUIRED"); });
test("all 40 intended tracks resolve with the real Three.js PropertyBinding", async () => {
  const THREE = require("three"), { parseGlb } = require("../scripts/motion/glb-utils"), source = parseGlb(contract.source).json, output = parseGlb(contract.output).json;
  const avatar = new THREE.Scene(), objects = source.nodes.map(node => { const object = new THREE.Object3D(); object.name = THREE.PropertyBinding.sanitizeNodeName(node.name || ""); return object; });
  source.nodes.forEach((node, index) => (node.children || []).forEach(child => objects[index].add(objects[child]))); source.scenes[source.scene || 0].nodes.forEach(node => avatar.add(objects[node]));
  const names = output.animations[0].channels.map(channel => `${THREE.PropertyBinding.sanitizeNodeName(output.nodes[channel.target.node].name)}.${channel.target.path === "rotation" ? "quaternion" : "position"}`);
  const unbound = names.filter(name => { const parsed = THREE.PropertyBinding.parseTrackName(name); return !THREE.PropertyBinding.findNode(avatar, parsed.nodeName); });
  assert.equal(names.length, 40); assert.deepEqual(unbound, []);
});
