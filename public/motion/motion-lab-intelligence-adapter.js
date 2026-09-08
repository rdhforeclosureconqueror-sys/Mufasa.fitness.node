(function initMotionLabIntelligenceAdapter(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./avatar-motion-intelligence-core')
    : root.PocketPTAvatarMotionIntelligenceCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMotionLabIntelligenceAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function motionLabIntelligenceAdapterFactory(core) {
  'use strict';

  function toPoint(vector) {
    if (!vector) return null;
    return { x: Number(vector.x), y: Number(vector.y), z: Number(vector.z) };
  }

  function toVector3(THREE, point) {
    return new THREE.Vector3(Number(point?.x) || 0, Number(point?.y) || 0, Number(point?.z) || 0);
  }

  function maxContactResidual(coreApi, contacts) {
    let max = 0;
    for (const contact of contacts || []) {
      const drift = coreApi.distance(contact.current, contact.anchor);
      if (Number.isFinite(drift)) max = Math.max(max, drift);
    }
    return max;
  }

  function solvePhaseContacts(options = {}) {
    const coreApi = options.core || core;
    const THREE = options.THREE;
    const rootNode = options.rootNode;
    const avatar = options.avatar;
    const bodyScale = Number(options.bodyScale);
    const contacts = Array.isArray(options.contacts) ? options.contacts : [];

    if (!coreApi || !THREE || !rootNode || !avatar) {
      return Object.freeze({ status: 'failed', code: 'motion_intelligence_adapter_unavailable' });
    }
    if (!contacts.length) {
      return Object.freeze({ status: 'ready', rootLocalPosition: rootNode.position.clone(), diagnostics: Object.freeze({ contactCount: 0, correctionStatus: 'NO_CONTACTS', firstFailure: null, maxResidualWorldUnits: 0 }) });
    }

    const normalized = contacts.map(contact => Object.freeze({
      id: contact.id,
      current: toPoint(contact.current),
      anchor: toPoint(contact.anchor)
    }));

    const maxCorrection = Number.isFinite(bodyScale) && bodyScale > 0
      ? bodyScale * coreApi.DEFAULTS.anchorMaxDriftRatio
      : Infinity;
    const correction = coreApi.solveRootAnchorCorrection(normalized, { maxCorrection });
    if (correction.status === 'DIMENSION_MISMATCH') {
      return Object.freeze({ status: 'failed', code: 'motion_contact_dimension_mismatch', diagnostics: Object.freeze({ correctionStatus: correction.status, firstFailure: Object.freeze({ type: 'CONTACT_DIMENSION_MISMATCH' }) }) });
    }

    if (correction.status === 'CORRECTION_REQUIRED') {
      const rootWorld = rootNode.getWorldPosition(new THREE.Vector3()).add(toVector3(THREE, correction.delta));
      const local = rootNode.parent?.worldToLocal ? rootNode.parent.worldToLocal(rootWorld) : rootNode.position.clone().add(toVector3(THREE, correction.delta));
      rootNode.position.copy(local);
      avatar.updateMatrixWorld?.(true);
    }

    const refreshed = contacts.map(contact => Object.freeze({
      id: contact.id,
      current: toPoint(contact.node.getWorldPosition(new THREE.Vector3())),
      anchor: toPoint(contact.anchor),
      maxDrift: Number.isFinite(bodyScale) && bodyScale > 0 ? bodyScale * coreApi.DEFAULTS.anchorMaxDriftRatio : 0
    }));
    const validation = coreApi.validateKinematicPose({ contacts: refreshed });
    const residual = maxContactResidual(coreApi, refreshed);

    if (validation.status !== 'PASS') {
      return Object.freeze({
        status: 'failed',
        code: 'motion_kinematic_validation_failed',
        rootLocalPosition: rootNode.position.clone(),
        diagnostics: Object.freeze({
          contactCount: refreshed.length,
          correctionStatus: correction.status,
          correctionMagnitudeWorldUnits: Number(correction.rawMagnitude) || 0,
          maxResidualWorldUnits: residual,
          firstFailure: validation.firstFailure,
          failures: validation.failures
        })
      });
    }

    return Object.freeze({
      status: 'ready',
      rootLocalPosition: rootNode.position.clone(),
      diagnostics: Object.freeze({
        contactCount: refreshed.length,
        correctionStatus: correction.status,
        correctionMagnitudeWorldUnits: Number(correction.rawMagnitude) || 0,
        maxResidualWorldUnits: residual,
        firstFailure: null
      })
    });
  }

  return Object.freeze({ VERSION: '1.0.0-phase2', solvePhaseContacts });
});
