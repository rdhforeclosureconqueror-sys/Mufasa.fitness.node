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
    function analyzeMovement({ pose, exercise } = {}){
      const pattern = mapExerciseToMovementPattern(exercise) || 'squat';
      if (pattern === 'pushup') return analyzePushup(pose);
      if (pattern === 'lunge') return analyzeLunge(pose);
      return analyzeSquat(pose);
    }
    function completeCycle(analysis){
      const pattern = analysis?.pattern || analysis?.movementPattern || 'squat';
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
      const analysis = engine.completeCycle(engine.analyzeMovement({ pose: pose || { keypoints: posePacket?.keypoints || [] }, exercise }));
      if (challengeActive) global.PushupChallengeRuntime?.handlePoseAnalysis?.(analysis);
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
    if (global.PushupChallengeRuntime?.version === 'phase26') return global.PushupChallengeRuntime;
    const engine = installPilotFormRuleEngine();
    const challengeState = {
      active: false,
      preflight: false,
      participant: null,
      variant: 'standard_pushup',
      multiplier: 1,
      validRepCount: 0,
      score: 0,
      rejectedRepReason: 'none',
      keypointsVisible: false,
      saveStatus: 'not_saved',
      remainingSeconds: 60,
      timerId: null,
      endsAt: null,
      lastSavedResult: null
    };
    const VARIANTS = Object.freeze({
      standard_pushup: { label: 'Standard Push-Up', multiplier: 1, note: 'Standard Push-Up: valid rep = 1 point.' },
      one_hand_pushup: { label: 'One-Hand Push-Up', multiplier: 2, note: 'One-hand push-up scoring uses push-up form detection plus 2x challenge multiplier.' }
    });
    function challengeById(id){ return global.document?.getElementById(id) || null; }
    function challengeText(id, text){ const el = challengeById(id); if (el) el.textContent = text; return el; }
    function getChallengeBase(){ return global.RuntimeState?.getBackendOrigin?.() || global.location?.origin || ''; }
    function boolWord(value){ return value ? 'yes' : 'no'; }
    function getVariantConfig(variant){ return VARIANTS[variant] || VARIANTS.standard_pushup; }
    function collectParticipant(){
      const displayName = String(challengeById('challengeDisplayName')?.value || '').trim();
      const email = String(challengeById('challengeEmail')?.value || '').trim();
      const phone = String(challengeById('challengePhone')?.value || '').trim();
      const team = String(challengeById('challengeTeam')?.value || '').trim();
      const consent = challengeById('challengeConsent')?.checked === true;
      const variant = challengeById('challengeVariantSelect')?.value || 'standard_pushup';
      return { displayName, email, phone, team, consent, variant };
    }
    function renderChallengeDiagnostics(){
      const text = [
        `challengeModeActive: ${boolWord(challengeState.active || challengeState.preflight)}`,
        `challengeVariant: ${challengeState.variant}`,
        `pushupKeypointsVisible: ${boolWord(challengeState.keypointsVisible)}`,
        `validRepCount: ${challengeState.validRepCount}`,
        `score: ${challengeState.score}`,
        `rejectedRepReason: ${challengeState.rejectedRepReason || 'none'}`,
        `leaderboardSaveStatus: ${challengeState.saveStatus || 'not_saved'}`
      ].join('\n');
      challengeText('challengeDiagnosticsStatus', text);
      const panel = challengeById('featureActivationStatus');
      if (panel) {
        const block = `challengeModeActive: ${boolWord(challengeState.active || challengeState.preflight)}\nchallengeVariant: ${challengeState.variant}\npushupKeypointsVisible: ${boolWord(challengeState.keypointsVisible)}\nvalidRepCount: ${challengeState.validRepCount}\nscore: ${challengeState.score}\nrejectedRepReason: ${challengeState.rejectedRepReason || 'none'}\nleaderboardSaveStatus: ${challengeState.saveStatus || 'not_saved'}`;
        if (!panel.textContent.includes('challengeModeActive:')) panel.textContent += `\n${block}`;
        else panel.textContent = panel.textContent.replace(/challengeModeActive:[\s\S]*$/m, block);
      }
    }
    function renderChallengeScore(){
      challengeText('challengeValidReps', String(challengeState.validRepCount));
      challengeText('challengeScore', String(challengeState.score));
      challengeText('challengeRejectedReason', challengeState.rejectedRepReason || 'None');
      challengeText('challengeSaveStatus', challengeState.saveStatus || 'not_saved');
      renderChallengeDiagnostics();
    }
    function updateVariantNote(){
      const variant = challengeById('challengeVariantSelect')?.value || challengeState.variant;
      challengeText('challengeVariantNote', getVariantConfig(variant).note);
      challengeState.variant = variant;
      challengeState.multiplier = getVariantConfig(variant).multiplier;
      renderChallengeDiagnostics();
    }
    function renderLeaderboard(rows = []){
      const body = challengeById('challengeLeaderboardBody');
      if (!body) return;
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="8">No challenge results yet.</td></tr>';
        return;
      }
      body.innerHTML = rows.map((row) => `<tr><td>${row.rank}</td><td>${escapeHtml(row.displayName)}</td><td>${escapeHtml(row.team || '')}</td><td>${escapeHtml(row.variantLabel || row.variant)}</td><td>${row.validRepCount}</td><td>${row.multiplier}x</td><td>${row.score}</td><td>${escapeHtml(row.timestamp)}</td></tr>`).join('');
    }
    function escapeHtml(value){
      return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
    }
    async function loadLeaderboard(){
      const res = await global.fetch(`${getChallengeBase()}/api/challenges/pushup/leaderboard`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || json?.message || 'leaderboard load failed');
      const rows = json?.data?.leaderboard || json?.leaderboard || [];
      renderLeaderboard(rows);
      return rows;
    }
    async function saveResult(){
      if (!challengeState.participant) return null;
      challengeState.saveStatus = 'saving';
      renderChallengeScore();
      const payload = {
        ...challengeState.participant,
        variant: challengeState.variant,
        validRepCount: challengeState.validRepCount,
        multiplier: challengeState.multiplier,
        score: challengeState.score
      };
      const res = await global.fetch(`${getChallengeBase()}/api/challenges/pushup/results`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || json?.message || 'challenge result save failed');
      challengeState.lastSavedResult = json?.data?.result || json?.result || null;
      challengeState.saveStatus = 'saved';
      renderChallengeScore();
      await loadLeaderboard().catch(() => null);
      return challengeState.lastSavedResult;
    }
    function setChallengeButtons(active){
      const start = challengeById('challengeStartBtn');
      const stop = challengeById('challengeStopBtn');
      if (start) start.disabled = active;
      if (stop) stop.disabled = !active;
    }
    function stopChallenge(reason = 'stopped'){
      challengeState.preflight = false;
      if (challengeState.timerId) global.clearInterval(challengeState.timerId);
      challengeState.timerId = null;
      const wasActive = challengeState.active;
      challengeState.active = false;
      setChallengeButtons(false);
      challengeText('challengeTimer', reason === 'time' ? 'Time!' : 'Stopped');
      getFn('stopChallengePoseLoop')?.();
      renderChallengeScore();
      if (wasActive) {
        saveResult().catch((err) => {
          challengeState.saveStatus = `save_failed: ${err?.message || err}`;
          renderChallengeScore();
        });
      }
      return { ...challengeState };
    }
    function startTimer(durationSeconds){
      challengeState.remainingSeconds = durationSeconds;
      challengeState.endsAt = Date.now() + durationSeconds * 1000;
      challengeText('challengeTimer', `${durationSeconds}s`);
      challengeState.timerId = global.setInterval(() => {
        challengeState.remainingSeconds = Math.max(0, Math.ceil((challengeState.endsAt - Date.now()) / 1000));
        challengeText('challengeTimer', `${challengeState.remainingSeconds}s`);
        if (challengeState.remainingSeconds <= 0) stopChallenge('time');
      }, 250);
    }
    async function startChallenge(options = {}){
      const participant = { ...collectParticipant(), ...(options.participant || {}) };
      if (!participant.displayName) throw new Error('Display name is required.');
      if (participant.consent !== true) throw new Error('Consent is required to enter the leaderboard challenge.');
      if (!state.cameraActive && !getVideoElement()?.srcObject) throw new Error('Connect camera first.');
      const variant = participant.variant || 'standard_pushup';
      const config = getVariantConfig(variant);
      challengeState.participant = participant;
      challengeState.variant = variant;
      challengeState.multiplier = config.multiplier;
      challengeState.validRepCount = 0;
      challengeState.score = 0;
      challengeState.rejectedRepReason = 'Waiting for top push-up position.';
      challengeState.keypointsVisible = false;
      challengeState.preflight = true;
      challengeState.saveStatus = 'not_saved';
      challengeState.lastSavedResult = null;
      engine.resetCycle();
      global.RepAnalysisRuntime?.reset?.({ repCount: 0, totalReps: 0, phase: 'top' });
      setChallengeButtons(true);
      renderChallengeScore();
      getFn('startChallengePoseLoop')?.();
      await waitForPushupVisibility(Number(options.visibilityTimeoutMs || 3000));
      for (const label of ['3', '2', '1']) {
        challengeText('challengeTimer', label);
        await new Promise((resolve) => global.setTimeout(resolve, Number(options.countdownMs || 1000)));
      }
      challengeState.preflight = false;
      challengeState.active = true;
      challengeState.rejectedRepReason = 'Counting valid push-ups only.';
      renderChallengeScore();
      startTimer(Number(options.durationSeconds || 60));
      return { ...challengeState };
    }
    async function waitForPushupVisibility(timeoutMs){
      const started = Date.now();
      challengeState.rejectedRepReason = 'Move so I can see your shoulders, elbows, wrists, and hips.';
      renderChallengeScore();
      while (Date.now() - started < timeoutMs) {
        if (challengeState.keypointsVisible) return true;
        await new Promise((resolve) => global.setTimeout(resolve, 100));
      }
      challengeState.preflight = false;
      setChallengeButtons(false);
      getFn('stopChallengePoseLoop')?.();
      throw new Error('Move so I can see your shoulders, elbows, wrists, and hips.');
    }
    function handlePoseAnalysis(analysis = {}){
      if (!challengeState.active && !challengeState.preflight) return;
      challengeState.keypointsVisible = Boolean(analysis.keypointConfidenceOk);
      if (!analysis.keypointConfidenceOk) {
        challengeState.rejectedRepReason = 'Move so I can see your shoulders, elbows, wrists, and hips.';
      } else if (challengeState.preflight) {
        challengeState.rejectedRepReason = 'Keypoints visible. Get ready.';
      } else if (analysis.repDetected && analysis.goodRep) {
        challengeState.validRepCount += 1;
        challengeState.score = challengeState.validRepCount * challengeState.multiplier;
        challengeState.rejectedRepReason = 'Last rep counted.';
      } else if (analysis.formWarning) {
        challengeState.rejectedRepReason = analysis.formWarning;
      } else if (analysis.phase !== 'top') {
        challengeState.rejectedRepReason = analysis.depthStatus || 'Finish the full top-bottom-top rep.';
      }
      renderChallengeScore();
    }
    function onChallengeEvent(id, type, handler){ const el = challengeById(id); if (typeof el?.addEventListener === 'function') el.addEventListener(type, handler); }
    function onChallengeClick(id, handler){ onChallengeEvent(id, 'click', handler); }
    function attachChallengeUi(){
      onChallengeClick('pushupChallengeEntryBtn', () => challengeById('pushupChallengePanel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
      onChallengeClick('dashboardChallengeLeaderboardBtn', () => { challengeById('pushupChallengePanel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); loadLeaderboard().catch((err) => { challengeState.saveStatus = `leaderboard_failed: ${err?.message || err}`; renderChallengeScore(); }); });
      onChallengeClick('challengeConnectCameraBtn', () => global.WorkoutRuntime?.connectCamera?.());
      onChallengeClick('challengeStartBtn', () => startChallenge().catch((err) => { challengeState.rejectedRepReason = err?.message || String(err); renderChallengeScore(); }));
      onChallengeClick('challengeStopBtn', () => stopChallenge('stopped'));
      onChallengeClick('challengeLeaderboardBtn', () => loadLeaderboard().catch((err) => { challengeState.saveStatus = `leaderboard_failed: ${err?.message || err}`; renderChallengeScore(); }));
      onChallengeEvent('challengeVariantSelect', 'change', updateVariantNote);
      updateVariantNote();
      renderChallengeScore();
    }
    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', attachChallengeUi, { once: true });
    else attachChallengeUi();
    const api = { version: 'phase26', VARIANTS, isActive: () => challengeState.active || challengeState.preflight, getState: () => ({ ...challengeState }), startChallenge, stopChallenge, handlePoseAnalysis, loadLeaderboard, saveResult, renderLeaderboard, updateVariantNote };
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
