(function initRepAnalysisRuntime(globalScope) {
  'use strict';

  const global = globalScope || window;
  const state = global.__REP_ANALYSIS_STATE = {
    ...(global.__REP_ANALYSIS_STATE || {}),
    loaded: true,
    repCount: 0,
    totalReps: 0,
    repPhase: 'up',
    lastDepthScore: 0,
    lastGoodForm: false,
    lastFormResult: null,
    lastRepAt: null,
    lastAnalysisAt: null,
    lastLogAt: 0,
    fullBodyAcquired: false,
    lastError: null
  };
  let deps = {};

  const DOWN_DEPTH_THRESHOLD = 0.55;
  const UP_DEPTH_THRESHOLD = 0.35;
  const MIN_REP_INTERVAL_MS = 350;

  function log(message, details) {
    if (details === undefined) console.log(`[REP_ANALYSIS] ${message}`);
    else console.log(`[REP_ANALYSIS] ${message}`, details);
  }

  function coachLog(message, details) {
    if (details === undefined) console.log(`[COACH_RUNTIME] ${message}`);
    else console.log(`[COACH_RUNTIME] ${message}`, details);
  }

  function byId(id) { return global.document?.getElementById(id) || null; }

  function setVisibleRuntimeError(message) {
    state.lastError = message;
    const poseStatus = byId('poseStatus');
    const brainStatus = byId('brainStatus');
    const panel = byId('featureActivationStatus');
    if (poseStatus) {
      poseStatus.textContent = message;
      poseStatus.classList?.add?.('status-bad');
    }
    if (brainStatus) brainStatus.textContent = message;
    if (panel && !String(panel.textContent || '').includes(message)) {
      panel.textContent = `${panel.textContent || ''}\nrep analysis runtime error: ${message}`.trim();
    }
  }

  function configure(nextDeps) {
    deps = { ...deps, ...(nextDeps || {}) };
    log('configured', { hasFormEngine: Boolean(deps.formEngine?.evaluateExerciseForm || global.__MUFASA_FORM_ENGINE?.evaluateExerciseForm) });
    return snapshot();
  }

  function reset(nextState = {}) {
    state.repCount = Number(nextState.repCount || 0);
    state.totalReps = Number(nextState.totalReps || 0);
    state.repPhase = String(nextState.phase || nextState.repPhase || 'up');
    state.lastDepthScore = 0;
    state.lastGoodForm = false;
    state.lastFormResult = null;
    state.lastRepAt = null;
    state.fullBodyAcquired = false;
    global.__REP_ANALYSIS_STATE = state;
    log('reset', { repCount: state.repCount, totalReps: state.totalReps, repPhase: state.repPhase });
    return snapshot();
  }

  function getKeypoint(pose, name) {
    if (!pose || !pose.keypoints) return null;
    return pose.keypoints.find((kp) => kp.name === name || kp.part === name) || null;
  }

  function getAngleDegrees(a, b, c) {
    if (!a || !b || !c) return null;
    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;
    const dot = abx * cbx + aby * cby;
    const magAB = Math.hypot(abx, aby);
    const magCB = Math.hypot(cbx, cby);
    if (!magAB || !magCB) return null;
    const cos = dot / (magAB * magCB);
    const clamped = Math.min(1, Math.max(-1, cos));
    return (Math.acos(clamped) * 180) / Math.PI;
  }

  function computeKneeValgus(leftHip, rightHip, leftKnee, rightKnee) {
    if (!leftHip || !rightHip || !leftKnee || !rightKnee) return 0;
    const hipWidth = Math.abs(rightHip.x - leftHip.x);
    const kneeWidth = Math.abs(rightKnee.x - leftKnee.x);
    if (!hipWidth) return 0;
    return (hipWidth - kneeWidth) / hipWidth;
  }

  function analyzeSquatForm(pose, formResult = null) {
    if (!pose) return { fullBody: false, depthScore: 0, goodForm: false, kneeAngle: 180, torsoAngle: 90, kneeValgus: 0 };
    const leftHip = getKeypoint(pose, 'left_hip');
    const rightHip = getKeypoint(pose, 'right_hip');
    const leftKnee = getKeypoint(pose, 'left_knee');
    const rightKnee = getKeypoint(pose, 'right_knee');
    const leftAnkle = getKeypoint(pose, 'left_ankle');
    const rightAnkle = getKeypoint(pose, 'right_ankle');
    const leftShoulder = getKeypoint(pose, 'left_shoulder');
    const rightShoulder = getKeypoint(pose, 'right_shoulder');
    const required = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
    const fullBody = required.every((kp) => kp && kp.score > 0.3);
    const leftKneeAngle = getAngleDegrees(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = getAngleDegrees(rightHip, rightKnee, rightAnkle);
    const kneeAngle = (leftKneeAngle + rightKneeAngle) / 2 || 180;
    const depthScore = Math.max(0, Math.min(1, (180 - kneeAngle) / 90));
    const leftTorsoAngle = getAngleDegrees(leftShoulder, leftHip, leftAnkle);
    const rightTorsoAngle = getAngleDegrees(rightShoulder, rightHip, rightAnkle);
    const torsoAngle = (leftTorsoAngle + rightTorsoAngle) / 2 || 90;
    const kneeValgus = computeKneeValgus(leftHip, rightHip, leftKnee, rightKnee);
    const deterministicGoodForm = fullBody && depthScore > 0.6 && kneeAngle > 50 && torsoAngle > 60;
    const formStatus = formResult?.overallStatus || null;
    const goodForm = formStatus ? formStatus === 'GOOD' : deterministicGoodForm;
    return { fullBody, depthScore, goodForm, kneeAngle, torsoAngle, kneeValgus };
  }

  function evaluateForm(pose, posePacket) {
    const formEngine = deps.formEngine || global.__MUFASA_FORM_ENGINE || null;
    if (!formEngine?.evaluateExerciseForm) return null;
    const exercise = deps.getCurrentExerciseMeta?.() || null;
    const previousMetrics = state.lastFormResult?.metrics || null;
    return formEngine.evaluateExerciseForm({
      pose,
      keypoints: posePacket?.keypoints || pose?.keypoints || [],
      exerciseId: deps.getCurrentExerciseId?.() || exercise?.exerciseId || 'bodyweight_squat',
      exerciseName: exercise?.name || null,
      exercise
    }, { previousMetrics });
  }

  function processPoseFrame({ pose, posePacket } = {}) {
    try {
      const now = Date.now();
      const formResult = evaluateForm(pose, posePacket);
      const squat = analyzeSquatForm(pose, formResult);
      state.lastAnalysisAt = new Date(now).toISOString();
      state.lastFormResult = formResult;
      state.lastDepthScore = squat.depthScore;
      state.lastGoodForm = squat.goodForm;
      state.fullBodyAcquired = state.fullBodyAcquired || squat.fullBody;
      global.__lastFormResult = formResult || global.__lastFormResult || null;
      global.__lastRepAnalysis = { ...squat, repPhase: state.repPhase, repCount: state.repCount, totalReps: state.totalReps };

      let repCompleted = false;
      if (squat.fullBody && squat.depthScore >= DOWN_DEPTH_THRESHOLD && state.repPhase === 'up') {
        state.repPhase = 'down';
        coachLog('rep phase down', { depthScore: Number(squat.depthScore.toFixed(3)) });
      }
      const enoughInterval = !state.lastRepAt || now - Date.parse(state.lastRepAt) >= MIN_REP_INTERVAL_MS;
      if (squat.fullBody && state.repPhase === 'down' && squat.depthScore <= UP_DEPTH_THRESHOLD && enoughInterval) {
        state.repPhase = 'up';
        state.repCount += 1;
        state.totalReps += 1;
        state.lastRepAt = new Date(now).toISOString();
        repCompleted = true;
        log('rep completed', { repCount: state.repCount, totalReps: state.totalReps, depthScore: Number(squat.depthScore.toFixed(3)), goodForm: squat.goodForm });
        deps.onRepComplete?.({ repCount: state.repCount, totalReps: state.totalReps, depthScore: squat.depthScore, goodForm: squat.goodForm, formResult, analysis: squat });
      }
      deps.onAnalysis?.({ repCount: state.repCount, totalReps: state.totalReps, repPhase: state.repPhase, formResult, analysis: squat, repCompleted });
      if (!state.lastLogAt || now - state.lastLogAt > 2500) {
        state.lastLogAt = now;
        log('analysis frame', { repPhase: state.repPhase, depthScore: Number(squat.depthScore.toFixed(3)), fullBody: squat.fullBody, goodForm: squat.goodForm });
      }
      return snapshot();
    } catch (err) {
      const message = err?.message || String(err || 'rep_analysis_failed');
      console.error('[REP_ANALYSIS] frame failed', err);
      setVisibleRuntimeError(`Rep analysis failed: ${message}`);
      throw err;
    }
  }

  function snapshot() {
    return {
      repCount: state.repCount,
      totalReps: state.totalReps,
      repPhase: state.repPhase,
      lastDepthScore: state.lastDepthScore,
      lastGoodForm: state.lastGoodForm,
      lastRepAt: state.lastRepAt,
      lastAnalysisAt: state.lastAnalysisAt,
      fullBodyAcquired: state.fullBodyAcquired,
      lastError: state.lastError
    };
  }

  global.RepAnalysisRuntime = { configure, reset, processPoseFrame, analyzeSquatForm, getState: snapshot };
  log('loaded');
})(typeof window !== 'undefined' ? window : globalThis);
