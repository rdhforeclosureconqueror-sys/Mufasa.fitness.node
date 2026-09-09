(function initMotionLabIntelligenceAdapter(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./avatar-motion-intelligence-core')
    : root.PocketPTAvatarMotionIntelligenceCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMotionLabIntelligenceAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function motionLabIntelligenceAdapterFactory(core) {
  'use strict';

  const PHASE4_DEFAULTS = Object.freeze({
    maxGeneratedContactResidualRatio: 0.035,
    maxChainResidualRatio: 0.015,
    solveIterations: 2
  });

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

  function worldPosition(THREE, node) {
    return node.getWorldPosition(new THREE.Vector3());
  }

  function worldQuaternion(THREE, node) {
    return node.getWorldQuaternion(new THREE.Quaternion());
  }

  function setBoneWorldQuaternion(THREE, bone, desiredWorldQuaternion) {
    if (!bone?.parent) {
      bone.quaternion.copy(desiredWorldQuaternion);
      return;
    }
    const parentWorld = worldQuaternion(THREE, bone.parent);
    bone.quaternion.copy(parentWorld.invert().multiply(desiredWorldQuaternion));
  }

  function rotateBoneDirection(THREE, bone, fromStart, fromEnd, toStart, toEnd) {
    const currentDirection = fromEnd.clone().sub(fromStart);
    const desiredDirection = toEnd.clone().sub(toStart);
    if (currentDirection.lengthSq() <= 1e-12 || desiredDirection.lengthSq() <= 1e-12) return false;
    currentDirection.normalize();
    desiredDirection.normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(currentDirection, desiredDirection);
    const currentWorld = worldQuaternion(THREE, bone);
    const desiredWorld = delta.multiply(currentWorld).normalize();
    setBoneWorldQuaternion(THREE, bone, desiredWorld);
    return true;
  }

  function desiredEndForContact(THREE, chain) {
    if (!chain.contactLocalOffset || chain.contactNode === chain.endNode) return chain.anchor.clone();
    const endWorld = worldPosition(THREE, chain.endNode);
    const currentContact = chain.endNode.localToWorld(chain.contactLocalOffset.clone());
    const offsetWorld = currentContact.sub(endWorld);
    return chain.anchor.clone().sub(offsetWorld);
  }

  function solveGeneratedChain(options) {
    const coreApi = options.coreApi;
    const THREE = options.THREE;
    const avatar = options.avatar;
    const chain = options.chain;
    const bodyScale = Number(options.bodyScale);
    const allowedContactResidual = Number.isFinite(bodyScale) && bodyScale > 0
      ? bodyScale * PHASE4_DEFAULTS.maxGeneratedContactResidualRatio
      : Infinity;
    const allowedChainResidual = Number.isFinite(bodyScale) && bodyScale > 0
      ? bodyScale * PHASE4_DEFAULTS.maxChainResidualRatio
      : Infinity;

    let solve = null;
    for (let iteration = 0; iteration < PHASE4_DEFAULTS.solveIterations; iteration += 1) {
      avatar.updateMatrixWorld?.(true);
      const hip = worldPosition(THREE, chain.rootNode);
      const knee = worldPosition(THREE, chain.jointNode);
      const ankle = worldPosition(THREE, chain.endNode);
      const desiredAnkle = desiredEndForContact(THREE, chain);
      solve = coreApi.solveTwoBoneChain(
        toPoint(hip),
        toPoint(knee),
        toPoint(desiredAnkle),
        chain.length1,
        chain.length2,
        { bendHint: toPoint(knee) }
      );
      if (solve.status !== 'SOLVED') {
        return Object.freeze({
          status: 'failed',
          code: 'motion_generated_chain_ik_failed',
          diagnostics: Object.freeze({
            chainId: chain.id,
            contactId: chain.contactId,
            solveStatus: solve.status,
            firstFailure: Object.freeze({ type: 'CHAIN_IK', id: chain.id, status: solve.status })
          })
        });
      }

      const solvedKnee = toVector3(THREE, solve.point);
      if (!rotateBoneDirection(THREE, chain.rootNode, hip, knee, hip, solvedKnee)) {
        return Object.freeze({ status: 'failed', code: 'motion_generated_chain_rotation_failed', diagnostics: Object.freeze({ chainId: chain.id, firstFailure: Object.freeze({ type: 'CHAIN_ROTATION', id: chain.id }) }) });
      }
      avatar.updateMatrixWorld?.(true);

      const kneeAfterRoot = worldPosition(THREE, chain.jointNode);
      const ankleAfterRoot = worldPosition(THREE, chain.endNode);
      if (!rotateBoneDirection(THREE, chain.jointNode, kneeAfterRoot, ankleAfterRoot, kneeAfterRoot, desiredAnkle)) {
        return Object.freeze({ status: 'failed', code: 'motion_generated_chain_rotation_failed', diagnostics: Object.freeze({ chainId: chain.id, firstFailure: Object.freeze({ type: 'CHAIN_ROTATION', id: chain.id }) }) });
      }
    }

    avatar.updateMatrixWorld?.(true);
    const hipFinal = worldPosition(THREE, chain.rootNode);
    const kneeFinal = worldPosition(THREE, chain.jointNode);
    const ankleFinal = worldPosition(THREE, chain.endNode);
    const contactFinal = worldPosition(THREE, chain.contactNode);
    const segment1Residual = Math.abs(coreApi.distance(toPoint(hipFinal), toPoint(kneeFinal)) - chain.length1);
    const segment2Residual = Math.abs(coreApi.distance(toPoint(kneeFinal), toPoint(ankleFinal)) - chain.length2);
    const chainResidual = Math.max(segment1Residual, segment2Residual);
    const contactResidual = coreApi.distance(toPoint(contactFinal), toPoint(chain.anchor));

    if (!Number.isFinite(chainResidual) || chainResidual > allowedChainResidual) {
      return Object.freeze({
        status: 'failed',
        code: 'motion_generated_chain_residual_failed',
        diagnostics: Object.freeze({
          chainId: chain.id,
          contactId: chain.contactId,
          solveStatus: solve?.status || 'UNKNOWN',
          chainResidualWorldUnits: chainResidual,
          contactResidualWorldUnits: contactResidual,
          firstFailure: Object.freeze({ type: 'CHAIN_LENGTH', id: chain.id, residual: chainResidual, maxResidual: allowedChainResidual })
        })
      });
    }

    if (!Number.isFinite(contactResidual) || contactResidual > allowedContactResidual) {
      return Object.freeze({
        status: 'failed',
        code: 'motion_generated_contact_residual_failed',
        diagnostics: Object.freeze({
          chainId: chain.id,
          contactId: chain.contactId,
          solveStatus: solve?.status || 'UNKNOWN',
          chainResidualWorldUnits: chainResidual,
          contactResidualWorldUnits: contactResidual,
          firstFailure: Object.freeze({ type: 'CHAIN_CONTACT_DRIFT', id: chain.id, contact: chain.contactId, drift: contactResidual, maxDrift: allowedContactResidual })
        })
      });
    }

    return Object.freeze({
      status: 'ready',
      diagnostics: Object.freeze({
        chainId: chain.id,
        contactId: chain.contactId,
        solveStatus: solve?.status || 'SOLVED',
        length1: chain.length1,
        length2: chain.length2,
        chainResidualWorldUnits: chainResidual,
        contactResidualWorldUnits: contactResidual,
        firstFailure: null
      })
    });
  }

  function solvePhaseContacts(options = {}) {
    const coreApi = options.core || core;
    const THREE = options.THREE;
    const rootNode = options.rootNode;
    const avatar = options.avatar;
    const bodyScale = Number(options.bodyScale);
    const contacts = Array.isArray(options.contacts) ? options.contacts : [];
    const chains = Array.isArray(options.chains) ? options.chains : [];

    if (!coreApi || !THREE || !rootNode || !avatar) {
      return Object.freeze({ status: 'failed', code: 'motion_intelligence_adapter_unavailable' });
    }
    if (!contacts.length) {
      return Object.freeze({ status: 'ready', rootLocalPosition: rootNode.position.clone(), diagnostics: Object.freeze({ contactCount: 0, correctionStatus: 'NO_CONTACTS', rootTrajectoryPreserved: false, chainCount: 0, chainDiagnostics: Object.freeze([]), firstFailure: null, maxResidualWorldUnits: 0 }) });
    }

    const normalized = contacts.map(contact => Object.freeze({
      id: contact.id,
      current: toPoint(contact.current),
      anchor: toPoint(contact.anchor)
    }));

    const generatedIKOwnsContactSolve = chains.length > 0;
    const maxCorrection = Number.isFinite(bodyScale) && bodyScale > 0
      ? bodyScale * coreApi.DEFAULTS.anchorMaxDriftRatio
      : Infinity;
    let correction = Object.freeze({ status: 'SKIPPED_FOR_GENERATED_IK', rawMagnitude: 0, delta: Object.freeze({ x: 0, y: 0, z: 0 }) });

    if (!generatedIKOwnsContactSolve) {
      correction = coreApi.solveRootAnchorCorrection(normalized, { maxCorrection });
      if (correction.status === 'DIMENSION_MISMATCH') {
        return Object.freeze({ status: 'failed', code: 'motion_contact_dimension_mismatch', diagnostics: Object.freeze({ correctionStatus: correction.status, rootTrajectoryPreserved: false, firstFailure: Object.freeze({ type: 'CONTACT_DIMENSION_MISMATCH' }) }) });
      }

      if (correction.status === 'CORRECTION_REQUIRED') {
        const rootWorld = rootNode.getWorldPosition(new THREE.Vector3()).add(toVector3(THREE, correction.delta));
        const local = rootNode.parent?.worldToLocal ? rootNode.parent.worldToLocal(rootWorld) : rootNode.position.clone().add(toVector3(THREE, correction.delta));
        rootNode.position.copy(local);
        avatar.updateMatrixWorld?.(true);
      }
    }

    const chainDiagnostics = [];
    for (const chain of chains) {
      const solved = solveGeneratedChain({ coreApi, THREE, avatar, bodyScale, chain });
      if (solved.status !== 'ready') {
        return Object.freeze({
          status: 'failed',
          code: solved.code,
          rootLocalPosition: rootNode.position.clone(),
          diagnostics: Object.freeze({
            contactCount: contacts.length,
            correctionStatus: correction.status,
            correctionMagnitudeWorldUnits: Number(correction.rawMagnitude) || 0,
            rootTrajectoryPreserved: generatedIKOwnsContactSolve,
            chainCount: chains.length,
            chainDiagnostics: Object.freeze([...chainDiagnostics, solved.diagnostics]),
            firstFailure: solved.diagnostics?.firstFailure || null
          })
        });
      }
      chainDiagnostics.push(solved.diagnostics);
    }

    avatar.updateMatrixWorld?.(true);
    const refreshed = contacts.map(contact => Object.freeze({
      id: contact.id,
      current: toPoint(contact.node.getWorldPosition(new THREE.Vector3())),
      anchor: toPoint(contact.anchor),
      maxDrift: Number.isFinite(bodyScale) && bodyScale > 0
        ? bodyScale * (chains.length ? PHASE4_DEFAULTS.maxGeneratedContactResidualRatio : coreApi.DEFAULTS.anchorMaxDriftRatio)
        : 0
    }));
    const segmentConstraints = chains.flatMap(chain => {
      const hip = toPoint(worldPosition(THREE, chain.rootNode));
      const knee = toPoint(worldPosition(THREE, chain.jointNode));
      const ankle = toPoint(worldPosition(THREE, chain.endNode));
      return [
        { id: `${chain.id}:proximal`, proximal: hip, distal: knee, targetLength: chain.length1, toleranceRatio: PHASE4_DEFAULTS.maxChainResidualRatio },
        { id: `${chain.id}:distal`, proximal: knee, distal: ankle, targetLength: chain.length2, toleranceRatio: PHASE4_DEFAULTS.maxChainResidualRatio }
      ];
    });
    const validation = coreApi.validateKinematicPose({ contacts: refreshed, segmentConstraints });
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
          rootTrajectoryPreserved: generatedIKOwnsContactSolve,
          chainCount: chains.length,
          chainDiagnostics: Object.freeze(chainDiagnostics),
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
        rootTrajectoryPreserved: generatedIKOwnsContactSolve,
        chainCount: chains.length,
        chainDiagnostics: Object.freeze(chainDiagnostics),
        maxResidualWorldUnits: residual,
        firstFailure: null
      })
    });
  }

  return Object.freeze({ VERSION: '1.2.0-generated-ik-preserves-root-trajectory', PHASE4_DEFAULTS, solvePhaseContacts });
});
