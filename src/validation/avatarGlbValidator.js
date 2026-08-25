"use strict";
const { ApiError } = require("../lib/apiResponse");
const skeletonRegistry = require("../../public/motion/registry/skeleton-profiles.json");
const PROFILE_ID = "avaturn-native-v1";
const RIGHT_ARM_CHAIN = Object.freeze(["RightShoulder", "RightArm", "RightForeArm", "RightHand"]);
function validationError(message, details = {}) { return new ApiError("AVATAR_INCOMPATIBLE", message, 422, details); }
function parseGlbJson(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 20) throw validationError("Avatar GLB is truncated or malformed.");
  if (buffer.toString("ascii", 0, 4) !== "glTF") throw validationError("Invalid .glb file header.");
  const version = buffer.readUInt32LE(4), declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) throw validationError("Avatar must use GLB version 2.", { version });
  if (declaredLength !== buffer.length) throw validationError("Avatar GLB length is invalid.");
  const jsonLength = buffer.readUInt32LE(12), chunkType = buffer.toString("ascii", 16, 20);
  if (chunkType !== "JSON" || jsonLength <= 0 || 20 + jsonLength > buffer.length) throw validationError("Avatar GLB JSON chunk is invalid.");
  try { return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).replace(/\u0000+$/g, "").trim()); }
  catch (_) { throw validationError("Avatar GLB JSON is malformed."); }
}
function validateAvatarGlb(buffer) {
  const json = parseGlbJson(buffer), nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const profile = skeletonRegistry.records.find(entry => entry.skeletonProfileId === PROFILE_ID);
  if (!profile) throw new Error(`${PROFILE_ID} skeleton registry is unavailable`);
  const indexes = new Map(); nodes.forEach((node, index) => { if (typeof node?.name === "string" && !indexes.has(node.name)) indexes.set(node.name, index); });
  const missingBones = RIGHT_ARM_CHAIN.filter(name => !indexes.has(name));
  if (missingBones.length) throw validationError(`Avatar is missing required ${PROFILE_ID} bones: ${missingBones.join(", ")}.`, { profileId: PROFILE_ID, missingBones });
  for (let index = 0; index < RIGHT_ARM_CHAIN.length - 1; index += 1) {
    const parentName = RIGHT_ARM_CHAIN[index], childName = RIGHT_ARM_CHAIN[index + 1], parent = nodes[indexes.get(parentName)];
    if (!Array.isArray(parent?.children) || !parent.children.includes(indexes.get(childName))) throw validationError(`Avatar right-arm hierarchy must be ${RIGHT_ARM_CHAIN.join(" → ")}.`, { profileId: PROFILE_ID, parentName, childName });
  }
  return Object.freeze({ profileId: PROFILE_ID, requiredBones: RIGHT_ARM_CHAIN, nodeCount: nodes.length, rootJoint: profile.rootJoint });
}
module.exports = { PROFILE_ID, RIGHT_ARM_CHAIN, parseGlbJson, validateAvatarGlb };
