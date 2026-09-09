(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionSpecSemanticDirectionPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.0.0-semantic-world-direction";

  function normalizedBoneKey(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function resolveNode(avatar, requestedName) {
    let exact = null;
    const normalized = [];
    avatar?.traverse?.(object => {
      if (!object?.name) return;
      if (object.name === requestedName) exact = object;
      if (normalizedBoneKey(object.name) === normalizedBoneKey(requestedName)) normalized.push(object);
    });
    if (exact) return Object.freeze({ status:"ready", object:exact, mode:"exact", requestedName, actualName:exact.name });
    if (normalized.length === 1) return Object.freeze({ status:"ready", object:normalized[0], mode:"normalized-alias", requestedName, actualName:normalized[0].name });
    return Object.freeze({ status:"failed", code:normalized.length > 1 ? "semantic_target_ambiguous" : "semantic_target_unbound", requestedName });
  }

  function orientBoneToWorldDirection(THREE, avatar, target) {
    if (!THREE?.Vector3 || !THREE?.Quaternion) return Object.freeze({ status:"failed", code:"semantic_three_unavailable" });
    const boneMatch = resolveNode(avatar, target?.bone);
    const childMatch = resolveNode(avatar, target?.childBone);
    if (boneMatch.status !== "ready" || childMatch.status !== "ready") {
      return Object.freeze({
        status:"failed",
        code:boneMatch.status !== "ready" ? boneMatch.code : childMatch.code,
        diagnostics:Object.freeze({ bone:boneMatch, childBone:childMatch })
      });
    }

    const direction = Array.isArray(target?.worldDirection) ? target.worldDirection : null;
    if (!direction || direction.length !== 3) return Object.freeze({ status:"failed", code:"semantic_direction_invalid" });
    const desired = new THREE.Vector3(Number(direction[0]), Number(direction[1]), Number(direction[2]));
    if (!(desired.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_direction_zero" });
    desired.normalize();

    const bone = boneMatch.object;
    const child = childMatch.object;
    avatar.updateMatrixWorld?.(true);
    const start = bone.getWorldPosition(new THREE.Vector3());
    const end = child.getWorldPosition(new THREE.Vector3());
    const current = end.clone().sub(start);
    if (!(current.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_bone_zero_length", diagnostics:Object.freeze({ bone:bone.name, childBone:child.name }) });
    current.normalize();

    const beforeAngleDegrees = THREE.MathUtils?.radToDeg ? THREE.MathUtils.radToDeg(current.angleTo(desired)) : current.angleTo(desired) * 180 / Math.PI;
    const worldDelta = new THREE.Quaternion().setFromUnitVectors(current, desired);
    const currentWorld = bone.getWorldQuaternion(new THREE.Quaternion());
    const desiredWorld = worldDelta.multiply(currentWorld);
    const parentWorld = bone.parent?.getWorldQuaternion ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    const desiredLocal = parentWorld.clone().invert().multiply(desiredWorld);
    bone.quaternion.copy(desiredLocal);
    avatar.updateMatrixWorld?.(true);

    const solvedStart = bone.getWorldPosition(new THREE.Vector3());
    const solvedEnd = child.getWorldPosition(new THREE.Vector3());
    const solved = solvedEnd.clone().sub(solvedStart).normalize();
    const residualDegrees = THREE.MathUtils?.radToDeg ? THREE.MathUtils.radToDeg(solved.angleTo(desired)) : solved.angleTo(desired) * 180 / Math.PI;
    return Object.freeze({
      status:"ready",
      diagnostics:Object.freeze({
        id:target?.id || null,
        bone:bone.name,
        childBone:child.name,
        coordinateSpace:"world",
        requestedDirection:Object.freeze(direction.slice()),
        beforeAngleDegrees,
        residualDegrees
      })
    });
  }

  function install(baseCompiler) {
    if (!baseCompiler?.compile) return null;
    if (baseCompiler.__semanticDirectionPolicyInstalled === true) return baseCompiler;
    const originalCompile = baseCompiler.compile.bind(baseCompiler);

    const wrapped = Object.freeze({
      ...baseCompiler,
      __semanticDirectionPolicyInstalled:true,
      semanticDirectionPolicyVersion:VERSION,
      compile:function (THREE, spec, avatar) {
        const targets = Array.isArray(spec?.semanticPosePolicy?.targets) ? spec.semanticPosePolicy.targets : [];
        if (!targets.length) return originalCompile(THREE, spec, avatar);

        const saved = new Map();
        const records = [];
        try {
          for (const target of targets) {
            if (target?.type !== "bone_direction_world") {
              return Object.freeze({ status:"failed", code:"semantic_target_type_unsupported", diagnostics:Object.freeze({ targetType:target?.type || null }) });
            }
            const match = resolveNode(avatar, target.bone);
            if (match.status !== "ready") return Object.freeze({ status:"failed", code:match.code, diagnostics:Object.freeze({ requestedBone:target.bone }) });
            if (!saved.has(match.object)) saved.set(match.object, match.object.quaternion.clone());
            const oriented = orientBoneToWorldDirection(THREE, avatar, target);
            if (oriented.status !== "ready") return oriented;
            records.push(oriented.diagnostics);
          }

          const compiled = originalCompile(THREE, spec, avatar);
          if (compiled?.status !== "ready") return compiled;
          return Object.freeze({
            ...compiled,
            diagnostics:Object.freeze({
              ...(compiled.diagnostics || {}),
              semanticDirectionPolicyApplied:true,
              semanticDirectionPolicyVersion:VERSION,
              semanticDirectionTargetCount:records.length,
              semanticDirectionTargets:Object.freeze(records.slice())
            })
          });
        } finally {
          for (const [bone, quaternion] of saved.entries()) bone.quaternion.copy(quaternion);
          avatar.updateMatrixWorld?.(true);
        }
      }
    });
    return wrapped;
  }

  return Object.freeze({ VERSION, normalizedBoneKey, resolveNode, orientBoneToWorldDirection, install });
});
