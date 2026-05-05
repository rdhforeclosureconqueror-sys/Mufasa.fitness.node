(function initWorkoutRuntime(globalScope){
  'use strict';
  const global = globalScope || window;
  const state = { running: false, sessionId: null, cameraStream: null };
  let deps = {};

  function requireFn(name){ if (typeof deps[name] !== 'function') throw new Error(`${name} missing`); return deps[name]; }

  async function connectCamera(){
    const before = requireFn('beforeConnectCamera');
    const after = requireFn('afterConnectCamera');
    const onErr = requireFn('onCameraError');
    before();
    try {
      if (!global.navigator?.mediaDevices?.getUserMedia) throw new Error('mediaDevices.getUserMedia unavailable');
      const stream = await global.navigator.mediaDevices.getUserMedia({ video: true });
      state.cameraStream = stream;
      await after(stream);
      return stream;
    } catch (err) {
      onErr(err);
      throw err;
    }
  }

  function stopCamera(){
    if (state.cameraStream) state.cameraStream.getTracks().forEach((t) => t.stop());
    state.cameraStream = null;
    deps.onCameraStopped?.();
  }

  async function startWorkout(){
    requireFn('ensureDetectorReady')();
    const detectorReady = requireFn('isDetectorReady')();
    if (!detectorReady) return;
    if (!state.running) {
      await requireFn('prepareWorkoutStart')();
      const sessionPayload = requireFn('buildSessionPayload')();
      const sessionRes = await requireFn('createSession')(sessionPayload);
      state.sessionId = sessionRes?.sessionId || `sess_${Date.now()}`;
      state.running = true;
      await requireFn('onWorkoutStarted')(state.sessionId, sessionRes);
      return { running: true, sessionId: state.sessionId, sessionRes };
    }
    state.running = false;
    await requireFn('onWorkoutStopped')(state.sessionId);
    return { running: false, sessionId: state.sessionId };
  }

  function configureWorkoutRuntime(nextDeps){ deps = { ...(nextDeps || {}) }; }

  global.WorkoutRuntime = { configureWorkoutRuntime, startWorkout, connectCamera, stopCamera, getState: () => ({ ...state }) };
  global.startWorkout = (...args) => global.WorkoutRuntime.startWorkout(...args);
  global.connectCamera = (...args) => global.WorkoutRuntime.connectCamera(...args);
})(typeof window !== 'undefined' ? window : globalThis);
