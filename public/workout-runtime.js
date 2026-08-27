(function initWorkoutRuntime(globalScope){
  'use strict';
  const global = globalScope || window;
  if (global.__POCKET_PT_WORKOUT_RUNTIME_INITIALIZED) {
    if (new URLSearchParams(global.location?.search || '').get('debugWorkoutPerformance') === '1') console.info('[WORKOUT_PERF] duplicate workout runtime initialization ignored');
    return;
  }
  global.__POCKET_PT_WORKOUT_RUNTIME_INITIALIZED = true;
  const state = { running: false, sessionId: null, cameraStream: null, cameraActive: false, fullscreen: false };
  let deps = {};
  let actionPending = false;
  let cameraConnectPending = null;
  const focusDebug = (()=>{try{return new URLSearchParams(global.location?.search||'').get('debugWorkoutFocus')==='1';}catch(_){return false;}})();
  function focusDiagnostic(event){if(focusDebug)console.info('[WORKOUT_FOCUS]',event);}

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

  function markStartTrace(name, status = 'pass', extra = {}, error) {
    markLiveBreakpoint(name, status, { source: 'WorkoutRuntime.startWorkout', ...(extra || {}) }, error);
    global.__appRuntime?.updateFeaturePanel?.(`start-trace:${name}:${status}`);
  }

  function normalizeSessionError(err, requestDetails = {}) {
    const payload = err?.payload || err?.response || null;
    const backendMessage = payload?.error?.message || payload?.message || (typeof payload?.error === 'string' ? payload.error : null);
    const backendCode = payload?.error?.code || payload?.code || err?.code || null;
    const status = err?.status || err?.statusCode || err?.responseStatus || null;
    const message = backendMessage || err?.message || String(err || 'session_create_failed');
    return {
      status,
      code: backendCode,
      message,
      requestUrl: requestDetails.requestUrl || requestDetails.url || null,
      requestBody: requestDetails.requestBody || null
    };
  }

  function normalizePoseRuntimeError(err) {
    const message = err?.message || String(err || 'pose_runtime_failed');
    let code = 'model load failed';
    if (/window\.tf|tensorflow|tfjs|tf is not defined/i.test(message)) code = 'TensorFlow missing';
    else if (/poseDetection|MoveNet|movenet|SupportedModels/i.test(message)) code = 'MoveNet missing';
    else if (/createDetector|detector/i.test(message)) code = 'detector create failed';
    return { code, message };
  }

  function setBrainStatus(status, reason){
    const brainEl = byId('brainStatus');
    const chipEl = byId('brainChipText');
    if (brainEl) brainEl.textContent = status;
    if (chipEl && reason) chipEl.textContent = reason;
  }

  async function connectCamera(){
    const trace = global.__POSE_BOOTSTRAP_TRACE || (global.__POSE_BOOTSTRAP_TRACE = {});
    trace.connectClickReceived = true;
    trace.connectHandlerEntryCount = (trace.connectHandlerEntryCount || 0) + 1;
    if (state.cameraActive && state.cameraStream) return state.cameraStream;
    if (cameraConnectPending) return cameraConnectPending;
    cameraConnectPending = connectCameraOnce();
    try { return await cameraConnectPending; } finally { cameraConnectPending = null; }
  }
  function cameraErrorMessage(error) {
    if (global.isSecureContext === false) return 'Camera access requires HTTPS.';
    if (!global.navigator?.mediaDevices?.getUserMedia) return 'This browser does not support camera access.';
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Camera permission was denied. Allow camera access in browser settings and retry.';
    if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') return 'No camera was found on this device.';
    if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') return 'The camera is already in use or could not be read. Close other camera apps and retry.';
    if (error?.code === 'VIDEO_PLAYBACK_FAILED') return 'Camera video playback failed. Tap Connect Camera to retry.';
    return `Camera could not start${error?.message ? `: ${error.message}` : '.'}`;
  }
  async function connectCameraOnce(){
    console.log('[WORKOUT_LIFECYCLE] connectCamera enter');
    markLiveBreakpoint('camera-clicked', 'pass', { source: 'WorkoutRuntime.connectCamera' });
    let videoPlayingMarked = false;
    try {
      ensureRequiredDom(['connectBtn', 'startBtn', 'fullscreenCameraBtn', 'video', 'poseStatus', 'workoutHud', 'brainStatus']);
      getFn('beforeConnectCamera')?.();
      markCameraDiagnostics({ buttonClicked: true, getUserMediaCalled: false, lastCameraError: null });
      if (global.isSecureContext === false) throw Object.assign(new Error('insecure_context'), { code: 'INSECURE_CONTEXT' });
      if (!global.navigator?.mediaDevices?.getUserMedia) throw Object.assign(new Error('mediaDevices.getUserMedia unavailable'), { name: 'NotSupportedError' });
      markCameraDiagnostics({ getUserMediaCalled: true });
      const trace = global.__POSE_BOOTSTRAP_TRACE || {};
      trace.getUserMediaRequested = true;
      let stream;
      try {
        stream = await global.navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        trace.getUserMediaResolved = true;
      } catch (error) {
        trace.getUserMediaRejected = true; trace.getUserMediaErrorName = error?.name || 'Error'; trace.getUserMediaErrorMessage = error?.message || String(error);
        const boundary = /NotAllowed|Security/i.test(error?.name || '') ? 'CAMERA_PERMISSION_DENIED' : 'GET_USER_MEDIA_REJECTED';
        global.__recordPoseBootstrapFailure?.(boundary, error);
        throw error;
      }
      markCameraDiagnostics({ streamReceived: true });
      markLiveBreakpoint('camera-stream-received', 'pass', { tracks: typeof stream?.getTracks === 'function' ? stream.getTracks().length : null });
      state.cameraStream = stream;
      if (global.__workoutPerformance) global.__workoutPerformance.cameraStreams += 1;
      state.cameraActive = true;
      const video = getVideoElement();
      if (!video) throw new Error('video preview element missing (#video)');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      const videoTracks = stream.getVideoTracks?.() || [];
      Object.assign(trace, { mediaStreamId: stream.id || '', videoTrackCount: videoTracks.length, videoTrackReadyState: videoTracks[0]?.readyState || '', videoTrackEnabled: videoTracks[0]?.enabled, videoTrackMuted: videoTracks[0]?.muted, productionVideoFound: true, productionVideoElementId: video.id || '', productionVideoDomConnected: Boolean(video.isConnected), srcObjectAssigned: true, srcObjectMatchesStream: video.srcObject === stream });
      for (const [eventName, field] of [['loadedmetadata','loadedmetadataReceived'],['loadeddata','loadeddataReceived'],['canplay','canplayReceived'],['playing','playingReceived']]) video.addEventListener?.(eventName, () => { trace[field] = true; }, { once: true });
      video.style.display = 'block';
      video.style.visibility = 'visible';
      trace.videoPlayRequested = true;
      try { await video.play(); trace.videoPlayResolved = true; } catch (error) { trace.videoPlayRejected = true; trace.videoPlayError = error?.message || String(error); global.__recordPoseBootstrapFailure?.('VIDEO_PLAY_REJECTED', error); error.code = 'VIDEO_PLAYBACK_FAILED'; throw error; }
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise((resolve, reject) => { const timeout = global.setTimeout(() => reject(new Error('video metadata did not provide non-zero dimensions')), 5000); const ready = () => { if (video.videoWidth && video.videoHeight) { global.clearTimeout(timeout); resolve(); } }; video.addEventListener?.('loadedmetadata', ready, { once: true }); video.addEventListener?.('loadeddata', ready, { once: true }); ready(); }).catch((error) => { global.__recordPoseBootstrapFailure?.('VIDEO_METADATA_NOT_READY', error); throw error; });
      }
      trace.videoReadyState = video.readyState; trace.videoWidth = video.videoWidth; trace.videoHeight = video.videoHeight;
      markCameraDiagnostics({ videoElementReady: true, videoPlaying: true });
      markLiveBreakpoint('video-playing', 'pass', { readyState: video.readyState || null, videoWidth: video.videoWidth || null, videoHeight: video.videoHeight || null });
      videoPlayingMarked = true;
      try { await getFn('afterConnectCamera')?.(stream); }
      catch (optionalError) { console.warn('[WORKOUT_LIFECYCLE] optional pose/avatar initialization failed; camera self-view preserved', optionalError); setPoseStatus(`Camera ready. Movement tracking unavailable: ${optionalError?.message || optionalError}`); getFn('onOptionalTrackingError')?.(optionalError); }
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
      if (!videoPlayingMarked) {
        const cameraFailName = state.cameraStream ? 'video-playing' : 'camera-stream-received';
        markLiveBreakpoint(cameraFailName, 'fail', { source: 'WorkoutRuntime.connectCamera' }, err);
      }
      if (!videoPlayingMarked && state.cameraStream) { state.cameraStream.getTracks?.().forEach(track => track.stop()); state.cameraStream = null; state.cameraActive = false; const video = getVideoElement(); if (video) video.srcObject = null; }
      getFn('onCameraError')?.(err);
      console.error('[WORKOUT_LIFECYCLE] camera error', err);
      setVisibleError(cameraErrorMessage(err));
      updateRuntimeState();
      throw err;
    }
  }

  function setWorkoutFocusMode(enabled, reason = 'manual') {
    state.focusMode = Boolean(enabled);
    global.document?.body?.classList?.toggle('workout-focus', state.focusMode);
    const root = byId('appShell');
    root?.classList?.toggle?.('workout-focus', state.focusMode);
    if (root?.dataset) root.dataset.workoutFocus = state.focusMode ? 'active' : 'inactive';
    setText('hudFormStatus', state.focusMode ? 'Focus mode active' : 'Coach ready');
    global.__phase30WorkoutFocus = { enabled: state.focusMode, reason, at: new Date().toISOString() };
    if(state.focusMode)focusDiagnostic('focus mode entered');
  }

  function setCameraFullscreen(enabled){
    state.fullscreen = Boolean(enabled);
    focusDiagnostic(state.fullscreen?'expanded view entered':'expanded view exited');
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
    setWorkoutFocusMode(false, 'camera-stopped');
    refreshCameraControls();
    setEnabled('startBtn', true);
    getFn('onCameraStopped')?.();
    updateRuntimeState();
  }

  async function startWorkout(){
    if(actionPending){focusDiagnostic('duplicate control suppressed');return {running:state.running,sessionId:state.sessionId,suppressed:true};}
    actionPending=true;
    console.log('[WORKOUT_LIFECYCLE] startWorkout enter', { running: state.running, sessionId: state.sessionId, cameraActive: state.cameraActive });
    markLiveBreakpoint('workout-start-clicked', 'pass', { running: state.running, cameraActive: state.cameraActive });
    markStartTrace('workoutStartClicked', 'pass', { running: state.running, cameraActive: state.cameraActive });
    markStartTrace('workoutStartHandlerEntered', 'pass', { running: state.running, sessionId: state.sessionId || null });
    try {
      ensureRequiredDom(['startBtn', 'video', 'workoutHud', 'hudExerciseName', 'hudSet', 'hudReps', 'hudTempo', 'hudRest', 'hudNextExercise', 'hudCoachCue', 'poseStatus', 'brainStatus']);
      if (!state.running) {
        await getFn('prepareWorkoutStart')?.();
        // Enter focus before network, camera, or optional pose work can delay startup.
        setWorkoutFocusMode(true, 'workout-preparing');
        markStartTrace('selectedWorkoutResolved', 'pass', { prepared: true });
        const sessionPayload = getFn('buildSessionPayload') ? getFn('buildSessionPayload')() : { source: 'workout-runtime' };
        markStartTrace('fallbackWorkoutApplied', 'pass', { applied: sessionPayload?.source === 'pilot_default_workout' || sessionPayload?.programId === 'pilot-fallback', workoutId: sessionPayload.workoutId || null, exerciseId: sessionPayload.exerciseId || null });
        markStartTrace('sessionPayloadBuilt', 'pass', { workoutId: sessionPayload?.workoutId || null, programId: sessionPayload?.programId || null, exerciseId: sessionPayload?.exerciseId || null, selectedWorkout: sessionPayload?.selectedWorkout || null });
        const requestDetails = { requestUrl: getFn('getSessionCreateUrl')?.() || null, requestBody: sessionPayload };
        console.log('[WORKOUT_LIFECYCLE] creating session', sessionPayload);
        markStartTrace('sessionCreateAttempted', 'pass', requestDetails);
        let sessionRes;
        try {
          sessionRes = await requireFn('createSession')(sessionPayload);
        } catch (sessionErr) {
          const failure = normalizeSessionError(sessionErr, requestDetails);
          markStartTrace('sessionCreateFailed', 'fail', failure, sessionErr);
          setVisibleError(`Session create failed (${failure.status || 'no-status'}): ${failure.code || 'no-code'} ${failure.message}. URL: ${failure.requestUrl || 'unknown'}`);
          throw sessionErr;
        }
        const sessionId = getSessionId(sessionRes);
        markStartTrace('sessionCreateSucceeded', 'pass', { sessionId, response: sessionRes || null, requestUrl: requestDetails.requestUrl });
        getFn('onSessionCreated')?.(sessionRes);
        state.sessionId = sessionId;
        console.log('[WORKOUT_LIFECYCLE] session created', { sessionId: state.sessionId });
        markLiveBreakpoint('session-created', 'pass', { sessionId: state.sessionId });
        if (!state.sessionId) throw new Error('session id missing from /api/sessions response');
        state.running = true;
        markStartTrace('liveModeEntered', 'pass', { sessionId: state.sessionId });
        markLiveBreakpoint('live-mode-entered', 'pass', { sessionId: state.sessionId });
        if ((state.cameraActive || getVideoElement()?.srcObject) && getFn('isPoseProcessingEnabled')?.()) {
          markStartTrace('poseRuntimeLoadAttempted', 'pass', { sessionId: state.sessionId });
          try {
            await getFn('ensureDetectorReady')?.();
            markStartTrace('poseRuntimeLoaded', 'pass', { detectorReady: Boolean(getFn('isDetectorReady')?.()) });
          } catch (poseErr) {
            markStartTrace('poseRuntimeFailed', 'fail', normalizePoseRuntimeError(poseErr), poseErr);
            setPoseStatus(`Camera/form unavailable: ${poseErr?.message || poseErr}. Timer continues.`);
          }
        } else {
          setPoseStatus('Camera not connected. Timer is available.');
        }
        await getFn('onWorkoutStarted')?.(state.sessionId, sessionRes);
        if (state.cameraActive) setPoseStatus(`Workout started: ${state.sessionId}`);
        setBrainStatus('Coach ready.', 'Ma’at 2.0: coach ready');
        setText('hudFormStatus', 'Coach ready');
        setWorkoutFocusMode(true, 'workout-started');
        refreshCameraControls();
        updateRuntimeState();
        global.__appRuntime?.updateFeaturePanel?.('workout-started');
        return { running: true, sessionId: state.sessionId, sessionRes };
      }
      state.running = false;
      console.log('[WORKOUT_LIFECYCLE] stopping workout', { sessionId: state.sessionId });
      await getFn('onWorkoutStopped')?.(state.sessionId);
      setWorkoutFocusMode(false, 'workout-stopped');
      refreshCameraControls();
      updateRuntimeState();
      global.__appRuntime?.updateFeaturePanel?.('workout-stopped');
      return { running: false, sessionId: state.sessionId };
    } catch (err) {
      console.error('[WORKOUT_LIFECYCLE] startWorkout error', err);
      const failedMilestone = state.sessionId ? 'pose-loop-started' : 'session-created';
      markLiveBreakpoint(failedMilestone, 'fail', { source: 'WorkoutRuntime.startWorkout' }, err);
      getFn('onWorkoutStartError')?.(err);
      if (!state.lastError) setVisibleError(`Start workout error: ${err?.message || err}`);
      updateRuntimeState();
      throw err;
    } finally { actionPending=false; }
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
        global.__liveWorkoutBreakpoints?.markPass?.('guidancePromptStarted', { source: 'WorkoutRuntime.onWorkoutStarted', sessionId: createdSessionId });
        await glueDeps.getCoachRuntime?.()?.speakWorkoutIntro?.(getCurrentExerciseMeta());
        if (glueDeps.isPoseProcessingEnabled?.()) {
          global.__liveWorkoutBreakpoints?.markPass?.('poseLoopStarted', { source: 'WorkoutRuntime.onWorkoutStarted', sessionId: createdSessionId });
          glueDeps.runPoseLoop?.();
        }
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


  // Phase 24: minimal pilot form-rule engine for default workout movements only.
  function installPilotFormRuleEngine(){
    if (global.__PILOT_FORM_RULE_ENGINE?.version === 'phase24') return global.__PILOT_FORM_RULE_ENGINE;

    const KEYPOINT_INDEX_BY_NAME = Object.freeze({
      nose: 0, left_eye: 1, right_eye: 2, left_ear: 3, right_ear: 4,
      left_shoulder: 5, right_shoulder: 6, left_elbow: 7, right_elbow: 8,
      left_wrist: 9, right_wrist: 10, left_hip: 11, right_hip: 12,
      left_knee: 13, right_knee: 14, left_ankle: 15, right_ankle: 16
    });
    const MIN_SCORE = 0.35;
    const CONFIDENCE_FEEDBACK = 'I need to see your hips, knees, and ankles.';
    const PILOT_PATTERN_BY_EXERCISE = Object.freeze({
      'bodyweight squat': 'squat',
      'bodyweight_squat': 'squat',
      'bodyweight-squat': 'squat',
      squat: 'squat',
      'push-up': 'pushup',
      'push up': 'pushup',
      push_up: 'pushup',
      pushup: 'pushup',
      lunge: 'lunge'
    });
    const phaseState = { pattern: null, phase: null, sawBottom: false, bottomGood: false, warnings: [], startedAtTop: false };

    function normalizeName(value){ return String(value || '').trim().toLowerCase().replace(/[–—]/g, '-'); }
    function mapExerciseToMovementPattern(exercise = {}){
      const candidates = [exercise.movementPattern, exercise.pattern, exercise.exerciseId, exercise.id, exercise.name, exercise.exerciseName]
        .map(normalizeName)
        .filter(Boolean);
      for (const candidate of candidates) {
        if (PILOT_PATTERN_BY_EXERCISE[candidate]) return PILOT_PATTERN_BY_EXERCISE[candidate];
        const slug = candidate.replace(/\s+/g, '_');
        if (PILOT_PATTERN_BY_EXERCISE[slug]) return PILOT_PATTERN_BY_EXERCISE[slug];
      }
      return null;
    }
    function getKeypoint(source, name){
      const keypoints = Array.isArray(source) ? source : source?.keypoints;
      if (!Array.isArray(keypoints)) return null;
      return keypoints.find((kp) => (kp?.name || kp?.part) === name) || keypoints[KEYPOINT_INDEX_BY_NAME[name]] || null;
    }
    function score(kp){ return Number(kp?.score || 0); }
    function hasXY(kp){ return Number.isFinite(Number(kp?.x)) && Number.isFinite(Number(kp?.y)); }
    function reliable(kp){ return Boolean(kp && hasXY(kp) && score(kp) >= MIN_SCORE); }
    function avg(values){ const nums = values.filter(Number.isFinite); return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null; }
    function midpoint(a,b){ return reliable(a) && reliable(b) ? { x:(a.x+b.x)/2, y:(a.y+b.y)/2, score: Math.min(score(a), score(b)) } : null; }
    function angle(a,b,c){
      if (!hasXY(a) || !hasXY(b) || !hasXY(c)) return null;
      const abx = a.x - b.x, aby = a.y - b.y, cbx = c.x - b.x, cby = c.y - b.y;
      const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
      if (!mag) return null;
      return Math.acos(Math.max(-1, Math.min(1, (abx*cbx + aby*cby) / mag))) * 180 / Math.PI;
    }
    function collect(source, names){
      const points = {};
      for (const name of names) points[name] = getKeypoint(source, name);
      return points;
    }
    function confidenceStatus(points, requiredNames){
      const missing = requiredNames.filter((name) => !reliable(points[name]));
      return {
        ok: missing.length === 0,
        status: missing.length ? 'keypoint confidence too low' : 'keypoint confidence ok',
        missing,
        minScore: Math.min(...requiredNames.map((name) => score(points[name])))
      };
    }
    function baseResult(pattern, phase, confidence, extra = {}){
      const confidenceOk = Boolean(confidence?.ok);
      const depthStatus = confidenceOk ? (extra.depthStatus || extra.status || 'status unknown') : (extra.depthStatus || 'keypoint confidence too low');
      const feedback = confidenceOk ? (extra.feedback || 'Tracking form.') : (extra.confidenceFeedback || CONFIDENCE_FEEDBACK);
      return {
        movementPattern: pattern,
        pattern,
        phase,
        repPhase: phase,
        depthStatus,
        status: depthStatus,
        confidenceStatus: confidence?.status || 'keypoint confidence too low',
        keypointConfidenceOk: confidenceOk,
        missingKeypoints: confidence?.missing || [],
        feedback,
        formWarning: confidenceOk ? (extra.formWarning || null) : feedback,
        needsLowerBody: !confidenceOk && (confidence?.missing || []).some((name) => /hip|knee|ankle/.test(name)),
        goodRepCandidate: Boolean(confidenceOk && extra.goodRepCandidate),
        goodForm: Boolean(confidenceOk && extra.goodRepCandidate),
        repDetected: false,
        goodRep: false,
        metrics: extra.metrics || {}
      };
    }
    function analyzeSquat(pose){
      const names = ['left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle','left_shoulder','right_shoulder'];
      const points = collect(pose, names);
      const confidence = confidenceStatus(points, names);
      if (!confidence.ok) return baseResult('squat', 'standing', confidence, { depthStatus: 'lower body not visible' });
      const hipY = avg([points.left_hip.y, points.right_hip.y]);
      const kneeY = avg([points.left_knee.y, points.right_knee.y]);
      const ankleY = avg([points.left_ankle.y, points.right_ankle.y]);
      const lowerLegSpan = Math.max(1, Math.abs((ankleY ?? 0) - (kneeY ?? 0)));
      const tolerance = Math.max(8, lowerLegSpan * 0.08);
      const hipAtOrBelowKnee = Number.isFinite(hipY) && Number.isFinite(kneeY) && hipY >= kneeY - tolerance;
      const kneeAngle = avg([
        angle(points.left_hip, points.left_knee, points.left_ankle),
        angle(points.right_hip, points.right_knee, points.right_ankle)
      ]) ?? 180;
      const depthScore = Math.max(0, Math.min(1, (180 - kneeAngle) / 90));
      const depthGood = hipAtOrBelowKnee || kneeAngle <= 115;
      const phase = depthGood ? 'bottom' : (depthScore > 0.18 || (Number.isFinite(hipY) && Number.isFinite(kneeY) && hipY > kneeY - lowerLegSpan * 0.7) ? 'descending' : 'standing');
      return baseResult('squat', phase, confidence, {
        depthStatus: depthGood ? 'depth good' : 'depth high',
        feedback: depthGood ? 'Depth good.' : 'Go slightly deeper while keeping control.',
        formWarning: depthGood ? null : 'Go slightly deeper while keeping control.',
        goodRepCandidate: depthGood,
        metrics: { hipY, kneeY, ankleY, kneeAngle, depthScore, hipAtOrBelowKnee }
      });
    }
    function analyzePushup(pose){
      const names = ['left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip'];
      const points = collect(pose, names);
      const confidence = confidenceStatus(points, names);
      if (!confidence.ok) return baseResult('pushup', 'top', confidence, { confidenceFeedback: 'Move so I can see your shoulders, elbows, wrists, and hips.', feedback: 'Move so I can see your shoulders, elbows, wrists, and hips.' });
      const elbowAngle = avg([
        angle(points.left_shoulder, points.left_elbow, points.left_wrist),
        angle(points.right_shoulder, points.right_elbow, points.right_wrist)
      ]) ?? 180;
      const shoulder = midpoint(points.left_shoulder, points.right_shoulder);
      const hip = midpoint(points.left_hip, points.right_hip);
      const bodySpan = Math.max(1, Math.abs((hip?.x ?? 0) - (shoulder?.x ?? 0)) + Math.abs((hip?.y ?? 0) - (shoulder?.y ?? 0)));
      const hipSagging = reliable(shoulder) && reliable(hip) && hip.y - shoulder.y > Math.max(30, bodySpan * 0.32);
      const bottom = elbowAngle <= 105;
      const top = elbowAngle >= 150;
      const phase = bottom ? 'bottom' : (top ? 'top' : 'descending');
      const good = bottom && !hipSagging;
      return baseResult('pushup', phase, confidence, {
        depthStatus: bottom ? 'depth good' : (top ? 'top' : 'depth high'),
        feedback: hipSagging ? 'Brace your body line; hips are sagging.' : (bottom ? 'Depth good.' : 'Bend elbows under control.'),
        formWarning: hipSagging ? 'hips sagging' : (bottom ? null : 'elbow bend/depth needs work'),
        goodRepCandidate: good,
        metrics: { elbowAngle, hipSagging }
      });
    }
    function analyzeLunge(pose){
      const names = ['left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'];
      const points = collect(pose, names);
      const confidence = confidenceStatus(points, names);
      if (!confidence.ok) return baseResult('lunge', 'standing/split stance', confidence, { depthStatus: 'lower body not visible' });
      const leftKneeAngle = angle(points.left_hip, points.left_knee, points.left_ankle) ?? 180;
      const rightKneeAngle = angle(points.right_hip, points.right_knee, points.right_ankle) ?? 180;
      const frontSide = leftKneeAngle <= rightKneeAngle ? 'left' : 'right';
      const backSide = frontSide === 'left' ? 'right' : 'left';
      const frontKneeAngle = frontSide === 'left' ? leftKneeAngle : rightKneeAngle;
      const backKnee = points[`${backSide}_knee`];
      const backAnkle = points[`${backSide}_ankle`];
      const backKneeDrop = reliable(backKnee) && reliable(backAnkle) && Math.abs(backAnkle.y - backKnee.y) < 120;
      const bottom = frontKneeAngle <= 125 && backKneeDrop;
      const standing = leftKneeAngle >= 155 && rightKneeAngle >= 155;
      const phase = bottom ? 'bottom' : (standing ? 'standing/split stance' : 'descending');
      const warning = !bottom ? (frontKneeAngle > 125 ? 'front knee bend needs work' : 'back knee drop needs work') : null;
      return baseResult('lunge', phase, confidence, {
        depthStatus: bottom ? 'depth good' : 'depth high',
        feedback: bottom ? 'Depth good.' : (warning === 'front knee bend needs work' ? 'Bend the front knee more under control.' : 'Drop the back knee under control.'),
        formWarning: warning,
        goodRepCandidate: bottom,
        metrics: { frontSide, frontKneeAngle, backKneeDrop, leftKneeAngle, rightKneeAngle }
      });
    }
    function isCustomTemplateEligibleForScoring(template){
      return Boolean(template && template.status === 'active');
    }

    function unsupportedMovementResult(exercise = {}){
      const label = exercise?.name || exercise?.exerciseName || exercise?.exerciseId || exercise?.id || 'selected exercise';
      const feedback = `Live form judging is not available for ${label}. For this pilot, use Squat, Push-Up, Lunge, or Push-Up Challenge.`;
      return {
        movementPattern: 'unknown',
        pattern: 'unknown',
        phase: 'unsupported',
        repPhase: 'unsupported',
        depthStatus: 'tracking unavailable',
        status: 'tracking unavailable',
        confidenceStatus: 'tracking unavailable',
        keypointConfidenceOk: false,
        missingKeypoints: [],
        feedback,
        formWarning: 'Tracking unavailable for this exercise in pilot.',
        needsLowerBody: false,
        goodRepCandidate: false,
        goodForm: false,
        repDetected: false,
        goodRep: false,
        unsupportedExercise: true,
        metrics: {}
      };
    }
    function analyzeMovement({ pose, exercise } = {}){
      const pattern = mapExerciseToMovementPattern(exercise);
      if (pattern === 'pushup') return analyzePushup(pose);
      if (pattern === 'lunge') return analyzeLunge(pose);
      if (pattern === 'squat') return analyzeSquat(pose);
      return unsupportedMovementResult(exercise);
    }
    function completeCycle(analysis){
      const pattern = analysis?.pattern || analysis?.movementPattern || 'unknown';
      if (pattern === 'unknown') return { ...(analysis || {}), repDetected: false, goodRep: false };
      if (phaseState.pattern !== pattern) {
        phaseState.pattern = pattern;
        phaseState.phase = null;
        phaseState.sawBottom = false;
        phaseState.bottomGood = false;
        phaseState.warnings = [];
        phaseState.startedAtTop = false;
      }
      const finishPhase = pattern === 'pushup' ? 'top' : (pattern === 'lunge' ? 'standing/split stance' : 'standing');
      if (!phaseState.sawBottom && analysis.phase === finishPhase) phaseState.startedAtTop = true;
      let repDetected = false;
      if (analysis.phase === 'bottom' && (pattern !== 'pushup' || phaseState.startedAtTop)) {
        phaseState.sawBottom = true;
        phaseState.bottomGood = Boolean(analysis.goodRepCandidate);
        phaseState.warnings = analysis.formWarning ? [analysis.formWarning] : [];
      }
      if (phaseState.sawBottom && analysis.phase === finishPhase && phaseState.phase && phaseState.phase !== finishPhase) {
        repDetected = true;
        analysis.goodRep = Boolean(phaseState.bottomGood && !phaseState.warnings.length);
        phaseState.sawBottom = false;
        phaseState.bottomGood = false;
        phaseState.warnings = [];
        phaseState.startedAtTop = true;
      }
      phaseState.phase = analysis.phase;
      analysis.repDetected = repDetected;
      return analysis;
    }
    function resetCycle(){ phaseState.pattern = null; phaseState.phase = null; phaseState.sawBottom = false; phaseState.bottomGood = false; phaseState.warnings = []; phaseState.startedAtTop = false; }
    function renderVisibleFormStatus(analysis){
      const lines = [
        `movement pattern: ${analysis?.movementPattern || 'unknown'}`,
        `phase: ${analysis?.phase || 'unknown'}`,
        `depth/status: ${analysis?.depthStatus || analysis?.status || 'unknown'}`,
        `keypoint confidence: ${analysis?.confidenceStatus || 'unknown'}`,
        `rep quality: ${analysis?.repDetected ? (analysis.goodRep ? 'good rep' : 'needs work') : (analysis?.goodRepCandidate ? 'good rep candidate' : 'needs work')}`
      ];
      const formStatus = byId('formRuleStatus');
      if (formStatus) formStatus.textContent = lines.join('\n');
      const diag = byId('poseDiagnosticsStatus');
      if (diag) {
        const existing = String(diag.textContent || '').replace(/\n?movement pattern:[\s\S]*$/m, '');
        diag.textContent = `${existing}\n${lines.join('\n')}`.trim();
      }
      if (analysis?.feedback) {
        const cue = byId('hudCoachCue');
        if (cue) cue.textContent = analysis.feedback;
      }
    }
    function toLegacySquatShape(analysis){
      return {
        ...analysis,
        fullBody: Boolean(analysis.keypointConfidenceOk),
        lowerBodyReliable: Boolean(analysis.keypointConfidenceOk),
        squatPhase: analysis.phase,
        depthScore: Number(analysis.metrics?.depthScore || (analysis.depthStatus === 'depth good' ? 1 : 0)),
        kneeAngle: Number(analysis.metrics?.kneeAngle || 180),
        hipAtOrBelowKnee: Boolean(analysis.metrics?.hipAtOrBelowKnee),
        goodForm: Boolean(analysis.goodRepCandidate)
      };
    }
    const api = { version: 'phase24', MIN_SCORE, CONFIDENCE_FEEDBACK, mapExerciseToMovementPattern, isCustomTemplateEligibleForScoring, analyzeMovement, analyzeSquat, analyzePushup, analyzeLunge, completeCycle, resetCycle, renderVisibleFormStatus, toLegacySquatShape };
    global.__PILOT_FORM_RULE_ENGINE = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = { ...(module.exports || {}), PilotFormRuleEngine: api };
    return api;
  }

  function installPilotRepAnalysisAdapter(){
    const engine = installPilotFormRuleEngine();
    const runtime = global.RepAnalysisRuntime;
    if (!runtime || runtime.__phase24PilotAdapterInstalled) return false;
    const original = { configure: runtime.configure, reset: runtime.reset, getState: runtime.getState };
    const pilotState = { repCount: 0, totalReps: 0, goodRepCount: 0, repPhase: 'standing', lastAnalysis: null, lastRepAt: null };
    let repDeps = {};
    runtime.configure = function configurePilot(nextDeps = {}){
      repDeps = { ...repDeps, ...(nextDeps || {}) };
      return original.configure?.call(runtime, nextDeps) || runtime.getState();
    };
    runtime.reset = function resetPilot(nextState = {}){
      pilotState.repCount = Number(nextState.repCount || 0);
      pilotState.totalReps = Number(nextState.totalReps || 0);
      pilotState.goodRepCount = 0;
      pilotState.repPhase = String(nextState.phase || nextState.repPhase || 'standing');
      pilotState.lastAnalysis = null;
      pilotState.lastRepAt = null;
      engine.resetCycle();
      original.reset?.call(runtime, { ...nextState, phase: pilotState.repPhase });
      return runtime.getState();
    };
    runtime.analyzeSquatForm = function analyzePilotSquatForm(pose){
      return engine.toLegacySquatShape(engine.analyzeSquat(pose));
    };
    runtime.processPoseFrame = function processPilotPoseFrame({ pose, posePacket } = {}){
      const exercise = repDeps.getCurrentExerciseMeta?.() || {};
      const poseForAnalysis = pose || { keypoints: posePacket?.keypoints || [] };
      const analysis = engine.completeCycle(engine.analyzeMovement({ pose: poseForAnalysis, exercise }));
      if (analysis.repDetected) {
        pilotState.repCount += 1;
        pilotState.totalReps += 1;
        if (analysis.goodRep) pilotState.goodRepCount += 1;
        pilotState.lastRepAt = new Date().toISOString();
        repDeps.onRepComplete?.({ repCount: pilotState.repCount, totalReps: pilotState.totalReps, goodRep: analysis.goodRep, goodForm: analysis.goodRep, formWarning: analysis.formWarning, analysis });
        global.__liveWorkoutBreakpoints?.markPass?.('first-rep-counted', { repCount: pilotState.repCount, totalReps: pilotState.totalReps, movementPattern: analysis.movementPattern, goodRep: analysis.goodRep });
      }
      pilotState.repPhase = analysis.phase;
      pilotState.lastAnalysis = analysis;
      global.__lastRepAnalysis = { ...analysis, repCount: pilotState.repCount, totalReps: pilotState.totalReps, goodRepCount: pilotState.goodRepCount };
      engine.renderVisibleFormStatus(analysis);
      repDeps.onAnalysis?.({ repCount: pilotState.repCount, totalReps: pilotState.totalReps, goodRepCount: pilotState.goodRepCount, repPhase: pilotState.repPhase, analysis, repCompleted: analysis.repDetected, formResult: null });
      return runtime.getState();
    };
    runtime.getState = function getPilotState(){
      return { ...(original.getState?.call(runtime) || {}), ...pilotState, lastAnalysis: pilotState.lastAnalysis };
    };
    runtime.__phase24PilotAdapterInstalled = true;
    return true;
  }
  // Push-Up Challenge product workflow lives on /push-up-challenge.html.

  function configureWorkoutRuntime(nextDeps){ deps = { ...deps, ...(nextDeps || {}) }; }

  installPilotFormRuleEngine();
  installPilotRepAnalysisAdapter();

  global.WorkoutRuntime = { configureWorkoutRuntime, createSessionCallbackGlue, startWorkout, connectCamera, stopCamera, setCameraFullscreen, setWorkoutFocusMode, cameraErrorMessage, getState: () => ({ ...state }) };
  global.startWorkout = (...args) => global.WorkoutRuntime.startWorkout(...args);
  global.connectCamera = (...args) => global.WorkoutRuntime.connectCamera(...args);
})(typeof window !== 'undefined' ? window : globalThis);
