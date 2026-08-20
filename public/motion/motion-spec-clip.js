(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionSpecClip = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function compile(THREE, spec, avatar) {
    const nodes = new Map(); avatar.traverse(object => { if (object.name) nodes.set(object.name, object); });
    const targets = new Set([spec.skeleton.rootBone]); spec.phases.forEach(phase => phase.boneTargets.forEach(target => targets.add(target.bone)));
    const unboundTargets = [...targets].filter(name => !nodes.has(name));
    if (unboundTargets.length) return Object.freeze({ status: "failed", code: "motion_targets_unbound", diagnostics: Object.freeze({ unboundTargets: Object.freeze(unboundTargets) }) });
    avatar.updateMatrixWorld?.(true);
    const bounds = new THREE.Box3().setFromObject(avatar), size = bounds.getSize(new THREE.Vector3());
    const scale = Number.isFinite(size.y) && size.y > 0 ? size.y : 1, times = spec.phases.map(phase => phase.normalizedTime * spec.durationSeconds), tracks = [];
    const quaternionValues = (name, offsets) => { const node = nodes.get(name), rest = node.quaternion.clone(); return offsets.flatMap(offset => { const e = offset.map(value => THREE.MathUtils.degToRad(value)); return rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], "XYZ"))).toArray(); }); };
    for (const name of targets) {
      const offsets = spec.phases.map(phase => name === spec.skeleton.rootBone ? phase.root.rotationOffsetEulerDegrees : phase.boneTargets.find(target => target.bone === name)?.rotationOffsetEulerDegrees || [0, 0, 0]);
      tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, quaternionValues(name, offsets), THREE.InterpolateLinear));
    }
    const root = nodes.get(spec.skeleton.rootBone), restPosition = root.position.clone(), positions = spec.phases.flatMap(phase => [restPosition.x + phase.root.positionOffset[0] * scale, restPosition.y + phase.root.positionOffset[1] * scale, restPosition.z + phase.root.positionOffset[2] * scale]);
    tracks.push(new THREE.VectorKeyframeTrack(`${spec.skeleton.rootBone}.position`, times, positions, THREE.InterpolateSmooth));
    const clip = new THREE.AnimationClip(spec.motionId, spec.durationSeconds, tracks);
    return Object.freeze({ status: "ready", clip, diagnostics: Object.freeze({ motionId: spec.motionId, exerciseId: spec.exerciseId, phaseCount: spec.phases.length, duration: clip.duration, targetCount: targets.size, boundTargetCount: targets.size, unboundTargetCount: 0, unboundTargets: Object.freeze([]), trackCount: tracks.length }) });
  }
  return Object.freeze({ compile });
});
