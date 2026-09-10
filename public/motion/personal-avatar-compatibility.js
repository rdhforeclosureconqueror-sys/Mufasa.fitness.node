(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTPersonalAvatarCompatibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "personal-avatar-compatibility-v1";
  const REQUIRED_CANONICAL_JOINTS = Object.freeze([
    "Hips", "Spine", "Spine1", "Neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot"
  ]);

  const ALIASES = Object.freeze({
    Hips: ["Hips", "mixamorig:Hips"], Spine: ["Spine", "mixamorig:Spine"], Spine1: ["Spine1", "mixamorig:Spine1"],
    Neck: ["Neck", "mixamorig:Neck"], Head: ["Head", "mixamorig:Head"],
    LeftShoulder: ["LeftShoulder", "mixamorig:LeftShoulder"], LeftArm: ["LeftArm", "mixamorig:LeftArm"], LeftForeArm: ["LeftForeArm", "mixamorig:LeftForeArm"], LeftHand: ["LeftHand", "mixamorig:LeftHand"],
    RightShoulder: ["RightShoulder", "mixamorig:RightShoulder"], RightArm: ["RightArm", "mixamorig:RightArm"], RightForeArm: ["RightForeArm", "mixamorig:RightForeArm"], RightHand: ["RightHand", "mixamorig:RightHand"],
    LeftUpLeg: ["LeftUpLeg", "mixamorig:LeftUpLeg"], LeftLeg: ["LeftLeg", "mixamorig:LeftLeg"], LeftFoot: ["LeftFoot", "mixamorig:LeftFoot"],
    RightUpLeg: ["RightUpLeg", "mixamorig:RightUpLeg"], RightLeg: ["RightLeg", "mixamorig:RightLeg"], RightFoot: ["RightFoot", "mixamorig:RightFoot"]
  });

  function namesFromSkeleton(skeleton) {
    const bones = Array.isArray(skeleton?.bones) ? skeleton.bones : [];
    return bones.map(b => typeof b === "string" ? b : b?.name).filter(Boolean);
  }

  function buildCanonicalMap(boneNames) {
    const available = new Set(Array.isArray(boneNames) ? boneNames : []);
    const map = {};
    const unmapped = [];
    REQUIRED_CANONICAL_JOINTS.forEach(joint => {
      const matches = (ALIASES[joint] || [joint]).filter(name => available.has(name));
      if (matches.length === 1) map[joint] = matches[0];
      else unmapped.push({ joint, reason: matches.length ? "ambiguous" : "missing", matches });
    });
    return { map, unmapped, mappedCount: Object.keys(map).length, requiredCount: REQUIRED_CANONICAL_JOINTS.length };
  }

  function animationNames(input) {
    const animations = Array.isArray(input?.animations) ? input.animations : [];
    return animations.map(a => typeof a === "string" ? a : a?.name).filter(Boolean);
  }

  function classifyEmbeddedAnimations(input) {
    return animationNames(input).map(name => ({ name, embedded: true, stackingRisk: true, policy: "disable-before-pocketpt-custom-motion" }));
  }

  function inspect(input) {
    const avatar = input?.avatar || null;
    const skeleton = input?.skeleton || null;
    const mounted = Boolean(input?.mounted && avatar);
    const boneNames = namesFromSkeleton(skeleton);
    const mapping = buildCanonicalMap(boneNames);
    const animations = animationNames(input);
    const stages = [
      ["PERSONAL_AVATAR_MOUNTED", mounted, mounted ? "personalized avatar mounted" : "personalized avatar not mounted"],
      ["SKELETON_FOUND", Boolean(skeleton), skeleton ? "skeleton available" : "skeleton missing"],
      ["BONES_INVENTORIED", boneNames.length > 0, boneNames.length ? `${boneNames.length} bones inventoried` : "no bones inventoried"],
      ["CANONICAL_MAP_RESOLVED", mapping.unmapped.length === 0, mapping.unmapped.length ? `${mapping.unmapped.length} required joints unresolved` : "all required canonical joints resolved"],
      ["REST_POSE_VALID", input?.restPoseValid === true, input?.restPoseValid === true ? "rest pose explicitly validated" : "rest pose not yet validated"],
      ["EMBEDDED_TRACKS_CLASSIFIED", true, `${animations.length} embedded animation(s) classified`],
      ["ANIMATION_LIBRARY_RESOLVED", animations.length > 0, animations.length ? animations.join(", ") : "no animation clips discovered"],
      ["COMPATIBILITY_CLASSIFIED", mapping.unmapped.length === 0 && input?.restPoseValid === true, "mapping and rest-pose compatibility"]
    ].map(([stage, pass, detail]) => ({ stage, status: pass ? "PASS" : "FAIL", detail }));
    const firstFailure = stages.find(stage => stage.status === "FAIL") || null;
    return {
      version: VERSION,
      avatarId: avatar?.avatarId || avatar?.id || null,
      skeletonProfile: avatar?.skeletonProfile || null,
      boneNames,
      canonicalMap: mapping.map,
      unmapped: mapping.unmapped,
      mappingCoverage: `${mapping.mappedCount}/${mapping.requiredCount}`,
      animations,
      embeddedAnimations: classifyEmbeddedAnimations(input),
      stages,
      firstFailure: firstFailure ? firstFailure.stage : "NONE"
    };
  }

  function formatReport(report) {
    const r = report || {};
    const lines = [
      "POCKETPT PERSONALIZED AVATAR COMPATIBILITY — DEBUG",
      `FIRST FAILURE: ${r.firstFailure || "UNKNOWN"}`,
      `Avatar: ${r.avatarId || "unknown"}`,
      `Skeleton profile: ${r.skeletonProfile || "unknown"}`,
      `Bone mapping: ${r.mappingCoverage || "0/0"}`,
      `Animations: ${(r.animations || []).join(", ") || "none discovered"}`,
      "",
      "=== COMPATIBILITY PIPELINE ==="
    ];
    (r.stages || []).forEach(stage => lines.push(`${stage.status} ${stage.stage} — ${stage.detail}`));
    if ((r.unmapped || []).length) {
      lines.push("", "=== UNRESOLVED CANONICAL JOINTS ===");
      r.unmapped.forEach(item => lines.push(`${item.joint}: ${item.reason}${item.matches?.length ? ` (${item.matches.join(", ")})` : ""}`));
    }
    if ((r.embeddedAnimations || []).length) {
      lines.push("", "=== EMBEDDED TRACK POLICY ===");
      r.embeddedAnimations.forEach(item => lines.push(`${item.name}: ${item.policy}`));
    }
    return lines.join("\n");
  }

  return Object.freeze({ VERSION, REQUIRED_CANONICAL_JOINTS, ALIASES, buildCanonicalMap, classifyEmbeddedAnimations, inspect, formatReport });
});
