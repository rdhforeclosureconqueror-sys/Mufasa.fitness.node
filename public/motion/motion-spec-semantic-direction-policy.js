(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionSpecSemanticDirectionPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.1.0-phase-specific-semantic-world-direction";

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

  function buildPhaseSpecificSpec(THREE, spec, avatar) {
    const semanticTargets = Array.isArray(spec?.semanticPosePolicy?.targets) ? spec.semanticPosePolicy.targets : [];
    if (!semanticTargets.length) return Object.freeze({ status:"ready", spec, diagnostics:Object.freeze({ phaseSpecific:false, targetCount:0, phaseRecords:Object.freeze([]) }) });
    if (!Array.isArray(spec?.phases) || !spec?.skeleton?.rootBone) return Object.freeze({ status:"failed", code:"semantic_phase_contract_invalid" });

    const referencedNames = new Set([spec.skeleton.rootBone]);
    for (const phase of spec.phases) for (const target of phase.boneTargets || []) referencedNames.add(target.bone);
    for (const target of semanticTargets) {
      referencedNames.add(target.bone);
      referencedNames.add(target.childBone);
    }

    const nodes = new Map();
    for (const name of referencedNames) {
      const match = resolveNode(avatar, name);
      if (match.status !== "ready") return Object.freeze({ status:"failed", code:match.code, diagnostics:Object.freeze({ requestedBone:name }) });
      nodes.set(name, match.object);
    }

    avatar.updateMatrixWorld?.(true);
    const bounds = new THREE.Box3().setFromObject(avatar);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
    const rootNode = nodes.get(spec.skeleton.rootBone);
    const restRootPosition = rootNode.position.clone();
    const restRootWorld = rootNode.getWorldPosition(new THREE.Vector3());
    const restQuaternions = new Map();
    for (const [name, node] of nodes.entries()) restQuaternions.set(name, node.quaternion.clone());

    function restoreRestPose() {
      rootNode.position.copy(restRootPosition);
      for (const [name, node] of nodes.entries()) node.quaternion.copy(restQuaternions.get(name));
      avatar.updateMatrixWorld?.(true);
    }

    function offsetQuaternion(name, offset) {
      const rest = restQuaternions.get(name);
      const values = Array.isArray(offset) ? offset : [0,0,0];
      const e = values.map(value => THREE.MathUtils.degToRad(Number(value) || 0));
      return rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], "XYZ")));
    }

    function worldOffsetToRootLocal(offset) {
      const values = Array.isArray(offset) ? offset : [0,0,0];
      if (rootNode.parent?.worldToLocal) {
        const desiredWorld = restRootWorld.clone().add(new THREE.Vector3((Number(values[0]) || 0) * scale, (Number(values[1]) || 0) * scale, (Number(values[2]) || 0) * scale));
        return rootNode.parent.worldToLocal(desiredWorld);
      }
      return restRootPosition.clone().add(new THREE.Vector3((Number(values[0]) || 0) * scale, (Number(values[1]) || 0) * scale, (Number(values[2]) || 0) * scale));
    }

    function applyPhasePose(phase) {
      restoreRestPose();
      rootNode.position.copy(worldOffsetToRootLocal(phase.root?.positionOffset));
      rootNode.quaternion.copy(offsetQuaternion(spec.skeleton.rootBone, phase.root?.rotationOffsetEulerDegrees));
      for (const target of phase.boneTargets || []) {
        const node = nodes.get(target.bone);
        if (node) node.quaternion.copy(offsetQuaternion(target.bone, target.rotationOffsetEulerDegrees));
      }
      avatar.updateMatrixWorld?.(true);
    }

    function solvedOffsetDegrees(name, solvedLocalQuaternion) {
      const rest = restQuaternions.get(name);
      const relative = rest.clone().invert().multiply(solvedLocalQuaternion).normalize();
      const euler = new THREE.Euler().setFromQuaternion(relative, "XYZ");
      return Object.freeze([
        THREE.MathUtils.radToDeg(euler.x),
        THREE.MathUtils.radToDeg(euler.y),
        THREE.MathUtils.radToDeg(euler.z)
      ]);
    }

    const phaseRecords = [];
    const phases = [];
    try {
      for (const phase of spec.phases) {
        applyPhasePose(phase);
        const replacements = new Map();
        const records = [];
        for (const target of semanticTargets) {
          if (target?.type !== "bone_direction_world") return Object.freeze({ status:"failed", code:"semantic_target_type_unsupported", diagnostics:Object.freeze({ targetType:target?.type || null }) });
          const oriented = orientBoneToWorldDirection(THREE, avatar, target);
          if (oriented.status !== "ready") return oriented;
          const bone = nodes.get(target.bone);
          replacements.set(target.bone, solvedOffsetDegrees(target.bone, bone.quaternion));
          records.push(Object.freeze({ ...oriented.diagnostics, phaseId:phase.id }));
        }

        const originalTargets = Array.isArray(phase.boneTargets) ? phase.boneTargets : [];
        const replaced = new Set();
        const boneTargets = originalTargets.map(item => {
          if (!replacements.has(item.bone)) return item;
          replaced.add(item.bone);
          return Object.freeze({ ...item, rotationOffsetEulerDegrees:replacements.get(item.bone) });
        });
        for (const [bone, rotationOffsetEulerDegrees] of replacements.entries()) {
          if (!replaced.has(bone)) boneTargets.push(Object.freeze({ bone, rotationOffsetEulerDegrees }));
        }
        phases.push(Object.freeze({ ...phase, boneTargets:Object.freeze(boneTargets) }));
        phaseRecords.push(...records);
      }
    } finally {
      restoreRestPose();
    }

    const derivedSpec = Object.freeze({
      ...spec,
      phases:Object.freeze(phases),
      semanticPoseCompilation:Object.freeze({
        mode:"phase-specific-after-ancestor-pose",
        sourcePolicyVersion:VERSION,
        solvedPhaseCount:phases.length,
        targetCount:semanticTargets.length
      })
    });
    return Object.freeze({ status:"ready", spec:derivedSpec, diagnostics:Object.freeze({ phaseSpecific:true, targetCount:semanticTargets.length, solvedPhaseCount:phases.length, phaseRecords:Object.freeze(phaseRecords) }) });
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

        const prepared = buildPhaseSpecificSpec(THREE, spec, avatar);
        if (prepared.status !== "ready") return prepared;
        const compiled = originalCompile(THREE, prepared.spec, avatar);
        if (compiled?.status !== "ready") return compiled;
        return Object.freeze({
          ...compiled,
          diagnostics:Object.freeze({
            ...(compiled.diagnostics || {}),
            semanticDirectionPolicyApplied:true,
            semanticDirectionPolicyVersion:VERSION,
            semanticDirectionTargetCount:prepared.diagnostics.targetCount,
            semanticDirectionSolvedPhaseCount:prepared.diagnostics.solvedPhaseCount,
            semanticDirectionSolveMode:"phase-specific-after-ancestor-pose",
            semanticDirectionTargets:prepared.diagnostics.phaseRecords
          })
        });
      }
    });
    return wrapped;
  }

  return Object.freeze({ VERSION, normalizedBoneKey, resolveNode, orientBoneToWorldDirection, buildPhaseSpecificSpec, install });
});
