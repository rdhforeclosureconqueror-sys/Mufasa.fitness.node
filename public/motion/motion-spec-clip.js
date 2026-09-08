(function (root, factory) {
  const adapter = typeof module === "object" && module.exports
    ? require("./motion-lab-intelligence-adapter")
    : root.PocketPTMotionLabIntelligenceAdapter;
  const api = factory(adapter);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionSpecClip = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (intelligenceAdapter) {
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
      if (!intelligenceAdapter?.solvePhaseContacts) {
        return Object.freeze({ status: "failed", code: "motion_intelligence_adapter_unavailable", diagnostics: Object.freeze({ adapterRequired: true }) });
      }
      const missingContactMappings = contactNames.filter(contact => !contactBones[contact]);
      if (missingContactMappings.length) {
        return Object.freeze({
          status: "failed",
          code: "motion_contact_mapping_missing",
          diagnostics: Object.freeze({ missingContacts: Object.freeze([...missingContactMappings]) })
        });
      }
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
      const missingAnchors = contactNames.filter(contact => !anchorWorld.has(contact));
      if (missingAnchors.length) {
        if (anchorPhase) restoreRestPose();
        return Object.freeze({
          status: "failed",
          code: "motion_contact_anchor_unresolved",
          diagnostics: Object.freeze({ anchorPhaseId, missingContacts: Object.freeze([...missingAnchors]) })
        });
      }
      if (anchorPhase) restoreRestPose();
    }

    const phaseRootPositions = [];
    const contactResiduals = [];
    const phaseConstraintDiagnostics = [];
    for (const phase of spec.phases) {
      let localRoot = applyAuthoredPhasePose(phase);

      if (enforceContacts && phase.contacts?.length) {
        const contactRecords = [];
        const missingPhaseContacts = [];
        for (const contact of phase.contacts) {
          const boneName = contactBones[contact];
          const anchor = anchorWorld.get(contact);
          const match = boneName ? resolved.get(boneName) : null;
          if (!match?.object || !anchor) {
            missingPhaseContacts.push(contact);
            continue;
          }
          contactRecords.push(Object.freeze({
            id: contact,
            node: match.object,
            current: match.object.getWorldPosition(new THREE.Vector3()),
            anchor: anchor.clone()
          }));
        }
        if (missingPhaseContacts.length) {
          restoreRestPose();
          return Object.freeze({
            status: "failed",
            code: "motion_phase_contact_unresolved",
            diagnostics: Object.freeze({
              motionId: spec.motionId,
              exerciseId: spec.exerciseId,
              phaseId: phase.id,
              firstFailingBoundary: Object.freeze({ type: "CONTACT_UNRESOLVED", contacts: Object.freeze([...missingPhaseContacts]) }),
              missingContacts: Object.freeze([...missingPhaseContacts]),
              intelligenceAdapterVersion: intelligenceAdapter.VERSION || null
            })
          });
        }

        const constrained = intelligenceAdapter.solvePhaseContacts({
          THREE,
          avatar,
          rootNode,
          bodyScale: scale,
          contacts: contactRecords
        });
        if (constrained.status !== "ready") {
          restoreRestPose();
          return Object.freeze({
            status: "failed",
            code: constrained.code || "motion_kinematic_validation_failed",
            diagnostics: Object.freeze({
              motionId: spec.motionId,
              exerciseId: spec.exerciseId,
              phaseId: phase.id,
              firstFailingBoundary: constrained.diagnostics?.firstFailure || null,
              intelligenceAdapterVersion: intelligenceAdapter.VERSION || null,
              adapterDiagnostics: constrained.diagnostics || null
            })
          });
        }
        localRoot = constrained.rootLocalPosition || rootNode.position.clone();
        const phaseDiagnostics = Object.freeze({ phaseId: phase.id, ...constrained.diagnostics });
        phaseConstraintDiagnostics.push(phaseDiagnostics);
        contactResiduals.push(Object.freeze({ phaseId: phase.id, maxResidualWorldUnits: Number(constrained.diagnostics?.maxResidualWorldUnits) || 0 }));
      }
      phaseRootPositions.push(localRoot.clone());
    }

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
        kinematicValidationApplied: enforceContacts,
        intelligenceAdapterVersion: intelligenceAdapter?.VERSION || null,
        maxContactResidualWorldUnits: maxContactResidual,
        contactResiduals: Object.freeze(contactResiduals),
        phaseConstraintDiagnostics: Object.freeze(phaseConstraintDiagnostics),
        trackCount: tracks.length
      })
    });
  }

  return Object.freeze({ compile, normalizedBoneKey });
});