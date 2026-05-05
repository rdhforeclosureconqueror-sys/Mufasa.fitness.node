(function initWorkoutRuntime(globalScope){
  'use strict';
  const global = globalScope || window;
  const state = { running: false, sessionId: null, cameraStream: null };
  let deps = {};

  function getFn(name){ return typeof deps[name] === 'function' ? deps[name] : null; }
  function requireFn(name){ const fn = getFn(name); if (!fn) throw new Error(`${name} missing`); return fn; }
  function setPoseStatus(msg){ const el = global.document?.getElementById('poseStatus'); if (el) el.textContent = msg; }
  function updateRuntimeState(){
    const el = global.document?.getElementById('featureActivationStatus');
    if (!el) return;
    const line = `active session id: ${state.sessionId || 'none'}\nactive workout state true: ${state.running ? 'yes' : 'no'}`;
    if (!el.textContent.includes('active session id:')) el.textContent += `\n${line}`;
    else el.textContent = el.textContent.replace(/active session id:[^\n]*\nactive workout state true:[^\n]*/m, line);
  }

  async function connectCamera(){
    getFn('beforeConnectCamera')?.();
    try {
      if (!global.navigator?.mediaDevices?.getUserMedia) throw new Error('mediaDevices.getUserMedia unavailable');
      const stream = await global.navigator.mediaDevices.getUserMedia({ video: true });
      state.cameraStream = stream;
      let video = global.document?.getElementById('cameraPreview');
      if (!video && global.document?.createElement) {
        video = global.document.createElement('video');
        video.id = 'cameraPreview';
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        (global.document.getElementById('poseStatus') || global.document.body).insertAdjacentElement('afterend', video);
      }
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      await getFn('afterConnectCamera')?.(stream);
      setPoseStatus('Camera active');
      return stream;
    } catch (err) {
      getFn('onCameraError')?.(err);
      setPoseStatus(`Camera error: ${err?.message || err}`);
      throw err;
    }
  }

  function stopCamera(){ if (state.cameraStream) state.cameraStream.getTracks().forEach((t) => t.stop()); state.cameraStream = null; deps.onCameraStopped?.(); }

  async function startWorkout(){
    getFn('ensureDetectorReady')?.();
    const detectorReady = getFn('isDetectorReady') ? getFn('isDetectorReady')() : true;
    if (!detectorReady) return { running: false, sessionId: null, reason: 'detector-not-ready' };
    if (!state.running) {
      await getFn('prepareWorkoutStart')?.();
      const sessionPayload = getFn('buildSessionPayload') ? getFn('buildSessionPayload')() : { source: 'workout-runtime' };
      const sessionRes = await requireFn('createSession')(sessionPayload);
      state.sessionId = sessionRes?.sessionId || sessionRes?.id || null;
      if (!state.sessionId) throw new Error('session id missing from /api/sessions response');
      state.running = true;
      await getFn('onWorkoutStarted')?.(state.sessionId, sessionRes);
      setPoseStatus(`Workout started: ${state.sessionId}`);
      updateRuntimeState();
      return { running: true, sessionId: state.sessionId, sessionRes };
    }
    state.running = false;
    await getFn('onWorkoutStopped')?.(state.sessionId);
    updateRuntimeState();
    return { running: false, sessionId: state.sessionId };
  }

  function configureWorkoutRuntime(nextDeps){ deps = { ...(nextDeps || {}) }; }

  global.WorkoutRuntime = { configureWorkoutRuntime, startWorkout, connectCamera, stopCamera, getState: () => ({ ...state }) };
  global.startWorkout = (...args) => global.WorkoutRuntime.startWorkout(...args);
  global.connectCamera = (...args) => global.WorkoutRuntime.connectCamera(...args);
})(typeof window !== 'undefined' ? window : globalThis);
