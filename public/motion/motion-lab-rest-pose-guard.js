(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMotionLabRestPoseGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (globalScope) {
  'use strict';

  function cloneTransform(object) {
    return {
      position: object.position?.clone?.() || null,
      quaternion: object.quaternion?.clone?.() || null,
      scale: object.scale?.clone?.() || null
    };
  }

  function capture(root) {
    if (!root?.traverse) return null;
    const nodes = new Map();
    root.traverse(object => {
      if (!object?.isBone && object !== root) return;
      nodes.set(object.uuid || object.name, { object, transform: cloneTransform(object) });
    });
    const snapshot = { root, nodes, capturedAt: Date.now(), boneCount: [...nodes.values()].filter(entry => entry.object?.isBone).length };
    return snapshot;
  }

  function restore(snapshot) {
    if (!snapshot?.nodes) return false;
    for (const { object, transform } of snapshot.nodes.values()) {
      if (!object || !transform) continue;
      if (transform.position && object.position?.copy) object.position.copy(transform.position);
      if (transform.quaternion && object.quaternion?.copy) object.quaternion.copy(transform.quaternion);
      if (transform.scale && object.scale?.copy) object.scale.copy(transform.scale);
    }
    snapshot.root?.updateMatrixWorld?.(true);
    return true;
  }

  function install(runtime = globalScope.PocketPTDisposableMotionSession) {
    if (!runtime?.createMotionSession || runtime.__restPoseGuardInstalled) return runtime;
    const originalCreate = runtime.createMotionSession.bind(runtime);
    runtime.createMotionSession = function guardedCreateMotionSession(options) {
      const session = originalCreate(options);
      let snapshot = null;
      let generation = 0;
      const originalLoadAvatar = session.loadAvatar?.bind(session);
      const originalLoadMotionSpec = session.loadMotionSpec?.bind(session);
      const originalUnloadAvatar = session.unloadAvatar?.bind(session);

      if (originalLoadAvatar) session.loadAvatar = async function guardedLoadAvatar(profile) {
        const out = await originalLoadAvatar(profile);
        snapshot = null;
        if (out?.status === 'ready' && session.avatar) {
          session.stop?.();
          session.mixer?.stopAllAction?.();
          snapshot = capture(session.avatar);
          generation += 1;
          session.restPoseDiagnostics = Object.freeze({ status: snapshot ? 'REST_POSE_CAPTURED' : 'REST_POSE_CAPTURE_FAILED', generation, boneCount: snapshot?.boneCount || 0, capturedAt: snapshot?.capturedAt || null });
          session.diagnostic?.('rest_pose_captured', session.restPoseDiagnostics);
        }
        return out;
      };

      if (originalLoadMotionSpec) session.loadMotionSpec = function guardedLoadMotionSpec(spec, compiler) {
        if (!snapshot) {
          session.restPoseDiagnostics = Object.freeze({ status: 'REST_POSE_MISSING', generation, boneCount: 0 });
          session.diagnostic?.('rest_pose_missing', session.restPoseDiagnostics);
          return session.failure?.('rest_pose_missing') || { status: 'failed', code: 'rest_pose_missing' };
        }
        session.stop?.();
        session.mixer?.stopAllAction?.();
        restore(snapshot);
        session.restPoseDiagnostics = Object.freeze({ status: 'REST_POSE_RESTORED_FOR_COMPILE', generation, boneCount: snapshot.boneCount, capturedAt: snapshot.capturedAt });
        session.diagnostic?.('rest_pose_restored_for_compile', session.restPoseDiagnostics);
        const out = originalLoadMotionSpec(spec, compiler);
        restore(snapshot);
        return out;
      };

      if (originalUnloadAvatar) session.unloadAvatar = function guardedUnloadAvatar() {
        snapshot = null;
        session.restPoseDiagnostics = Object.freeze({ status: 'REST_POSE_CLEARED', generation, boneCount: 0 });
        return originalUnloadAvatar();
      };

      session.captureRestPose = function captureRestPoseNow() {
        if (!session.avatar) return { status: 'failed', code: 'avatar_required' };
        session.stop?.();
        session.mixer?.stopAllAction?.();
        snapshot = capture(session.avatar);
        generation += 1;
        session.restPoseDiagnostics = Object.freeze({ status: snapshot ? 'REST_POSE_CAPTURED' : 'REST_POSE_CAPTURE_FAILED', generation, boneCount: snapshot?.boneCount || 0, capturedAt: snapshot?.capturedAt || null });
        return session.restPoseDiagnostics;
      };
      session.restoreRestPose = function restoreRestPoseNow() { return restore(snapshot); };
      session.getRestPoseDiagnostics = function getRestPoseDiagnostics() { return session.restPoseDiagnostics || { status: 'REST_POSE_NOT_CAPTURED', generation, boneCount: 0 }; };
      return session;
    };
    Object.defineProperty(runtime, '__restPoseGuardInstalled', { value: true });
    return runtime;
  }

  return Object.freeze({ capture, restore, install });
});
