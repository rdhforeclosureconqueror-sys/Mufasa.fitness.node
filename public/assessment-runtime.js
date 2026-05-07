(function initAssessmentRuntime(globalScope) {
  'use strict';

  const global = globalScope || window;
  const DEFINED_EXERCISES_KEY = 'DEFINED_EXERCISES_V1';
  const OHSA_TARGET_SAMPLES_PER_VIEW = 40;
  const EXERCISE_BASELINE_FRAMES = 80;

  const state = global.__ASSESSMENT_RUNTIME_STATE = {
    ...(global.__ASSESSMENT_RUNTIME_STATE || {}),
    loaded: true,
    ohsaMode: false,
    ohsaPhase: null,
    ohsaFrontSamples: [],
    ohsaSideSamples: [],
    lastOhsaSummary: global.lastOhsaSummary || null,
    definingExercise: false,
    currentExerciseName: null,
    baselineFrames: [],
    definedExercises: {},
    auxiliaryLoopRunning: false,
    lastError: null
  };

  let deps = {};
  let auxiliaryLoop = null;

  function log(scope, message, details) {
    if (details === undefined) console.log(`[${scope}] ${message}`);
    else console.log(`[${scope}] ${message}`, details);
  }

  function getDocumentElement(refName, id) {
    return deps.refs?.[refName] || global.document?.getElementById?.(id) || null;
  }

  function setVisibleError(prefix, err) {
    const reason = err?.message || String(err || 'assessment_runtime_error');
    state.lastError = reason;
    const poseStatusEl = getDocumentElement('poseStatusEl', 'poseStatus');
    if (poseStatusEl) {
      poseStatusEl.textContent = `${prefix}: ${reason}`;
      poseStatusEl.classList?.add?.('status-bad');
    }
    deps.addLog?.('system', `${prefix}: ${reason}`);
    return reason;
  }

  function getDetector() {
    return deps.getDetector?.() || null;
  }

  async function ensureDetector(errorContext) {
    let detector = getDetector();
    if (!detector && typeof deps.initDetector === 'function') detector = await deps.initDetector();
    if (!detector) throw new Error(`movement detector unavailable for ${errorContext}`);
    return detector;
  }

  function hasCameraStream() {
    const videoEl = deps.getVideo?.() || getDocumentElement('videoEl', 'video');
    return Boolean(videoEl?.srcObject);
  }

  function setOhsaMode(value) {
    state.ohsaMode = Boolean(value);
    deps.setOhsaMode?.(state.ohsaMode);
  }

  function setDefiningExercise(value) {
    state.definingExercise = Boolean(value);
    deps.setDefiningExercise?.(state.definingExercise);
  }

  function setLastOhsaSummary(summary) {
    state.lastOhsaSummary = summary || null;
    global.lastOhsaSummary = state.lastOhsaSummary;
  }

  function resetOhsaSamples() {
    state.ohsaPhase = null;
    state.ohsaFrontSamples = [];
    state.ohsaSideSamples = [];
    deps.setOhsaFrontSamples?.([]);
    deps.setOhsaSideSamples?.([]);
  }

  function setBaselineFrames(frames) {
    state.baselineFrames = Array.isArray(frames) ? frames : [];
    deps.setBaselineFrames?.(state.baselineFrames);
  }

  function setCurrentExerciseName(name) {
    state.currentExerciseName = name || null;
    deps.setCurrentExerciseName?.(state.currentExerciseName);
  }

  function stopAuxiliaryPoseLoop() {
    if (auxiliaryLoop?.stop) auxiliaryLoop.stop();
    auxiliaryLoop = null;
    state.auxiliaryLoopRunning = false;
    log('ASSESSMENT_RUNTIME', 'auxiliary pose loop stopped');
  }

  function startAuxiliaryPoseLoop({ isActive, onPoseFrame, onError } = {}) {
    if (!global.PoseRuntime?.startPoseLoop) throw new Error('PoseRuntime.startPoseLoop missing');
    stopAuxiliaryPoseLoop();
    const detector = getDetector();
    const video = deps.getVideo?.() || getDocumentElement('videoEl', 'video');
    log('ASSESSMENT_RUNTIME', 'auxiliary pose loop starting');
    auxiliaryLoop = global.PoseRuntime.startPoseLoop({
      detector,
      video,
      isRunning: () => Boolean(isActive?.()),
      onPoseFrame,
      onError: (err) => {
        setVisibleError('Pose loop error', err);
        onError?.(err);
      }
    });
    state.auxiliaryLoopRunning = true;
    return auxiliaryLoop;
  }

  function avg(items, key) {
    const values = items.map((item) => Number(item?.[key])).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function summarizeOhsaSamples(frontSamples = [], sideSamples = []) {
    const frontKneeValgus = avg(frontSamples, 'kneeValgus');
    const sideDepthScore = avg(sideSamples, 'depthScore') || avg(frontSamples, 'depthScore');
    const sideTorsoAngle = avg(sideSamples, 'torsoAngle') || avg(frontSamples, 'torsoAngle');
    const findings = [];
    if (frontKneeValgus > 0.18) findings.push('Possible knee valgus / knees moving inward');
    if (sideTorsoAngle && sideTorsoAngle < 58) findings.push('Forward torso lean observed');
    if (sideDepthScore && sideDepthScore < 0.45) findings.push('Limited squat depth observed');
    if (!findings.length) findings.push('No major OHSA movement limitation detected from this scan');
    return {
      createdAt: new Date().toISOString(),
      frontSamples: frontSamples.length,
      sideSamples: sideSamples.length,
      metrics: {
        kneeValgus: Number(frontKneeValgus.toFixed(3)),
        depthScore: Number(sideDepthScore.toFixed(3)),
        torsoAngle: Number(sideTorsoAngle.toFixed(1))
      },
      findings
    };
  }

  function renderOhsaSummary(summary) {
    const ohsaSummaryViewEl = getDocumentElement('ohsaSummaryViewEl', 'ohsSummaryView');
    if (!ohsaSummaryViewEl || !summary) return;
    ohsaSummaryViewEl.textContent = [
      'Overhead Squat Assessment complete.',
      `Samples: front ${summary.frontSamples}, side ${summary.sideSamples}`,
      `Depth: ${summary.metrics.depthScore}, torso angle: ${summary.metrics.torsoAngle}°, knee valgus: ${summary.metrics.kneeValgus}`,
      'Findings:',
      ...summary.findings.map((finding) => `- ${finding}`)
    ].join('\n');
  }

  function submitOhsa(summary) {
    log('OHSA_RUNTIME', 'submitting summary through existing write path', { findings: summary?.findings?.length || 0 });
    if (typeof deps.postAuthenticatedJSON === 'function' && deps.nodeOhsaUrl) {
      return deps.postAuthenticatedJSON(deps.nodeOhsaUrl, {
        method: 'POST',
        body: { summary, source: 'frontend' }
      }).then(() => {
        deps.sessionWriteClient?.trackExplicitSuccess?.('ohsa');
      }).catch((err) => {
        deps.sessionWriteClient?.trackFallback?.('ohsa', err);
        if (!deps.isAuthUnavailable?.(err)) {
          console.warn('[OHSA_RUNTIME] authenticated API failed; falling back to /command.', err);
        }
        if (typeof deps.sendToNode !== 'function') throw err;
        return deps.sendToNode({
          domain: 'fitness',
          command: 'fitness.ohsaResult',
          userId: deps.userId,
          payload: { summary, _fallbackReason: 'ohsa_api_unavailable', ts: Date.now() }
        });
      }).finally(() => {
        deps.updateSyncStatus?.();
      });
    }
    if (typeof deps.sendOhsaToNode === 'function') return deps.sendOhsaToNode(summary);
    return Promise.resolve(false);
  }

  function loadDefinedExercises() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(DEFINED_EXERCISES_KEY) || '{}');
      state.definedExercises = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      state.definedExercises = {};
    }
    return state.definedExercises;
  }

  function configure(options = {}) {
    deps = { ...deps, ...options, refs: { ...(deps.refs || {}), ...(options.refs || {}) } };
    if (options.initialDefinedExercises && typeof options.initialDefinedExercises === 'object') {
      state.definedExercises = options.initialDefinedExercises;
    } else if (!Object.keys(state.definedExercises || {}).length) {
      loadDefinedExercises();
    }
    setLastOhsaSummary(state.lastOhsaSummary);
    log('ASSESSMENT_RUNTIME', 'configured');
  }

  async function startOhsa() {
    const progressScanStartedAt = global.performance?.now?.() || Date.now();
    deps.markPerfMetric?.('progressScanBootMs', 0);
    log('OHSA_RUNTIME', 'start requested');
    try {
      if (!hasCameraStream()) throw new Error('connect camera before starting OHSA');
      await ensureDetector('OHSA');
      if (deps.isRunning?.()) await deps.startWorkout?.();
      setDefiningExercise(false);
      setBaselineFrames([]);
      setCurrentExerciseName(null);
      setOhsaMode(true);
      state.ohsaPhase = 'front';
      state.ohsaFrontSamples = [];
      state.ohsaSideSamples = [];
      deps.setOhsaFrontSamples?.(state.ohsaFrontSamples);
      deps.setOhsaSideSamples?.(state.ohsaSideSamples);
      setLastOhsaSummary(null);
      const poseStatusEl = getDocumentElement('poseStatusEl', 'poseStatus');
      const ohsaSummaryViewEl = getDocumentElement('ohsaSummaryViewEl', 'ohsSummaryView');
      if (poseStatusEl) poseStatusEl.textContent = 'OHSA running: front view. Face the camera and perform slow overhead squats.';
      if (ohsaSummaryViewEl) ohsaSummaryViewEl.textContent = 'OHSA running: collecting front-view samples…';
      deps.addLog?.('system', 'OHSA started. Collecting front-view samples.');
      deps.markPerfMetric?.('progressScanBootMs', Math.round((global.performance?.now?.() || Date.now()) - progressScanStartedAt));
      startAuxiliaryPoseLoop({
        isActive: () => state.ohsaMode,
        onPoseFrame: ({ pose }) => {
          const sample = deps.analyzeSquatForm?.(pose);
          if (!sample?.fullBody) return;
          if (state.ohsaPhase === 'front') {
            state.ohsaFrontSamples.push(sample);
            if (ohsaSummaryViewEl) ohsaSummaryViewEl.textContent = `OHSA front view: ${state.ohsaFrontSamples.length}/${OHSA_TARGET_SAMPLES_PER_VIEW} samples.`;
            if (state.ohsaFrontSamples.length >= OHSA_TARGET_SAMPLES_PER_VIEW) {
              state.ohsaPhase = 'side';
              if (poseStatusEl) poseStatusEl.textContent = 'OHSA running: side view. Turn sideways and continue slow overhead squats.';
              if (ohsaSummaryViewEl) ohsaSummaryViewEl.textContent = 'OHSA running: collecting side-view samples…';
              deps.addLog?.('system', 'OHSA front view complete. Collecting side-view samples.');
            }
            return;
          }
          state.ohsaSideSamples.push(sample);
          if (ohsaSummaryViewEl) ohsaSummaryViewEl.textContent = `OHSA side view: ${state.ohsaSideSamples.length}/${OHSA_TARGET_SAMPLES_PER_VIEW} samples.`;
          if (state.ohsaSideSamples.length >= OHSA_TARGET_SAMPLES_PER_VIEW) {
            const summary = summarizeOhsaSamples(state.ohsaFrontSamples, state.ohsaSideSamples);
            setLastOhsaSummary(summary);
            setOhsaMode(false);
            renderOhsaSummary(summary);
            if (poseStatusEl) poseStatusEl.textContent = 'OHSA complete.';
            deps.addLog?.('system', 'OHSA complete. Summary saved.');
            submitOhsa(summary);
            stopAuxiliaryPoseLoop();
          }
        }
      });
    } catch (err) {
      setOhsaMode(false);
      stopAuxiliaryPoseLoop();
      setVisibleError('OHSA error', err);
    }
  }

  async function startDefineExercise() {
    log('DEFINE_EXERCISE', 'start requested');
    try {
      if (!hasCameraStream()) throw new Error('connect camera before defining an exercise');
      await ensureDetector('exercise definition');
      if (deps.isRunning?.()) await deps.startWorkout?.();
      setOhsaMode(false);
      resetOhsaSamples();
      const promptName = (global.prompt?.('Name this exercise', 'Custom exercise') || 'Custom exercise').trim() || 'Custom exercise';
      setCurrentExerciseName(promptName);
      setDefiningExercise(true);
      setBaselineFrames([]);
      const poseStatusEl = getDocumentElement('poseStatusEl', 'poseStatus');
      if (poseStatusEl) poseStatusEl.textContent = `Defining ${state.currentExerciseName}: perform several clean reps.`;
      deps.addLog?.('system', `Exercise definition started: ${state.currentExerciseName}.`);
      startAuxiliaryPoseLoop({
        isActive: () => state.definingExercise,
        onPoseFrame: ({ pose }) => {
          const sample = deps.analyzeSquatForm?.(pose);
          if (!sample?.fullBody) return;
          state.baselineFrames.push(sample);
          if (poseStatusEl) poseStatusEl.textContent = `Defining ${state.currentExerciseName}: ${state.baselineFrames.length}/${EXERCISE_BASELINE_FRAMES} samples.`;
          if (state.baselineFrames.length >= EXERCISE_BASELINE_FRAMES) {
            const baselineAvg = (key) => state.baselineFrames.reduce((sum, frame) => sum + Number(frame?.[key] || 0), 0) / state.baselineFrames.length;
            state.definedExercises[state.currentExerciseName] = {
              depthScoreAvg: Number(baselineAvg('depthScore').toFixed(3)),
              torsoAngleAvg: Number(baselineAvg('torsoAngle').toFixed(1)),
              samples: state.baselineFrames.length,
              updatedAt: new Date().toISOString()
            };
            try { global.localStorage?.setItem?.(DEFINED_EXERCISES_KEY, JSON.stringify(state.definedExercises)); } catch (_) {}
            setDefiningExercise(false);
            if (poseStatusEl) poseStatusEl.textContent = `Exercise definition saved: ${state.currentExerciseName}.`;
            deps.addLog?.('system', `Exercise definition saved: ${state.currentExerciseName}.`);
            stopAuxiliaryPoseLoop();
          }
        }
      });
    } catch (err) {
      setDefiningExercise(false);
      stopAuxiliaryPoseLoop();
      setVisibleError('Exercise definition error', err);
    }
  }

  global.AssessmentRuntime = {
    configure,
    startOhsa,
    startDefineExercise,
    stopAuxiliaryPoseLoop,
    summarizeOhsaSamples,
    renderOhsaSummary,
    submitOhsa,
    isOhsaMode: () => state.ohsaMode,
    isDefiningExercise: () => state.definingExercise,
    cancelOhsa: () => { setOhsaMode(false); resetOhsaSamples(); stopAuxiliaryPoseLoop(); },
    cancelDefineExercise: () => { setDefiningExercise(false); setBaselineFrames([]); setCurrentExerciseName(null); stopAuxiliaryPoseLoop(); },
    getState: () => ({
      ...state,
      ohsaFrontSamples: [...state.ohsaFrontSamples],
      ohsaSideSamples: [...state.ohsaSideSamples],
      baselineFrames: [...state.baselineFrames],
      definedExercises: { ...state.definedExercises }
    })
  };

  log('ASSESSMENT_RUNTIME', 'loaded');
})(typeof window !== 'undefined' ? window : globalThis);
