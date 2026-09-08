(function initMotionSpecPlaybackPolicy(root) {
  'use strict';

  const VERSION = '1.0.0-motion-spec-loop-authority';
  let lastSnapshot = Object.freeze({ status: 'idle', loopRequested: null, loopApplied: null, firstFailingBoundary: null });

  function publish(patch) {
    lastSnapshot = Object.freeze({ ...lastSnapshot, ...patch });
  }

  function patchSession(session) {
    if (!session || session.__motionSpecPlaybackPolicyInstalled) return session;
    const originalLoadMotionSpec = session.loadMotionSpec?.bind(session);
    if (!originalLoadMotionSpec || typeof session.setLoop !== 'function') {
      publish({ status: 'failed', firstFailingBoundary: 'session_motion_spec_loop_controls_available' });
      return null;
    }

    session.loadMotionSpec = function playbackPolicyLoadMotionSpec(spec, compiler) {
      const out = originalLoadMotionSpec(spec, compiler);
      if (out?.status !== 'ready') return out;
      const requestedLoop = spec?.loop !== false;
      const loopOut = session.setLoop(requestedLoop);
      if (loopOut?.status !== 'ready' || loopOut.loop !== requestedLoop) {
        publish({ status: 'failed', loopRequested: requestedLoop, loopApplied: loopOut?.loop ?? null, firstFailingBoundary: 'motion_spec_loop_apply' });
        return Object.freeze({ status: 'failed', code: 'motion_spec_loop_apply_failed', diagnostics: Object.freeze({ requestedLoop, appliedLoop: loopOut?.loop ?? null }) });
      }
      publish({ status: 'ready', loopRequested: requestedLoop, loopApplied: loopOut.loop, firstFailingBoundary: null });
      return out;
    };
    session.__motionSpecPlaybackPolicyInstalled = true;
    return session;
  }

  function install(runtime = root.PocketPTDisposableMotionSession) {
    if (!runtime?.createMotionSession) {
      publish({ status: 'failed', firstFailingBoundary: 'runtime_available' });
      return null;
    }
    if (runtime.__motionSpecPlaybackPolicyInstalled) return runtime;
    const originalCreate = runtime.createMotionSession.bind(runtime);
    const wrapped = Object.freeze({
      ...runtime,
      createMotionSession(options) { return patchSession(originalCreate(options)); },
      __motionSpecPlaybackPolicyInstalled: true
    });
    publish({ status: 'installed', firstFailingBoundary: null });
    return wrapped;
  }

  root.PocketPTMotionSpecPlaybackPolicy = Object.freeze({ VERSION, install, patchSession, snapshot: () => lastSnapshot });
})(window);
