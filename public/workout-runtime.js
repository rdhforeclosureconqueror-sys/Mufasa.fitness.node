(function initWorkoutRuntime(globalScope){
  'use strict';
  const global = globalScope || window;
  const state = { running: false, sessionId: null, cameraStream: null, cameraActive: false, fullscreen: false };
  let deps = {};

  function getFn(name){ return typeof deps[name] === 'function' ? deps[name] : null; }
  function requireFn(name){ const fn = getFn(name); if (!fn) throw new Error(`${name} missing`); return fn; }
  function byId(id){ return global.document?.getElementById(id) || null; }
  function setText(id, msg){ const el = byId(id); if (el) el.textContent = msg; return el; }
  function setPoseStatus(msg){ setText('poseStatus', msg); }
  function setVisibleError(msg){
    state.lastError = msg;
    setPoseStatus(msg);
    setText('brainStatus', msg);
    const panel = byId('featureActivationStatus');
    if (panel) panel.textContent = `${panel.textContent || ''}\nworkout runtime error: ${msg}`.trim();
    getFn('onRuntimeError')?.(msg);
  }
  function setEnabled(id, enabled){
    const el = byId(id);
    if (!el) return false;
    el.disabled = !enabled;
    if (enabled) el.removeAttribute('disabled');
    else el.setAttribute('disabled', 'disabled');
    el.style.pointerEvents = enabled ? 'auto' : '';
    return true;
  }
  function showElement(id, visible, display = 'inline-flex'){
    const el = byId(id);
    if (!el) return false;
    el.style.display = visible ? display : 'none';
    return true;
  }
  function ensureRequiredDom(ids){
    const missing = ids.filter((id) => !byId(id));
    if (missing.length) throw new Error(`missing DOM element(s): ${missing.join(', ')}`);
  }
  function getVideoElement(){ return byId('video') || byId('cameraPreview'); }
  function getSessionId(sessionRes){ return sessionRes?.sessionId || sessionRes?.id || sessionRes?.data?.sessionId || sessionRes?.data?.id || sessionRes?.data?.session?.sessionId || null; }
  function markCameraDiagnostics(patch){
    const appRuntimeState = global.__appRuntime?.state?.cameraDiagnostics;
    if (appRuntimeState) Object.assign(appRuntimeState, patch || {});
  }
  function refreshCameraControls(){
    setEnabled('fullscreenCameraBtn', state.cameraActive);
    const fullscreenBtn = byId('fullscreenCameraBtn');
    if (fullscreenBtn) {
      fullscreenBtn.hidden = false;
      fullscreenBtn.style.display = 'inline-flex';
      fullscreenBtn.textContent = state.fullscreen ? 'Exit Camera' : 'Expand Camera';
    }
    showElement('cameraFsActions', state.fullscreen, 'inline-flex');
    showElement('exitCameraBtn', state.fullscreen, 'inline-flex');
    showElement('stopWorkoutFsBtn', state.fullscreen && state.running, 'inline-flex');
    const mobile = byId('cameraMobileControls');
    if (mobile) mobile.style.pointerEvents = state.fullscreen ? 'auto' : '';
  }
  function updateRuntimeState(){
    const el = byId('featureActivationStatus');
    if (!el) return;
    const video = getVideoElement();
    const fsBtn = byId('fullscreenCameraBtn');
    const exitBtn = byId('exitCameraBtn');
    const startBtn = byId('startBtn');
    const videoVisible = Boolean(video && video.getBoundingClientRect && video.getBoundingClientRect().width >= 0);
    const line = [
      `active session id: ${state.sessionId || 'none'}`,
      `active workout state true: ${state.running ? 'yes' : 'no'}`,
      `camera active: ${state.cameraActive ? 'yes' : 'no'}`,
      `camera fullscreen: ${state.fullscreen ? 'yes' : 'no'}`,
      `video preview element: ${video ? video.id : 'missing'}`,
      `video preview visible when active: ${state.cameraActive ? (videoVisible ? 'yes' : 'no') : 'n/a'}`,
      `start workout visible/clickable: ${startBtn && !startBtn.disabled ? 'yes' : 'no'}`,
      `fullscreen camera visible: ${fsBtn && state.cameraActive && !fsBtn.disabled ? 'yes' : 'no'}`,
      `exit fullscreen visible: ${exitBtn && state.fullscreen ? 'yes' : 'no'}`
    ].join('\n');
    if (!el.textContent.includes('active session id:')) el.textContent += `\n${line}`;
    else el.textContent = el.textContent.replace(/active session id:[\s\S]*$/m, line);
  }

  function setBrainStatus(status, reason){
    const brainEl = byId('brainStatus');
    const chipEl = byId('brainChipText');
    if (brainEl) brainEl.textContent = status;
    if (chipEl && reason) chipEl.textContent = reason;
  }

  async function connectCamera(){
    try {
      ensureRequiredDom(['connectBtn', 'startBtn', 'fullscreenCameraBtn', 'video', 'poseStatus', 'workoutHud', 'brainStatus']);
      getFn('beforeConnectCamera')?.();
      markCameraDiagnostics({ buttonClicked: true, getUserMediaCalled: true, lastCameraError: null });
      if (!global.navigator?.mediaDevices?.getUserMedia) throw new Error('mediaDevices.getUserMedia unavailable');
      const stream = await global.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      markCameraDiagnostics({ streamReceived: true });
      state.cameraStream = stream;
      state.cameraActive = true;
      const video = getVideoElement();
      if (!video) throw new Error('video preview element missing (#video)');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      video.style.display = 'block';
      video.style.visibility = 'visible';
      await video.play();
      markCameraDiagnostics({ videoElementReady: true, videoPlaying: true });
      await getFn('afterConnectCamera')?.(stream);
      state.cameraActive = true;
      setEnabled('startBtn', true);
      setEnabled('fullscreenCameraBtn', true);
      refreshCameraControls();
      setPoseStatus('Camera ready. You can start your workout now.');
      updateRuntimeState();
      global.__appRuntime?.updateFeaturePanel?.('camera-connected');
      return stream;
    } catch (err) {
      markCameraDiagnostics({ lastCameraError: err?.message || String(err) });
      getFn('onCameraError')?.(err);
      setVisibleError(`Camera error: ${err?.message || err}`);
      updateRuntimeState();
      throw err;
    }
  }

  function setCameraFullscreen(enabled){
    state.fullscreen = Boolean(enabled);
    global.document?.body?.classList?.toggle('camera-fullscreen', state.fullscreen);
    getFn('onCameraFullscreenChanged')?.(state.fullscreen);
    refreshCameraControls();
    updateRuntimeState();
    return state.fullscreen;
  }

  function stopCamera(){
    if (state.cameraStream) state.cameraStream.getTracks().forEach((t) => t.stop());
    state.cameraStream = null;
    state.cameraActive = false;
    state.fullscreen = false;
    global.document?.body?.classList?.remove('camera-fullscreen');
    refreshCameraControls();
    setEnabled('startBtn', false);
    getFn('onCameraStopped')?.();
    updateRuntimeState();
  }

  async function startWorkout(){
    try {
      ensureRequiredDom(['startBtn', 'video', 'workoutHud', 'hudExerciseName', 'hudSet', 'hudReps', 'hudTempo', 'hudRest', 'hudNextExercise', 'hudCoachCue', 'poseStatus', 'brainStatus']);
      if (!state.cameraActive && !getVideoElement()?.srcObject) throw new Error('connect camera before starting workout');
      await getFn('ensureDetectorReady')?.();
      const detectorReady = getFn('isDetectorReady') ? getFn('isDetectorReady')() : true;
      if (!detectorReady) throw new Error('movement detector is not ready after camera connect');
      if (!state.running) {
        await getFn('prepareWorkoutStart')?.();
        const sessionPayload = getFn('buildSessionPayload') ? getFn('buildSessionPayload')() : { source: 'workout-runtime' };
        const sessionRes = await requireFn('createSession')(sessionPayload);
        getFn('onSessionCreated')?.(sessionRes);
        state.sessionId = getSessionId(sessionRes);
        if (!state.sessionId) throw new Error('session id missing from /api/sessions response');
        state.running = true;
        await getFn('onWorkoutStarted')?.(state.sessionId, sessionRes);
        setPoseStatus(`Workout started: ${state.sessionId}`);
        setBrainStatus('Coach ready.', 'Ma’at 2.0: coach ready');
        refreshCameraControls();
        updateRuntimeState();
        global.__appRuntime?.updateFeaturePanel?.('workout-started');
        return { running: true, sessionId: state.sessionId, sessionRes };
      }
      state.running = false;
      await getFn('onWorkoutStopped')?.(state.sessionId);
      refreshCameraControls();
      updateRuntimeState();
      global.__appRuntime?.updateFeaturePanel?.('workout-stopped');
      return { running: false, sessionId: state.sessionId };
    } catch (err) {
      getFn('onWorkoutStartError')?.(err);
      setVisibleError(`Start workout error: ${err?.message || err}`);
      updateRuntimeState();
      throw err;
    }
  }

  function configureWorkoutRuntime(nextDeps){ deps = { ...deps, ...(nextDeps || {}) }; }

  global.WorkoutRuntime = { configureWorkoutRuntime, startWorkout, connectCamera, stopCamera, setCameraFullscreen, getState: () => ({ ...state }) };
  global.startWorkout = (...args) => global.WorkoutRuntime.startWorkout(...args);
  global.connectCamera = (...args) => global.WorkoutRuntime.connectCamera(...args);
})(typeof window !== 'undefined' ? window : globalThis);
