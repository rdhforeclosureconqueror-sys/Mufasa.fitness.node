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

  function markLiveBreakpoint(name, status, extra, error) {
    const tracker = global.__liveWorkoutBreakpoints;
    if (!tracker) return;
    if (status === 'fail') tracker.markFail?.(name, error, extra);
    else if (status === 'pass') tracker.markPass?.(name, extra);
    else tracker.markPending?.(name, extra);
  }

  function setBrainStatus(status, reason){
    const brainEl = byId('brainStatus');
    const chipEl = byId('brainChipText');
    if (brainEl) brainEl.textContent = status;
    if (chipEl && reason) chipEl.textContent = reason;
  }

  async function connectCamera(){
    console.log('[WORKOUT_LIFECYCLE] connectCamera enter');
    markLiveBreakpoint('camera-clicked', 'pass', { source: 'WorkoutRuntime.connectCamera' });
    try {
      ensureRequiredDom(['connectBtn', 'startBtn', 'fullscreenCameraBtn', 'video', 'poseStatus', 'workoutHud', 'brainStatus']);
      getFn('beforeConnectCamera')?.();
      markCameraDiagnostics({ buttonClicked: true, getUserMediaCalled: true, lastCameraError: null });
      if (!global.navigator?.mediaDevices?.getUserMedia) throw new Error('mediaDevices.getUserMedia unavailable');
      const stream = await global.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      markCameraDiagnostics({ streamReceived: true });
      markLiveBreakpoint('camera-stream-received', 'pass', { tracks: typeof stream?.getTracks === 'function' ? stream.getTracks().length : null });
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
      markLiveBreakpoint('video-playing', 'pass', { readyState: video.readyState || null, videoWidth: video.videoWidth || null, videoHeight: video.videoHeight || null });
      await getFn('afterConnectCamera')?.(stream);
      state.cameraActive = true;
      setEnabled('startBtn', true);
      setEnabled('fullscreenCameraBtn', true);
      refreshCameraControls();
      setPoseStatus('Camera ready. You can start your workout now.');
      updateRuntimeState();
      global.__appRuntime?.updateFeaturePanel?.('camera-connected');
      console.log('[WORKOUT_LIFECYCLE] camera ready');
      return stream;
    } catch (err) {
      markCameraDiagnostics({ lastCameraError: err?.message || String(err) });
      const cameraFailName = state.cameraStream ? 'video-playing' : 'camera-stream-received';
      markLiveBreakpoint(cameraFailName, 'fail', { source: 'WorkoutRuntime.connectCamera' }, err);
      getFn('onCameraError')?.(err);
      console.error('[WORKOUT_LIFECYCLE] camera error', err);
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
    console.log('[WORKOUT_LIFECYCLE] startWorkout enter', { running: state.running, sessionId: state.sessionId, cameraActive: state.cameraActive });
    markLiveBreakpoint('workout-start-clicked', 'pass', { running: state.running, cameraActive: state.cameraActive });
    try {
      ensureRequiredDom(['startBtn', 'video', 'workoutHud', 'hudExerciseName', 'hudSet', 'hudReps', 'hudTempo', 'hudRest', 'hudNextExercise', 'hudCoachCue', 'poseStatus', 'brainStatus']);
      if (!state.cameraActive && !getVideoElement()?.srcObject) throw new Error('connect camera before starting workout');
      await getFn('ensureDetectorReady')?.();
      const detectorReady = getFn('isDetectorReady') ? getFn('isDetectorReady')() : true;
      if (!detectorReady) throw new Error('movement detector is not ready after camera connect');
      if (!state.running) {
        await getFn('prepareWorkoutStart')?.();
        const sessionPayload = getFn('buildSessionPayload') ? getFn('buildSessionPayload')() : { source: 'workout-runtime' };
        console.log('[WORKOUT_LIFECYCLE] creating session', sessionPayload);
        const sessionRes = await requireFn('createSession')(sessionPayload);
        getFn('onSessionCreated')?.(sessionRes);
        state.sessionId = getSessionId(sessionRes);
        console.log('[WORKOUT_LIFECYCLE] session created', { sessionId: state.sessionId });
        markLiveBreakpoint('session-created', 'pass', { sessionId: state.sessionId });
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
      console.log('[WORKOUT_LIFECYCLE] stopping workout', { sessionId: state.sessionId });
      await getFn('onWorkoutStopped')?.(state.sessionId);
      refreshCameraControls();
      updateRuntimeState();
      global.__appRuntime?.updateFeaturePanel?.('workout-stopped');
      return { running: false, sessionId: state.sessionId };
    } catch (err) {
      console.error('[WORKOUT_LIFECYCLE] startWorkout error', err);
      markLiveBreakpoint(state.sessionId ? 'pose-loop-started' : 'session-created', 'fail', { source: 'WorkoutRuntime.startWorkout' }, err);
      getFn('onWorkoutStartError')?.(err);
      setVisibleError(`Start workout error: ${err?.message || err}`);
      updateRuntimeState();
      throw err;
    }
  }

  function createSessionCallbackGlue(options = {}) {
    const { refs = {}, deps: glueDeps = {} } = options || {};
    const getProgressionRuntime = () => {
      const runtime = glueDeps.getWorkoutProgressionRuntime?.() || global.WorkoutProgressionRuntime;
      if (!runtime) throw new Error('WorkoutProgressionRuntime missing');
      return runtime;
    };
    const getPlan = () => glueDeps.getActiveWorkoutPlan?.() || getProgressionRuntime().getPlan?.();
    const getState = () => glueDeps.getActiveWorkoutState?.() || getProgressionRuntime().getState?.() || {};
    const getCurrentExerciseMeta = () => glueDeps.getCurrentExerciseMeta?.() || getProgressionRuntime().getCurrentExerciseMeta?.();
    const getCurrentExerciseId = () => glueDeps.getCurrentExerciseId?.() || getCurrentExerciseMeta()?.exerciseId || 'bodyweight_squat';
    return {
      prepareWorkoutStart: async () => {
        if (glueDeps.isDefiningExercise?.()) {
          glueDeps.setDefiningExercise?.(false);
          glueDeps.setBaselineFrames?.([]);
          glueDeps.setCurrentExerciseName?.(null);
          glueDeps.addLog?.('system', 'Cancelled exercise definition to start workout.');
        }
        if (glueDeps.isOhsaMode?.()) {
          glueDeps.setOhsaMode?.(false);
          glueDeps.setOhsaFrontSamples?.([]);
          glueDeps.setOhsaSideSamples?.([]);
          glueDeps.addLog?.('system', 'Cancelled OHSA to start workout.');
        }
        const preparedState = getProgressionRuntime().prepareWorkoutStart();
        glueDeps.setRepState?.({ repCount: 0, totalReps: 0, repPhase: 'up' });
        glueDeps.setFullBodyAcquired?.(false);
        glueDeps.setStepBackPromptCount?.(0);
        glueDeps.setUpperBodyReadyPromptShown?.(false);
        global.RepRuntime?.reset?.({ repCount: 0, totalReps: 0, phase: 'up' });
        global.RepAnalysisRuntime?.reset?.({ repCount: 0, totalReps: 0, phase: 'up' });
        console.log('[WORKOUT_LIFECYCLE] prepared workout start', { workoutId: preparedState.activeWorkoutId, programId: preparedState.activeProgramId });
      },
      buildSessionPayload: () => {
        const plan = getPlan();
        if (!plan?.exercises?.length) throw new Error('selected workout failed to hydrate; choose a workout before starting');
        const workoutState = getState();
        console.log('[WORKOUT_PLAN] session payload hydrated', { workoutId: workoutState.activeWorkoutId || null, exercises: plan.exercises.length });
        return {
          workoutId: workoutState.activeWorkoutId || null,
          programId: workoutState.activeProgramId || null,
          exerciseId: plan.exercises[0]?.exerciseId || null
        };
      },
      createSession: (payload) => {
        const sessionWrite = glueDeps.sessionWrite || global.SessionWrite;
        if (!sessionWrite?.startSession) throw new Error('SessionWrite.startSession missing for POST /api/sessions');
        return sessionWrite.startSession(payload);
      },
      onSessionCreated: (sessionRes) => {
        glueDeps.addLog?.('system', `Session API OK: ${JSON.stringify({ sessionId: sessionRes?.sessionId || sessionRes?.id || null })}`);
        glueDeps.updateActivationStatusPanel?.('session-created');
        glueDeps.updateAuthPropagationStatus?.('session-created');
        global.__appRuntime?.updateFeaturePanel?.('session-created');
      },
      onWorkoutStarted: async (createdSessionId) => {
        const startedState = getProgressionRuntime().startWorkout(createdSessionId);
        glueDeps.setRunning?.(true);
        glueDeps.setSessionId?.(createdSessionId);
        if (refs.startBtn) refs.startBtn.textContent = 'Stop Workout';
        glueDeps.refreshCameraUiState?.();
        glueDeps.addLog?.('system', `Workout started: ${getPlan()?.title || 'Session'}. Session: ${createdSessionId}.`);
        console.log('[WORKOUT_LIFECYCLE] session started', { sessionId: createdSessionId, exerciseId: getCurrentExerciseId() });
        glueDeps.trackPilotEvent?.('workout_started', {
          sessionId: createdSessionId,
          exerciseId: getCurrentExerciseId(),
          scheduledWorkoutId: startedState.activeWorkoutId,
          programId: startedState.activeProgramId
        });
        await glueDeps.getCoachRuntime?.()?.speakWorkoutIntro?.(getCurrentExerciseMeta());
        glueDeps.runPoseLoop?.();
        glueDeps.updateActivationStatusPanel?.('workout-started');
        glueDeps.updateAuthPropagationStatus?.('workout-started');
        global.__appRuntime?.updateFeaturePanel?.('workout-started');
      },
      onWorkoutStartError: (err) => {
        const reason = err?.message || String(err || 'unknown_error');
        glueDeps.addLog?.('system', `Workout start failed: ${reason}`);
        glueDeps.getCoachRuntime?.()?.setVoiceUnavailable?.(`workout_start_failed: ${reason}`, 'workout-start-error');
        glueDeps.updateActivationStatusPanel?.('workout-start-error');
        glueDeps.updateAuthPropagationStatus?.('workout-start-error');
        global.__appRuntime?.updateFeaturePanel?.('workout-start-error');
      },
      onWorkoutStopped: async () => {
        if (refs.startBtn) refs.startBtn.textContent = 'Start Workout';
        glueDeps.setRunning?.(false);
        getProgressionRuntime().pauseWorkout();
        glueDeps.refreshCameraUiState?.();
        const animId = glueDeps.getAnimId?.();
        if (animId?.stop) animId.stop();
        else if (animId) global.cancelAnimationFrame?.(animId);
        const ctx = refs.canvasEl?.getContext?.('2d') || refs.ctx;
        if (ctx && refs.canvasEl) ctx.clearRect(0, 0, refs.canvasEl.width, refs.canvasEl.height);
        glueDeps.setPersonLayerSuppressed?.(false);
        glueDeps.setAvatar3dCanvasVisibility?.(false);
        glueDeps.setLastRenderMode?.('camera');
        glueDeps.addLog?.('system', 'Workout stopped. Reconnect camera and press Start Workout to resume.');
        console.log('[WORKOUT_LIFECYCLE] workout stopped', { sessionId: glueDeps.getSessionId?.() });
      }
    };
  }

  function configureWorkoutRuntime(nextDeps){ deps = { ...deps, ...(nextDeps || {}) }; }

  global.WorkoutRuntime = { configureWorkoutRuntime, createSessionCallbackGlue, startWorkout, connectCamera, stopCamera, setCameraFullscreen, getState: () => ({ ...state }) };
  global.startWorkout = (...args) => global.WorkoutRuntime.startWorkout(...args);
  global.connectCamera = (...args) => global.WorkoutRuntime.connectCamera(...args);
})(typeof window !== 'undefined' ? window : globalThis);
