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
      if (matches.length === 1) {
        return Object.freeze({ object: matches[0], requestedName: name, actualName: matches[0].name, mode: "normalized-alias" });
      }
      if (matches.length > 1) return Object.freeze({ object: null, requestedName: name, actualName: null, mode: "ambiguous" });
      return Object.freeze({ object: null, requestedName: name, actualName: null, mode: "missing" });
    }

    return Object.freeze({ resolve });
  }

  function compile(THREE, spec, avatar) {
    const resolver = buildNodeResolver(avatar);
    const targets = new Set([spec.skeleton.rootBone]);
    spec.phases.forEach(phase => phase.boneTargets.forEach(target => targets.add(target.bone)));

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
        diagnostics: Object.freeze({
          unboundTargets: Object.freeze(unboundTargets),
          ambiguousTargets: Object.freeze(ambiguousTargets)
        })
      });
    }

    avatar.updateMatrixWorld?.(true);
    const bounds = new THREE.Box3().setFromObject(avatar), size = bounds.getSize(new THREE.Vector3());
    const scale = Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
    const times = spec.phases.map(phase => phase.normalizedTime * spec.durationSeconds);
    const tracks = [];

    const quaternionValues = (requestedName, offsets) => {
      const node = resolved.get(requestedName).object;
      const rest = node.quaternion.clone();
      return offsets.flatMap(offset => {
        const e = offset.map(value => THREE.MathUtils.degToRad(value));
        return rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], "XYZ"))).toArray();
      });
    };

    for (const requestedName of targets) {
      const node = resolved.get(requestedName).object;
      const offsets = spec.phases.map(phase => requestedName === spec.skeleton.rootBone
        ? phase.root.rotationOffsetEulerDegrees
        : phase.boneTargets.find(target => target.bone === requestedName)?.rotationOffsetEulerDegrees || [0, 0, 0]);
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.uuid || node.name}.quaternion`, times, quaternionValues(requestedName, offsets), THREE.InterpolateLinear));
    }

    const rootMatch = resolved.get(spec.skeleton.rootBone);
    const root = rootMatch.object;
    const restPosition = root.position.clone();
    const worldPosition = root.getWorldPosition?.(new THREE.Vector3());
    const positions = spec.phases.flatMap(phase => {
      const offset = phase.root.positionOffset;
      // Avatar-height offsets describe world-space displacement. The reference
      // armature is rotated and scaled to 0.01, so convert to its local space.
      if (worldPosition && root.parent?.worldToLocal) {
        const point = new THREE.Vector3(worldPosition.x + offset[0] * scale, worldPosition.y + offset[1] * scale, worldPosition.z + offset[2] * scale);
        return root.parent.worldToLocal(point).toArray();
      }
      return [restPosition.x + offset[0] * scale, restPosition.y + offset[1] * scale, restPosition.z + offset[2] * scale];
    });
    tracks.push(new THREE.VectorKeyframeTrack(`${root.uuid || root.name}.position`, times, positions, THREE.InterpolateSmooth));

    const clip = new THREE.AnimationClip(spec.motionId, spec.durationSeconds, tracks);
    const aliasBindings = [...resolved.values()]
      .filter(match => match.mode === "normalized-alias")
      .map(match => Object.freeze({ requestedName: match.requestedName, actualName: match.actualName }));

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
        trackCount: tracks.length
      })
    });
  }

  return Object.freeze({ compile, normalizedBoneKey });
});
