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
    console.log('[WORKOUT_LIFECYCLE] connectCamera enter');
    markLiveBreakpoint('camera-clicked', 'pass', { source: 'WorkoutRuntime.connectCamera' });
    let videoPlayingMarked = false;
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
      videoPlayingMarked = true;
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
      if (!videoPlayingMarked) {
        const cameraFailName = state.cameraStream ? 'video-playing' : 'camera-stream-received';
        markLiveBreakpoint(cameraFailName, 'fail', { source: 'WorkoutRuntime.connectCamera' }, err);
      }
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
    markStartTrace('workoutStartClicked', 'pass', { running: state.running, cameraActive: state.cameraActive });
    markStartTrace('workoutStartHandlerEntered', 'pass', { running: state.running, sessionId: state.sessionId || null });
    try {
      ensureRequiredDom(['startBtn', 'video', 'workoutHud', 'hudExerciseName', 'hudSet', 'hudReps', 'hudTempo', 'hudRest', 'hudNextExercise', 'hudCoachCue', 'poseStatus', 'brainStatus']);
      if (!state.cameraActive && !getVideoElement()?.srcObject) {
        setVisibleError('Connect camera first.');
        throw new Error('Connect camera first.');
      }
      if (!state.running) {
        await getFn('prepareWorkoutStart')?.();
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
        markStartTrace('poseRuntimeLoadAttempted', 'pass', { sessionId: state.sessionId });
        markLiveBreakpoint('pose-runtime-loading', 'pass', { sessionId: state.sessionId });
        try {
          await getFn('ensureDetectorReady')?.();
          const detectorReady = getFn('isDetectorReady') ? getFn('isDetectorReady')() : true;
          if (!detectorReady) throw new Error('movement detector is not ready after camera connect');
          markStartTrace('poseRuntimeLoaded', 'pass', { detectorReady });
        } catch (poseErr) {
          const failure = normalizePoseRuntimeError(poseErr);
          markStartTrace('poseRuntimeFailed', 'fail', failure, poseErr);
          setVisibleError(`Pose runtime failed: ${failure.code}: ${failure.message}`);
          throw poseErr;
        }
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
      const failedMilestone = state.sessionId ? 'pose-loop-started' : 'session-created';
      markLiveBreakpoint(failedMilestone, 'fail', { source: 'WorkoutRuntime.startWorkout' }, err);
      getFn('onWorkoutStartError')?.(err);
      if (!state.lastError) setVisibleError(`Start workout error: ${err?.message || err}`);
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
        global.__liveWorkoutBreakpoints?.markPass?.('guidancePromptStarted', { source: 'WorkoutRuntime.onWorkoutStarted', sessionId: createdSessionId });
        await glueDeps.getCoachRuntime?.()?.speakWorkoutIntro?.(getCurrentExerciseMeta());
        global.__liveWorkoutBreakpoints?.markPass?.('poseLoopStarted', { source: 'WorkoutRuntime.onWorkoutStarted', sessionId: createdSessionId });
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
    const api = { version: 'phase24', MIN_SCORE, CONFIDENCE_FEEDBACK, mapExerciseToMovementPattern, analyzeMovement, analyzeSquat, analyzePushup, analyzeLunge, completeCycle, resetCycle, renderVisibleFormStatus, toLegacySquatShape };
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
      const challengeActive = global.PushupChallengeRuntime?.isActive?.() === true;
      const exercise = challengeActive ? { name: 'Push-Up', movementPattern: 'pushup' } : (repDeps.getCurrentExerciseMeta?.() || {});
      const poseForAnalysis = pose || { keypoints: posePacket?.keypoints || [] };
      const analysis = engine.completeCycle(engine.analyzeMovement({ pose: poseForAnalysis, exercise }));
      if (challengeActive) global.PushupChallengeRuntime?.handlePoseAnalysis?.({ ...analysis, pose: poseForAnalysis });
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


  function installPushupChallengeRuntime(){
    if (global.PushupChallengeRuntime?.version === 'phase27') return global.PushupChallengeRuntime;

    const MIN_SCORE = 0.35;
    const CHALLENGE_SECONDS = 60;
    const FULL_BODY_PROMPT = 'Step back so I can see your full body.';
    const KEYPOINT_PROMPT = 'Move so I can see your shoulders, elbows, wrists, and hips.';
    const VARIANTS = Object.freeze({
      two_hand: { label: 'Two-hand push-up', points: 1 },
      one_hand: { label: 'One-hand push-up', points: 2 },
      unknown: { label: 'Variant unclear', points: 1 }
    });
    const phaseOrder = Object.freeze({
      not_calibrated: 'not_calibrated',
      waiting_for_full_body: 'waiting_for_full_body',
      calibrating_bottom: 'calibrating_bottom',
      bottom_captured: 'bottom_captured',
      calibrating_top: 'calibrating_top',
      top_captured: 'top_captured',
      calibrated: 'calibrated',
      challenge_running: 'challenge_running',
      challenge_complete: 'challenge_complete'
    });
    const challengeState = {
      active: false,
      preflight: false,
      calibrationStatus: phaseOrder.not_calibrated,
      participant: null,
      validRepCount: 0,
      twoHandRepCount: 0,
      oneHandRepCount: 0,
      totalScore: 0,
      score: 0,
      lastRepVariant: null,
      lastRepPoints: 0,
      rejectedRepReason: 'Not started.',
      keypointsVisible: false,
      pushupStanceDetected: false,
      bodyAlignmentStatus: 'unknown',
      armDepthStatus: 'unknown',
      lockoutStatus: 'unknown',
      bottomElbowAngle: null,
      topElbowAngle: null,
      calibratedRange: null,
      requiredRange: null,
      supportArm: null,
      bottomCapture: null,
      topCapture: null,
      cyclePhase: 'waiting_down',
      cycleBottomAngle: null,
      cycleTopAngle: null,
      cycleVariant: 'unknown',
      cycleBodyStatus: 'unknown',
      timerId: null,
      remainingSeconds: CHALLENGE_SECONDS,
      endsAt: null,
      saveStatus: 'not_saved',
      lastSavedResult: null,
      leaderboard: []
    };

    function challengeById(id){ return global.document?.getElementById(id) || null; }
    function challengeText(id, value){ const el = challengeById(id); if (el) el.textContent = String(value); }
    function boolWord(value){ return value ? 'yes' : 'no'; }
    function rounded(value){ return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null; }
    function prettyAngle(value){ const n = rounded(value); return n === null ? 'n/a' : `${n}°`; }
    function getFn(name){ return deps?.[name] || global[name]; }
    function getChallengeBase(){ return deps?.apiBaseUrl || global.__API_BASE_URL__ || ''; }
    function now(){ return Date.now(); }
    function score(kp){ return Number(kp?.score || 0); }
    function hasXY(kp){ return Number.isFinite(Number(kp?.x)) && Number.isFinite(Number(kp?.y)); }
    function reliable(kp, threshold = MIN_SCORE){ return Boolean(kp && hasXY(kp) && score(kp) >= threshold); }
    function getKeypoint(source, name){
      const keypoints = Array.isArray(source) ? source : source?.keypoints;
      if (!Array.isArray(keypoints)) return null;
      const idx = { nose:0,left_eye:1,right_eye:2,left_ear:3,right_ear:4,left_shoulder:5,right_shoulder:6,left_elbow:7,right_elbow:8,left_wrist:9,right_wrist:10,left_hip:11,right_hip:12,left_knee:13,right_knee:14,left_ankle:15,right_ankle:16 }[name];
      return keypoints.find((kp) => (kp?.name || kp?.part) === name) || keypoints[idx] || null;
    }
    function angle(a,b,c){
      if (!hasXY(a) || !hasXY(b) || !hasXY(c)) return null;
      const abx = a.x-b.x, aby = a.y-b.y, cbx = c.x-b.x, cby = c.y-b.y;
      const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
      if (!mag) return null;
      return Math.acos(Math.max(-1, Math.min(1, (abx*cbx + aby*cby) / mag))) * 180 / Math.PI;
    }
    function avg(values){ const nums = values.filter((v) => Number.isFinite(Number(v))).map(Number); return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null; }
    function midpoint(a,b){ return reliable(a) && reliable(b) ? { x:(a.x+b.x)/2, y:(a.y+b.y)/2, score:Math.min(score(a), score(b)) } : null; }
    function distance(a,b){ return hasXY(a) && hasXY(b) ? Math.hypot(a.x-b.x, a.y-b.y) : null; }

    function readParticipant(){
      return {
        displayName: challengeById('challengeDisplayName')?.value?.trim(),
        team: challengeById('challengeTeam')?.value?.trim(),
        email: challengeById('challengeEmail')?.value?.trim(),
        phone: challengeById('challengePhone')?.value?.trim(),
        consent: challengeById('challengeConsent')?.checked === true
      };
    }
    function setChallengeButtons(running){
      const start = challengeById('challengeStartBtn');
      const stop = challengeById('challengeStopBtn');
      if (start) start.disabled = Boolean(running);
      if (stop) stop.disabled = !running;
    }
    function resetChallengeCounters(){
      Object.assign(challengeState, {
        validRepCount: 0, twoHandRepCount: 0, oneHandRepCount: 0, totalScore: 0, score: 0,
        lastRepVariant: null, lastRepPoints: 0, cyclePhase: 'waiting_down', cycleBottomAngle: null,
        cycleTopAngle: null, cycleVariant: 'unknown', cycleBodyStatus: 'unknown'
      });
    }
    function resetCalibration(){
      Object.assign(challengeState, {
        calibrationStatus: phaseOrder.not_calibrated,
        bottomElbowAngle: null, topElbowAngle: null, calibratedRange: null, requiredRange: null,
        supportArm: null, bottomCapture: null, topCapture: null,
        armDepthStatus: 'unknown', lockoutStatus: 'unknown', bodyAlignmentStatus: 'unknown',
        pushupStanceDetected: false, keypointsVisible: false
      });
    }
    function variantLabel(value){ return value === 'one_hand' ? 'one-hand' : value === 'two_hand' ? 'two-hand' : value === 'unknown' ? 'unclear' : 'none'; }
    function renderChallengeScore(){
      challengeText('challengeValidReps', challengeState.validRepCount);
      challengeText('challengeScore', challengeState.totalScore);
      challengeText('challengeSaveStatus', challengeState.saveStatus || 'not_saved');
      challengeText('challengeRejectedReason', challengeState.rejectedRepReason || 'None');
      const note = challengeById('challengeVariantNote');
      if (note) note.textContent = 'Do any valid push-up variation. Two-hand reps count 1 point. One-hand reps count 2 points.';
      const diagnostics = challengeById('challengeDiagnosticsStatus');
      if (diagnostics) {
        diagnostics.textContent = [
          `challengeModeActive: ${boolWord(challengeState.active || challengeState.preflight)}`,
          `calibrationStatus: ${challengeState.calibrationStatus}`,
          `bottomElbowAngle: ${prettyAngle(challengeState.bottomElbowAngle)}`,
          `topElbowAngle: ${prettyAngle(challengeState.topElbowAngle)}`,
          `calibratedRange: ${prettyAngle(challengeState.calibratedRange)}`,
          `requiredRange: ${prettyAngle(challengeState.requiredRange)}`,
          `pushupStanceDetected: ${boolWord(challengeState.pushupStanceDetected)}`,
          `bodyAlignmentStatus: ${challengeState.bodyAlignmentStatus}`,
          `armDepthStatus: ${challengeState.armDepthStatus}`,
          `lockoutStatus: ${challengeState.lockoutStatus}`,
          `lastRepVariant: ${variantLabel(challengeState.lastRepVariant)}`,
          `lastRepPoints: ${challengeState.lastRepPoints}`,
          `validRepCount: ${challengeState.validRepCount}`,
          `twoHandRepCount: ${challengeState.twoHandRepCount}`,
          `oneHandRepCount: ${challengeState.oneHandRepCount}`,
          `totalScore: ${challengeState.totalScore}`,
          `rejectedRepReason: ${challengeState.rejectedRepReason || 'none'}`,
          `leaderboardSaveStatus: ${challengeState.saveStatus || 'not_saved'}`
        ].join('\n');
      }
    }
    function renderLeaderboard(rows = []){
      const body = challengeById('challengeLeaderboardBody');
      if (!body) return;
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="8">No results loaded yet.</td></tr>';
        return;
      }
      body.innerHTML = rows.map((row, idx) => {
        const rank = row.rank || idx + 1;
        const scoreValue = row.totalScore ?? row.score ?? 0;
        const twoHand = row.twoHandRepCount ?? (row.variant === 'standard_pushup' ? row.validRepCount : 0) ?? 0;
        const oneHand = row.oneHandRepCount ?? (row.variant === 'one_hand_pushup' ? row.validRepCount : 0) ?? 0;
        return `<tr><td>${rank}</td><td>${row.displayName || ''}</td><td>${row.team || ''}</td><td>${scoreValue}</td><td>${row.validRepCount || 0}</td><td>${twoHand}</td><td>${oneHand}</td><td>${row.timestamp || ''}</td></tr>`;
      }).join('');
    }
    async function loadLeaderboard(){
      const sessionWrite = deps?.sessionWrite || global.SessionWrite;
      const data = sessionWrite?.getPushupChallengeLeaderboard ? await sessionWrite.getPushupChallengeLeaderboard() : await (await global.fetch(`${getChallengeBase()}/api/challenges/pushup/leaderboard`)).json();
      const rows = data?.data?.leaderboard || data?.leaderboard || [];
      challengeState.leaderboard = rows;
      renderLeaderboard(rows);
      return rows;
    }
    async function saveResult(){
      if (!challengeState.participant) return null;
      const payload = {
        ...challengeState.participant,
        validRepCount: challengeState.validRepCount,
        twoHandRepCount: challengeState.twoHandRepCount,
        oneHandRepCount: challengeState.oneHandRepCount,
        totalScore: challengeState.totalScore,
        score: challengeState.totalScore,
        lastRepVariant: challengeState.lastRepVariant,
        lastRepPoints: challengeState.lastRepPoints,
        calibration: {
          bottomElbowAngle: challengeState.bottomElbowAngle,
          topElbowAngle: challengeState.topElbowAngle,
          calibratedRange: challengeState.calibratedRange,
          requiredRange: challengeState.requiredRange,
          supportArm: challengeState.supportArm
        }
      };
      challengeState.saveStatus = 'saving';
      renderChallengeScore();
      const sessionWrite = deps?.sessionWrite || global.SessionWrite;
      const result = sessionWrite?.savePushupChallengeResult ? await sessionWrite.savePushupChallengeResult(payload) : await (await global.fetch(`${getChallengeBase()}/api/challenges/pushup/results`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(payload) })).json();
      challengeState.saveStatus = 'saved';
      challengeState.lastSavedResult = result?.data?.result || result?.result || result;
      renderChallengeScore();
      await loadLeaderboard().catch(() => null);
      return challengeState.lastSavedResult;
    }

    function analyzeChallengePose(input = {}){
      const pose = input.pose || input;
      const p = {
        ls:getKeypoint(pose,'left_shoulder'), rs:getKeypoint(pose,'right_shoulder'), le:getKeypoint(pose,'left_elbow'), re:getKeypoint(pose,'right_elbow'),
        lw:getKeypoint(pose,'left_wrist'), rw:getKeypoint(pose,'right_wrist'), lh:getKeypoint(pose,'left_hip'), rh:getKeypoint(pose,'right_hip'),
        la:getKeypoint(pose,'left_ankle'), ra:getKeypoint(pose,'right_ankle')
      };
      const shoulderOk = reliable(p.ls) && reliable(p.rs);
      const hipOk = reliable(p.lh) && reliable(p.rh);
      const leftArmOk = reliable(p.ls) && reliable(p.le) && reliable(p.lw);
      const rightArmOk = reliable(p.rs) && reliable(p.re) && reliable(p.rw);
      const twoHandOk = shoulderOk && hipOk && leftArmOk && rightArmOk;
      const oneHandCandidateOk = shoulderOk && hipOk && (leftArmOk || rightArmOk);
      const fullBodyVisible = shoulderOk && hipOk && (reliable(p.la) || reliable(p.ra)) && (leftArmOk || rightArmOk);
      const keypointConfidenceOk = twoHandOk || oneHandCandidateOk;
      const missing = [];
      for (const [name, ok] of [['left_shoulder',reliable(p.ls)],['right_shoulder',reliable(p.rs)],['left_elbow',reliable(p.le)],['right_elbow',reliable(p.re)],['left_wrist',reliable(p.lw)],['right_wrist',reliable(p.rw)],['left_hip',reliable(p.lh)],['right_hip',reliable(p.rh)]]) if (!ok) missing.push(name);
      const shoulder = midpoint(p.ls,p.rs);
      const hip = midpoint(p.lh,p.rh);
      const ankle = midpoint(p.la,p.ra) || (reliable(p.la) ? p.la : reliable(p.ra) ? p.ra : null);
      const torsoSpan = Math.max(1, distance(shoulder, hip) || 1);
      const shoulderWidth = Math.max(1, distance(p.ls, p.rs) || 1);
      const leftWristAway = reliable(p.lw) && reliable(p.ls) && distance(p.lw, p.ls) > Math.max(torsoSpan * 1.25, shoulderWidth * 3);
      const rightWristAway = reliable(p.rw) && reliable(p.rs) && distance(p.rw, p.rs) > Math.max(torsoSpan * 1.25, shoulderWidth * 3);
      let supportArm = leftArmOk && rightArmOk ? 'both' : leftArmOk ? 'left' : rightArmOk ? 'right' : null;
      if (leftArmOk && rightWristAway) supportArm = 'left';
      if (rightArmOk && leftWristAway) supportArm = 'right';
      const leftElbowAngle = leftArmOk ? angle(p.ls,p.le,p.lw) : null;
      const rightElbowAngle = rightArmOk ? angle(p.rs,p.re,p.rw) : null;
      const elbowAngle = supportArm === 'left' ? leftElbowAngle : supportArm === 'right' ? rightElbowAngle : avg([leftElbowAngle, rightElbowAngle]);
      const shoulderHipSlope = shoulder && hip ? Math.abs(hip.y - shoulder.y) / torsoSpan : 99;
      const horizontalEnough = shoulder && hip ? Math.abs(hip.x - shoulder.x) >= Math.max(25, Math.abs(hip.y - shoulder.y) * 1.2) : false;
      let lineStatus = 'unknown';
      if (shoulder && hip) {
        let bendRatio = shoulderHipSlope;
        if (ankle) {
          const bodyLength = Math.max(1, distance(shoulder, ankle) || torsoSpan);
          const expectedHipY = shoulder.y + ((ankle.y - shoulder.y) * ((hip.x - shoulder.x) / Math.max(1, ankle.x - shoulder.x)));
          bendRatio = Math.min(bendRatio, Math.abs(hip.y - expectedHipY) / bodyLength);
        }
        lineStatus = bendRatio <= 0.16 ? 'green' : bendRatio <= 0.28 ? 'yellow' : 'red';
      }
      const pushupStanceDetected = Boolean(keypointConfidenceOk && horizontalEnough && lineStatus !== 'red');
      const oppositeAway = supportArm === 'left' ? rightWristAway : supportArm === 'right' ? leftWristAway : false;
      let variant = 'unknown';
      if (twoHandOk && supportArm === 'both' && !leftWristAway && !rightWristAway) variant = 'two_hand';
      if ((supportArm === 'left' || supportArm === 'right') && oppositeAway && fullBodyVisible) variant = 'one_hand';
      const armDepthStatus = Number.isFinite(elbowAngle) ? (elbowAngle <= 100 ? 'green' : elbowAngle <= 110 ? 'yellow' : 'red') : 'red';
      const lockoutStatus = Number.isFinite(elbowAngle) ? (elbowAngle >= 160 ? 'green' : elbowAngle >= 150 ? 'yellow' : 'red') : 'red';
      return { pose, keypointConfidenceOk, fullBodyVisible, missing, leftElbowAngle, rightElbowAngle, elbowAngle, supportArm, variant, bodyAlignmentStatus: lineStatus, pushupStanceDetected, armDepthStatus, lockoutStatus };
    }

    function updatePoseDiagnostics(poseAnalysis){
      challengeState.keypointsVisible = Boolean(poseAnalysis.keypointConfidenceOk);
      challengeState.pushupStanceDetected = Boolean(poseAnalysis.pushupStanceDetected);
      challengeState.bodyAlignmentStatus = poseAnalysis.bodyAlignmentStatus || 'unknown';
      challengeState.armDepthStatus = poseAnalysis.armDepthStatus || 'unknown';
      challengeState.lockoutStatus = poseAnalysis.lockoutStatus || 'unknown';
    }
    function captureCalibrationPose(kind, poseAnalysis){
      return {
        kind,
        elbowAngle: poseAnalysis.elbowAngle,
        leftElbowAngle: poseAnalysis.leftElbowAngle,
        rightElbowAngle: poseAnalysis.rightElbowAngle,
        keypointConfidenceOk: poseAnalysis.keypointConfidenceOk,
        bodyAlignmentStatus: poseAnalysis.bodyAlignmentStatus,
        supportArm: poseAnalysis.supportArm,
        variant: poseAnalysis.variant,
        timestamp: new Date().toISOString()
      };
    }
    function validBottomCalibration(poseAnalysis){
      if (!poseAnalysis.fullBodyVisible) return { ok:false, reason: FULL_BODY_PROMPT };
      if (!poseAnalysis.keypointConfidenceOk) return { ok:false, reason: KEYPOINT_PROMPT };
      if (poseAnalysis.bodyAlignmentStatus === 'red') return { ok:false, reason: 'Keep your body straight before calibration.' };
      if (!Number.isFinite(poseAnalysis.elbowAngle) || poseAnalysis.elbowAngle < 70 || poseAnalysis.elbowAngle > 105) return { ok:false, reason: 'Bend your elbows closer to 90 degrees for the bottom position.' };
      return { ok:true };
    }
    function validTopCalibration(poseAnalysis){
      if (!poseAnalysis.fullBodyVisible) return { ok:false, reason: FULL_BODY_PROMPT };
      if (!poseAnalysis.keypointConfidenceOk) return { ok:false, reason: KEYPOINT_PROMPT };
      if (poseAnalysis.bodyAlignmentStatus === 'red') return { ok:false, reason: 'Keep your body straight before calibration.' };
      if (!Number.isFinite(poseAnalysis.elbowAngle) || poseAnalysis.elbowAngle < 150 || poseAnalysis.elbowAngle > 180) return { ok:false, reason: 'Push up higher until your arms are nearly straight.' };
      return { ok:true };
    }
    function finishCalibration(){
      const range = Number(challengeState.topElbowAngle) - Number(challengeState.bottomElbowAngle);
      if (!Number.isFinite(range) || range < 50 || challengeState.bottomElbowAngle < 70 || challengeState.bottomElbowAngle > 105 || challengeState.topElbowAngle < 150 || challengeState.topElbowAngle > 180) {
        challengeState.calibrationStatus = phaseOrder.not_calibrated;
        challengeState.rejectedRepReason = 'Calibration failed. Reset and try again with your full body in view.';
        return false;
      }
      challengeState.calibratedRange = range;
      challengeState.requiredRange = range * 0.8;
      challengeState.calibrationStatus = phaseOrder.calibrated;
      challengeState.rejectedRepReason = 'Calibration complete. Starting challenge.';
      return true;
    }
    function processCalibration(poseAnalysis){
      updatePoseDiagnostics(poseAnalysis);
      if (challengeState.calibrationStatus === phaseOrder.waiting_for_full_body) {
        if (!poseAnalysis.fullBodyVisible) { challengeState.rejectedRepReason = FULL_BODY_PROMPT; return false; }
        challengeState.calibrationStatus = phaseOrder.calibrating_bottom;
        challengeState.rejectedRepReason = 'Get into the bottom push-up position with your elbows near 90 degrees and hold still.';
        return false;
      }
      if (challengeState.calibrationStatus === phaseOrder.calibrating_bottom) {
        const validation = validBottomCalibration(poseAnalysis);
        if (!validation.ok) { challengeState.rejectedRepReason = validation.reason; return false; }
        challengeState.bottomCapture = captureCalibrationPose('bottom', poseAnalysis);
        challengeState.bottomElbowAngle = poseAnalysis.elbowAngle;
        challengeState.supportArm = poseAnalysis.supportArm;
        challengeState.calibrationStatus = phaseOrder.bottom_captured;
        challengeState.rejectedRepReason = 'Now push up to the top position with your arms nearly straight and hold still.';
        return false;
      }
      if (challengeState.calibrationStatus === phaseOrder.bottom_captured) {
        challengeState.calibrationStatus = phaseOrder.calibrating_top;
        challengeState.rejectedRepReason = 'Now push up to the top position with your arms nearly straight and hold still.';
        return false;
      }
      if (challengeState.calibrationStatus === phaseOrder.calibrating_top) {
        const validation = validTopCalibration(poseAnalysis);
        if (!validation.ok) { challengeState.rejectedRepReason = validation.reason; return false; }
        challengeState.topCapture = captureCalibrationPose('top', poseAnalysis);
        challengeState.topElbowAngle = poseAnalysis.elbowAngle;
        challengeState.calibrationStatus = phaseOrder.top_captured;
        return finishCalibration();
      }
      return challengeState.calibrationStatus === phaseOrder.calibrated;
    }

    function thresholds(){
      if (Number.isFinite(challengeState.bottomElbowAngle) && Number.isFinite(challengeState.topElbowAngle) && Number.isFinite(challengeState.requiredRange)) {
        return {
          bottom: challengeState.bottomElbowAngle + Math.max(8, challengeState.calibratedRange * 0.12),
          top: challengeState.topElbowAngle - Math.max(8, challengeState.calibratedRange * 0.12),
          required: challengeState.requiredRange
        };
      }
      return { bottom: 100, top: 160, required: 48 };
    }
    function reject(reason){ challengeState.rejectedRepReason = reason; return false; }
    function countRep(variant){
      const safeVariant = variant === 'one_hand' ? 'one_hand' : variant === 'two_hand' ? 'two_hand' : 'unknown';
      const points = VARIANTS[safeVariant]?.points || 1;
      challengeState.validRepCount += 1;
      if (safeVariant === 'one_hand') challengeState.oneHandRepCount += 1;
      if (safeVariant === 'two_hand') challengeState.twoHandRepCount += 1;
      challengeState.lastRepVariant = safeVariant;
      challengeState.lastRepPoints = points;
      challengeState.totalScore += points;
      challengeState.score = challengeState.totalScore;
      challengeState.rejectedRepReason = safeVariant === 'unknown' ? 'Last rep counted; variant unclear.' : 'Last rep counted.';
      challengeState.cyclePhase = 'waiting_down';
      challengeState.cycleBottomAngle = null;
      challengeState.cycleTopAngle = null;
      challengeState.cycleVariant = 'unknown';
      return true;
    }
    function processChallengeRep(poseAnalysis){
      updatePoseDiagnostics(poseAnalysis);
      if (!poseAnalysis.keypointConfidenceOk) return reject(KEYPOINT_PROMPT);
      if (!poseAnalysis.pushupStanceDetected) return reject(poseAnalysis.bodyAlignmentStatus === 'red' ? 'Keep your body straight.' : 'Get into a push-up stance before reps count.');
      if (poseAnalysis.bodyAlignmentStatus === 'red') return reject('Keep your body straight.');
      const t = thresholds();
      const elbow = Number(poseAnalysis.elbowAngle);
      if (!Number.isFinite(elbow)) return reject(KEYPOINT_PROMPT);
      const atDown = elbow <= t.bottom;
      const atUp = elbow >= t.top;
      if (challengeState.cyclePhase === 'waiting_down') {
        if (atDown) {
          challengeState.cyclePhase = 'waiting_up';
          challengeState.cycleBottomAngle = elbow;
          challengeState.cycleVariant = poseAnalysis.variant;
          challengeState.cycleBodyStatus = poseAnalysis.bodyAlignmentStatus;
          challengeState.rejectedRepReason = 'Bottom reached. Push up to lockout.';
          return false;
        }
        return reject(elbow > 120 ? 'Bend your elbows closer to 90 degrees for the bottom position.' : 'Start each rep from the calibrated bottom position.');
      }
      if (challengeState.cyclePhase === 'waiting_up') {
        if (atUp) {
          const range = elbow - Number(challengeState.cycleBottomAngle);
          if (range < t.required) {
            challengeState.cyclePhase = 'waiting_down';
            return reject('Use at least 80% of your calibrated push-up range.');
          }
          challengeState.cyclePhase = 'waiting_return_down';
          challengeState.cycleTopAngle = elbow;
          if (poseAnalysis.variant !== 'unknown') challengeState.cycleVariant = poseAnalysis.variant;
          challengeState.rejectedRepReason = 'Top lockout reached. Return to bottom to finish the rep.';
          return false;
        }
        return reject('Push up higher until your arms are nearly straight.');
      }
      if (challengeState.cyclePhase === 'waiting_return_down') {
        if (atDown) {
          const fullRange = Number(challengeState.cycleTopAngle) - elbow;
          if (fullRange < t.required) {
            challengeState.cyclePhase = 'waiting_down';
            return reject('Use at least 80% of your calibrated push-up range.');
          }
          const finalVariant = poseAnalysis.variant !== 'unknown' ? poseAnalysis.variant : challengeState.cycleVariant;
          return countRep(finalVariant);
        }
        return reject('Return near your calibrated bottom position to complete the rep.');
      }
      challengeState.cyclePhase = 'waiting_down';
      return false;
    }

    async function stopChallenge(reason = 'stopped'){
      if (challengeState.timerId) global.clearInterval(challengeState.timerId);
      challengeState.timerId = null;
      const wasRunning = challengeState.active;
      challengeState.active = false;
      challengeState.preflight = false;
      challengeState.calibrationStatus = phaseOrder.challenge_complete;
      setChallengeButtons(false);
      getFn('stopChallengePoseLoop')?.();
      challengeText('challengeTimer', reason === 'time' ? 'Time!' : 'Stopped');
      renderChallengeScore();
      if (wasRunning && challengeState.validRepCount >= 0) {
        try { await saveResult(); }
        catch (err) { challengeState.saveStatus = `save_failed: ${err?.message || err}`; renderChallengeScore(); }
      }
      return { ...challengeState };
    }
    function startTimer(durationSeconds = CHALLENGE_SECONDS){
      challengeState.remainingSeconds = durationSeconds;
      challengeState.endsAt = now() + durationSeconds * 1000;
      challengeText('challengeTimer', `${durationSeconds}s`);
      challengeState.timerId = global.setInterval(() => {
        challengeState.remainingSeconds = Math.max(0, Math.ceil((challengeState.endsAt - now()) / 1000));
        challengeText('challengeTimer', `${challengeState.remainingSeconds}s`);
        if (challengeState.remainingSeconds <= 0) stopChallenge('time');
      }, 250);
    }
    async function waitForCalibration(timeoutMs){
      const started = now();
      while (now() - started < timeoutMs) {
        if (challengeState.calibrationStatus === phaseOrder.calibrated) return true;
        await new Promise((resolve) => global.setTimeout(resolve, 50));
      }
      challengeState.preflight = false;
      setChallengeButtons(false);
      getFn('stopChallengePoseLoop')?.();
      throw new Error(challengeState.rejectedRepReason || 'Calibration failed. Reset and try again with your full body in view.');
    }
    async function startChallenge(options = {}){
      const participant = readParticipant();
      if (!participant.displayName) throw new Error('Display name is required for the leaderboard.');
      if (participant.consent !== true) throw new Error('Consent is required to enter the leaderboard challenge.');
      challengeState.participant = participant;
      resetChallengeCounters();
      resetCalibration();
      challengeState.preflight = true;
      challengeState.active = false;
      challengeState.calibrationStatus = phaseOrder.waiting_for_full_body;
      challengeState.rejectedRepReason = FULL_BODY_PROMPT;
      challengeState.saveStatus = 'not_saved';
      setChallengeButtons(true);
      renderChallengeScore();
      global.RepAnalysisRuntime?.reset?.({ repCount: 0, totalReps: 0, phase: 'bottom' });
      getFn('startChallengePoseLoop')?.();
      await waitForCalibration(Number(options.calibrationTimeoutMs || 10000));
      for (const label of ['3', '2', '1']) {
        challengeText('challengeTimer', label);
        await new Promise((resolve) => global.setTimeout(resolve, Number(options.countdownMs ?? 1000)));
      }
      challengeState.preflight = false;
      challengeState.active = true;
      challengeState.calibrationStatus = phaseOrder.challenge_running;
      challengeState.rejectedRepReason = 'Counting valid push-ups only.';
      renderChallengeScore();
      startTimer(Number(options.durationSeconds || CHALLENGE_SECONDS));
      return { ...challengeState };
    }
    function handlePoseAnalysis(analysis = {}){
      if (!challengeState.active && !challengeState.preflight) return { ...challengeState };
      const poseAnalysis = analysis.elbowAngle ? analysis : analyzeChallengePose(analysis.pose || analysis);
      if (challengeState.preflight) processCalibration(poseAnalysis);
      else if (challengeState.active) processChallengeRep(poseAnalysis);
      renderChallengeScore();
      return { ...challengeState };
    }
    function updateVariantNote(){ renderChallengeScore(); }
    function onChallengeEvent(id, type, handler){ const el = challengeById(id); if (typeof el?.addEventListener === 'function') el.addEventListener(type, handler); }
    function onChallengeClick(id, handler){ onChallengeEvent(id, 'click', handler); }
    function attachChallengeUi(){
      onChallengeClick('pushupChallengeEntryBtn', () => challengeById('pushupChallengePanel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
      onChallengeClick('dashboardChallengeLeaderboardBtn', () => { challengeById('pushupChallengePanel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); loadLeaderboard().catch((err) => { challengeState.saveStatus = `leaderboard_failed: ${err?.message || err}`; renderChallengeScore(); }); });
      onChallengeClick('challengeConnectCameraBtn', () => global.WorkoutRuntime?.connectCamera?.());
      onChallengeClick('challengeStartBtn', () => startChallenge().catch((err) => { challengeState.preflight = false; challengeState.active = false; setChallengeButtons(false); challengeState.rejectedRepReason = err?.message || String(err); renderChallengeScore(); }));
      onChallengeClick('challengeStopBtn', () => stopChallenge('stopped'));
      onChallengeClick('challengeLeaderboardBtn', () => loadLeaderboard().catch((err) => { challengeState.saveStatus = `leaderboard_failed: ${err?.message || err}`; renderChallengeScore(); }));
      renderChallengeScore();
    }
    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', attachChallengeUi, { once: true });
    else attachChallengeUi();
    const api = { version: 'phase27', VARIANTS, isActive: () => challengeState.active || challengeState.preflight, getState: () => ({ ...challengeState }), startChallenge, stopChallenge, handlePoseAnalysis, loadLeaderboard, saveResult, renderLeaderboard, updateVariantNote, analyzeChallengePose };
    global.PushupChallengeRuntime = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = { ...(module.exports || {}), PushupChallengeRuntime: api };
    return api;
  }

  function configureWorkoutRuntime(nextDeps){ deps = { ...deps, ...(nextDeps || {}) }; }

  installPilotFormRuleEngine();
  installPilotRepAnalysisAdapter();
  installPushupChallengeRuntime();

  global.WorkoutRuntime = { configureWorkoutRuntime, createSessionCallbackGlue, startWorkout, connectCamera, stopCamera, setCameraFullscreen, getState: () => ({ ...state }) };
  global.startWorkout = (...args) => global.WorkoutRuntime.startWorkout(...args);
  global.connectCamera = (...args) => global.WorkoutRuntime.connectCamera(...args);
})(typeof window !== 'undefined' ? window : globalThis);
