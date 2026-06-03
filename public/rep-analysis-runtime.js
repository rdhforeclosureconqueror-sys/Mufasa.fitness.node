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
  const LOWER_BODY_MIN_SCORE = 0.35;
  const KNEE_DEPTH_GOOD_ANGLE = 115;
  const HIP_KNEE_LEVEL_TOLERANCE_RATIO = 0.08;
  const LOWER_BODY_MISSING_FEEDBACK = 'I need to see your hips, knees, and ankles.';
  const LOWER_BODY_MOVE_BACK_FEEDBACK = 'Move back so I can see hips, knees, and ankles.';

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

  const KEYPOINT_INDEX_BY_NAME = Object.freeze({
    nose: 0, left_eye: 1, right_eye: 2, left_ear: 3, right_ear: 4,
    left_shoulder: 5, right_shoulder: 6, left_elbow: 7, right_elbow: 8,
    left_wrist: 9, right_wrist: 10, left_hip: 11, right_hip: 12,
    left_knee: 13, right_knee: 14, left_ankle: 15, right_ankle: 16
  });

  function getKeypoint(pose, name) {
    if (!pose || !Array.isArray(pose.keypoints)) return null;
    return pose.keypoints.find((kp) => kp.name === name || kp.part === name) || pose.keypoints[KEYPOINT_INDEX_BY_NAME[name]] || null;
  }

  function keypointScore(kp) { return Number(kp?.score || 0); }
  function reliable(kp, threshold = LOWER_BODY_MIN_SCORE) { return Boolean(kp && keypointScore(kp) >= threshold); }
  function average(values) {
    const nums = values.filter((value) => Number.isFinite(value));
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
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
    if (!pose) {
      return { fullBody: false, lowerBodyReliable: false, depthStatus: 'depth unknown', depthScore: 0, goodForm: false, kneeAngle: 180, torsoAngle: 90, kneeValgus: 0, feedback: LOWER_BODY_MISSING_FEEDBACK };
    }
    const leftHip = getKeypoint(pose, 'left_hip');
    const rightHip = getKeypoint(pose, 'right_hip');
    const leftKnee = getKeypoint(pose, 'left_knee');
    const rightKnee = getKeypoint(pose, 'right_knee');
    const leftAnkle = getKeypoint(pose, 'left_ankle');
    const rightAnkle = getKeypoint(pose, 'right_ankle');
    const leftShoulder = getKeypoint(pose, 'left_shoulder');
    const rightShoulder = getKeypoint(pose, 'right_shoulder');
    const lowerBody = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
    const lowerBodyReliable = lowerBody.every((kp) => reliable(kp));
    const shouldersReliable = reliable(leftShoulder) && reliable(rightShoulder);
    const fullBody = shouldersReliable && lowerBodyReliable;
    const scores = {
      leftHip: keypointScore(leftHip), rightHip: keypointScore(rightHip),
      leftKnee: keypointScore(leftKnee), rightKnee: keypointScore(rightKnee),
      leftAnkle: keypointScore(leftAnkle), rightAnkle: keypointScore(rightAnkle)
    };

    if (!lowerBodyReliable) {
      return {
        fullBody, lowerBodyReliable: false, depthStatus: 'depth unknown', depthScore: 0, goodForm: false,
        kneeAngle: 180, torsoAngle: 90, kneeValgus: 0, squatPhase: 'standing', keypointScores: scores,
        feedback: lowerBody.every((kp) => keypointScore(kp) <= 0) ? LOWER_BODY_MISSING_FEEDBACK : LOWER_BODY_MOVE_BACK_FEEDBACK,
        needsLowerBody: true
      };
    }

    const leftKneeAngle = getAngleDegrees(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = getAngleDegrees(rightHip, rightKnee, rightAnkle);
    const kneeAngle = average([leftKneeAngle, rightKneeAngle]) ?? 180;
    const angleDepthScore = Math.max(0, Math.min(1, (180 - kneeAngle) / 90));

    const avgHipY = average([leftHip.y, rightHip.y]);
    const avgKneeY = average([leftKnee.y, rightKnee.y]);
    const avgAnkleY = average([leftAnkle.y, rightAnkle.y]);
    const lowerLegSpan = Math.max(1, Math.abs((avgAnkleY ?? 0) - (avgKneeY ?? 0)));
    const hipKneeTolerance = Math.max(8, lowerLegSpan * HIP_KNEE_LEVEL_TOLERANCE_RATIO);
    const hipAtOrBelowKnee = Number.isFinite(avgHipY) && Number.isFinite(avgKneeY) && avgHipY >= avgKneeY - hipKneeTolerance;
    const verticalDepthScore = Number.isFinite(avgHipY) && Number.isFinite(avgKneeY)
      ? Math.max(0, Math.min(1, 0.35 + ((avgHipY - (avgKneeY - hipKneeTolerance)) / Math.max(1, hipKneeTolerance * 2)) * 0.65))
      : 0;
    const depthScore = Math.max(angleDepthScore, verticalDepthScore);
    const depthGood = hipAtOrBelowKnee || kneeAngle <= KNEE_DEPTH_GOOD_ANGLE;
    const depthStatus = depthGood ? 'depth good' : 'depth high';

    const leftTorsoAngle = reliable(leftShoulder) ? getAngleDegrees(leftShoulder, leftHip, leftAnkle) : null;
    const rightTorsoAngle = reliable(rightShoulder) ? getAngleDegrees(rightShoulder, rightHip, rightAnkle) : null;
    const torsoAngle = average([leftTorsoAngle, rightTorsoAngle]) ?? 90;
    const kneeValgus = computeKneeValgus(leftHip, rightHip, leftKnee, rightKnee);
    const notTooDeep = kneeAngle > 45;
    const torsoOk = !shouldersReliable || torsoAngle > 58;
    const deterministicGoodForm = fullBody && depthGood && notTooDeep && torsoOk;
    const formStatus = formResult?.overallStatus || null;
    const externalGood = formStatus ? formStatus === 'GOOD' || (depthGood && formResult?.regions?.knees !== 'BAD') : deterministicGoodForm;
    return {
      fullBody, lowerBodyReliable, depthStatus, depthScore, goodForm: Boolean(externalGood && depthGood),
      kneeAngle, torsoAngle, kneeValgus, hipAtOrBelowKnee, squatPhase: depthGood ? 'bottom' : (depthScore > 0.25 ? 'descending' : 'standing'),
      keypointScores: scores, feedback: depthGood ? 'Depth good.' : 'Go slightly deeper while keeping control.', needsLowerBody: false
    };
  }

  function resolveSquatPhase(squat, previousDepthScore = 0) {
    if (!squat?.lowerBodyReliable) return 'standing';
    if (squat.depthStatus === 'depth good') return 'bottom';
    const delta = Number(squat.depthScore || 0) - Number(previousDepthScore || 0);
    if (squat.depthScore <= UP_DEPTH_THRESHOLD) return 'standing';
    if (delta < -0.025) return 'ascending';
    return 'descending';
  }

  function calibrateSquatFormResult(formResult, squat) {
    if (!formResult || !squat) return formResult || null;
    const next = { ...formResult };
    if (!squat.lowerBodyReliable) {
      next.overallStatus = 'UNKNOWN';
      next.corrections = [{ priority: 1, text: squat.feedback || LOWER_BODY_MISSING_FEEDBACK }];
      next.repValid = false;
      return next;
    }
    if (squat.depthStatus === 'depth good') {
      next.corrections = (next.corrections || []).filter((cue) => !/deeper|depth/i.test(String(cue?.text || '')));
      next.regions = { ...(next.regions || {}), hips: 'GOOD' };
      if (!next.corrections.length && next.overallStatus === 'WARNING') next.overallStatus = 'GOOD';
      next.repValid = next.repValid || squat.depthScore >= DOWN_DEPTH_THRESHOLD;
    }
    return next;
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
      const previousDepthScore = state.lastDepthScore;
      const rawFormResult = evaluateForm(pose, posePacket);
      const squat = analyzeSquatForm(pose, rawFormResult);
      squat.squatPhase = resolveSquatPhase(squat, previousDepthScore);
      const formResult = calibrateSquatFormResult(rawFormResult, squat);
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
        global.__liveWorkoutBreakpoints?.markPass?.('first-rep-counted', { repCount: state.repCount, totalReps: state.totalReps, depthScore: Number(squat.depthScore.toFixed(3)) });
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
      global.__liveWorkoutBreakpoints?.markFail?.('rep-analysis-called', err, { source: 'RepAnalysisRuntime.processPoseFrame' });
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
