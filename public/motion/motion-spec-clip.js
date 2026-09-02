(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionSpecClip = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizedBoneKey(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function buildNodeResolver(avatar) {
    const exact = new Map();
    const normalized = new Map();
    avatar.traverse(object => {
      if (!object.name) return;
      exact.set(object.name, object);
      const key = normalizedBoneKey(object.name);
      if (!key) return;
      const bucket = normalized.get(key) || [];
      bucket.push(object);
      normalized.set(key, bucket);
    });

    function resolve(name) {
      if (exact.has(name)) return Object.freeze({ object: exact.get(name), requestedName: name, actualName: name, mode: "exact" });
      const matches = normalized.get(normalizedBoneKey(name)) || [];
      if (matches.length === 1) return Object.freeze({ object: matches[0], requestedName: name, actualName: matches[0].name, mode: "normalized-alias" });
      if (matches.length > 1) return Object.freeze({ object: null, requestedName: name, actualName: null, mode: "ambiguous" });
      return Object.freeze({ object: null, requestedName: name, actualName: null, mode: "missing" });
    }

    return Object.freeze({ resolve });
  }

  function compile(THREE, spec, avatar) {
    const resolver = buildNodeResolver(avatar);
    const targets = new Set([spec.skeleton.rootBone]);
    spec.phases.forEach(phase => phase.boneTargets.forEach(target => targets.add(target.bone)));

    const contactBones = spec.groundingPolicy?.contactBones || {};
    Object.values(contactBones).forEach(name => targets.add(name));

    const resolved = new Map();
    const unboundTargets = [];
    const ambiguousTargets = [];
    for (const name of targets) {
      const match = resolver.resolve(name);
      if (match.object) resolved.set(name, match);
      else if (match.mode === "ambiguous") ambiguousTargets.push(name);
      else unboundTargets.push(name);
    }

    if (ambiguousTargets.length || unboundTargets.length) {
      return Object.freeze({
        status: "failed",
        code: ambiguousTargets.length ? "motion_targets_ambiguous" : "motion_targets_unbound",
        diagnostics: Object.freeze({ unboundTargets: Object.freeze(unboundTargets), ambiguousTargets: Object.freeze(ambiguousTargets) })
      });
    }

    avatar.updateMatrixWorld?.(true);
    const bounds = new THREE.Box3().setFromObject(avatar), size = bounds.getSize(new THREE.Vector3());
    const scale = Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
    const times = spec.phases.map(phase => phase.normalizedTime * spec.durationSeconds);
    const tracks = [];
    const restQuaternions = new Map();
    for (const name of targets) restQuaternions.set(name, resolved.get(name).object.quaternion.clone());

    const rootMatch = resolved.get(spec.skeleton.rootBone);
    const rootNode = rootMatch.object;
    const restRootPosition = rootNode.position.clone();
    const restRootWorld = rootNode.getWorldPosition(new THREE.Vector3());

    function offsetQuaternion(name, offset) {
      const rest = restQuaternions.get(name);
      const e = offset.map(value => THREE.MathUtils.degToRad(value));
      return rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], "XYZ")));
    }

    function requestedOffset(phase, name) {
      if (name === spec.skeleton.rootBone) return phase.root.rotationOffsetEulerDegrees;
      return phase.boneTargets.find(target => target.bone === name)?.rotationOffsetEulerDegrees || [0, 0, 0];
    }

    function worldOffsetToRootLocal(offset) {
      if (rootNode.parent?.worldToLocal) {
        const desiredWorld = restRootWorld.clone().add(new THREE.Vector3(offset[0] * scale, offset[1] * scale, offset[2] * scale));
        return rootNode.parent.worldToLocal(desiredWorld);
      }
      return restRootPosition.clone().add(new THREE.Vector3(offset[0] * scale, offset[1] * scale, offset[2] * scale));
    }

    function applyAuthoredPhasePose(phase) {
      const localRoot = worldOffsetToRootLocal(phase.root.positionOffset);
      rootNode.position.copy(localRoot);
      for (const name of targets) resolved.get(name).object.quaternion.copy(offsetQuaternion(name, requestedOffset(phase, name)));
      avatar.updateMatrixWorld?.(true);
      return localRoot;
    }

    function restoreRestPose() {
      rootNode.position.copy(restRootPosition);
      for (const name of targets) resolved.get(name).object.quaternion.copy(restQuaternions.get(name));
      avatar.updateMatrixWorld?.(true);
    }

    const enforceContacts = Boolean(spec.groundingPolicy?.enforceContactAnchors);
    const contactNames = Array.isArray(spec.groundingPolicy?.contacts) ? spec.groundingPolicy.contacts : [];
    const anchorWorld = new Map();
    let anchorPhaseId = null;
    if (enforceContacts) {
      const requestedAnchorPhaseId = spec.groundingPolicy?.anchorPhaseId;
      const anchorPhase = requestedAnchorPhaseId ? spec.phases.find(phase => phase.id === requestedAnchorPhaseId) : null;
      if (requestedAnchorPhaseId && !anchorPhase) {
        return Object.freeze({ status: "failed", code: "motion_contact_anchor_phase_missing", diagnostics: Object.freeze({ anchorPhaseId: requestedAnchorPhaseId }) });
      }
      if (anchorPhase) {
        applyAuthoredPhasePose(anchorPhase);
        anchorPhaseId = anchorPhase.id;
      }
      for (const contact of contactNames) {
        const boneName = contactBones[contact];
        if (boneName && resolved.has(boneName)) anchorWorld.set(contact, resolved.get(boneName).object.getWorldPosition(new THREE.Vector3()));
      }
      if (anchorPhase) restoreRestPose();
    }

    const phaseRootPositions = [];
    const contactResiduals = [];
    for (const phase of spec.phases) {
      let localRoot = applyAuthoredPhasePose(phase);

      if (enforceContacts && phase.contacts?.length) {
        const corrections = [];
        for (const contact of phase.contacts) {
          const boneName = contactBones[contact];
          const anchor = anchorWorld.get(contact);
          if (!boneName || !anchor) continue;
          const current = resolved.get(boneName).object.getWorldPosition(new THREE.Vector3());
          corrections.push(anchor.clone().sub(current));
        }
        if (corrections.length) {
          const correction = corrections.reduce((sum, item) => sum.add(item), new THREE.Vector3()).multiplyScalar(1 / corrections.length);
          const rootWorld = rootNode.getWorldPosition(new THREE.Vector3()).add(correction);
          localRoot = rootNode.parent?.worldToLocal ? rootNode.parent.worldToLocal(rootWorld) : localRoot.add(correction);
          rootNode.position.copy(localRoot);
          avatar.updateMatrixWorld?.(true);

          let maxResidual = 0;
          for (const contact of phase.contacts) {
            const boneName = contactBones[contact];
            const anchor = anchorWorld.get(contact);
            if (!boneName || !anchor) continue;
            const current = resolved.get(boneName).object.getWorldPosition(new THREE.Vector3());
            maxResidual = Math.max(maxResidual, current.distanceTo(anchor));
          }
          contactResiduals.push(Object.freeze({ phaseId: phase.id, maxResidualWorldUnits: maxResidual }));
        }
      }
      phaseRootPositions.push(localRoot.clone());
    }

    // Restore the authored rest pose before returning the clip; compilation must not mutate the loaded avatar.
    restoreRestPose();

    for (const requestedName of targets) {
      const node = resolved.get(requestedName).object;
      const values = spec.phases.flatMap(phase => offsetQuaternion(requestedName, requestedOffset(phase, requestedName)).toArray());
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.uuid || node.name}.quaternion`, times, values, THREE.InterpolateLinear));
    }

    const positions = phaseRootPositions.flatMap(position => position.toArray());
    tracks.push(new THREE.VectorKeyframeTrack(`${rootNode.uuid || rootNode.name}.position`, times, positions, THREE.InterpolateSmooth));

    const clip = new THREE.AnimationClip(spec.motionId, spec.durationSeconds, tracks);
    const aliasBindings = [...resolved.values()].filter(match => match.mode === "normalized-alias").map(match => Object.freeze({ requestedName: match.requestedName, actualName: match.actualName }));
    const maxContactResidual = contactResiduals.reduce((max, item) => Math.max(max, item.maxResidualWorldUnits), 0);

    return Object.freeze({
      status: "ready",
      clip,
      diagnostics: Object.freeze({
        motionId: spec.motionId,
        exerciseId: spec.exerciseId,
        phaseCount: spec.phases.length,
        duration: clip.duration,
        targetCount: targets.size,
        boundTargetCount: targets.size,
        unboundTargetCount: 0,
        unboundTargets: Object.freeze([]),
        ambiguousTargetCount: 0,
        aliasBindingCount: aliasBindings.length,
        aliasBindings: Object.freeze(aliasBindings),
        contactLockApplied: enforceContacts,
        contactAnchorPhaseId: anchorPhaseId,
        maxContactResidualWorldUnits: maxContactResidual,
        contactResiduals: Object.freeze(contactResiduals),
        trackCount: tracks.length
      })
    });
  }

  return Object.freeze({ compile, normalizedBoneKey });
});
