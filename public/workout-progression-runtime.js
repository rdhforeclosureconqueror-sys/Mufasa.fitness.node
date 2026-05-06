(function initWorkoutProgressionRuntime(globalScope) {
  'use strict';
  const global = globalScope || window;
  const ACTIVE_WORKOUT_SELECTION_KEY = 'ACTIVE_WORKOUT_SELECTION_V1';
  const ACTIVE_WORKOUT_COMPLETION_KEY = 'ACTIVE_WORKOUT_COMPLETION_V1';

  let deps = {};
  let activeWorkoutPlan = null;
  let restTimerId = null;
  let restRemainingSec = 0;
  let completedEventDispatched = false;
  let sessionStartedAt = null;
  let sessionId = null;
  let state = initialState();

  function log(message, details) {
    if (details === undefined) console.log(`[WORKOUT_PROGRESS] ${message}`);
    else console.log(`[WORKOUT_PROGRESS] ${message}`, details);
  }

  function retentionSignal(message, details) {
    if (details === undefined) console.log(`[RETENTION_SIGNAL] ${message}`);
    else console.log(`[RETENTION_SIGNAL] ${message}`, details);
  }

  function initialState() {
    return {
      activeProgramId: null,
      activeWorkoutId: null,
      activeExerciseIndex: 0,
      activeSetIndex: 0,
      currentExercise: null,
      targetReps: 10,
      targetTime: null,
      tempo: '3-1-1',
      restSeconds: 60,
      nextExercise: null,
      repCount: 0,
      totalReps: 0,
      setStatus: 'idle',
      workoutStatus: 'idle'
    };
  }

  function byId(id) { return global.document?.getElementById(id) || null; }

  function setVisibleRuntimeError(message) {
    const poseStatus = byId('poseStatus');
    const brainStatus = byId('brainStatus');
    const panel = byId('featureActivationStatus');
    if (poseStatus) {
      poseStatus.textContent = message;
      poseStatus.classList?.add?.('status-bad');
    }
    if (brainStatus) brainStatus.textContent = message;
    if (panel && !String(panel.textContent || '').includes(message)) {
      panel.textContent = `${panel.textContent || ''}\nworkout progression error: ${message}`.trim();
    }
  }

  function normalizeExercisePrescription(exercise, fallbackIndex = 0) {
    const sets = Number(exercise?.sets || 3);
    const repsRaw = Number(exercise?.targetReps || exercise?.reps || 10);
    const targetReps = Number.isFinite(repsRaw) && repsRaw > 0 ? repsRaw : 10;
    return {
      exerciseId: String(exercise?.exerciseId || exercise?.id || `exercise_${fallbackIndex + 1}`),
      name: String(exercise?.name || `Exercise ${fallbackIndex + 1}`),
      sets: Number.isFinite(sets) && sets > 0 ? sets : 1,
      targetReps,
      targetTime: Number(exercise?.targetTime || 0) || null,
      restSeconds: Number(exercise?.restSeconds || exercise?.restSec || 60) || 60,
      tempo: String(exercise?.tempo || '3-1-1'),
      instructions: Array.isArray(exercise?.instructions) ? exercise.instructions : [],
      formCues: Array.isArray(exercise?.formCues) ? exercise.formCues : [],
      commonMistakes: Array.isArray(exercise?.commonMistakes) ? exercise.commonMistakes : []
    };
  }

  function hydrateActiveWorkoutPlan() {
    let stored = null;
    try { stored = JSON.parse(global.localStorage?.getItem(ACTIVE_WORKOUT_SELECTION_KEY) || 'null'); } catch (err) {
      throw new Error(`invalid active workout selection: ${err?.message || err}`);
    }
    const fallback = {
      programId: null,
      scheduledWorkoutId: 'quick_squat_default',
      title: 'Quick Squat Session',
      notes: null,
      exercises: [normalizeExercisePrescription({ exerciseId: 'bodyweight_squat', name: 'Bodyweight Squat', sets: 3, targetReps: 10, restSeconds: 60, tempo: '3-1-1', instructions: ['Keep chest up.'], formCues: ['Keep knees tracking over toes.'] }, 0)]
    };
    const source = stored && Array.isArray(stored.exercises) && stored.exercises.length ? stored : fallback;
    activeWorkoutPlan = {
      programId: source.programId || null,
      scheduledWorkoutId: source.scheduledWorkoutId || source.workoutId || `workout_${Date.now()}`,
      title: source.title || 'Workout',
      notes: source.notes || null,
      exercises: source.exercises.map((exercise, index) => normalizeExercisePrescription(exercise, index))
    };
    updateState({
      activeProgramId: activeWorkoutPlan.programId,
      activeWorkoutId: activeWorkoutPlan.scheduledWorkoutId
    }, { render: false });
    log('hydrated workout plan', { workoutId: activeWorkoutPlan.scheduledWorkoutId, exercises: activeWorkoutPlan.exercises.length });
    return getPlan();
  }

  function publishState() {
    const exportedState = getState();
    global.__ACTIVE_WORKOUT_STATE = exportedState;
    global.ACTIVE_WORKOUT_STATE = exportedState;
  }

  function decorateCurrentState() {
    if (!activeWorkoutPlan) return;
    const current = activeWorkoutPlan.exercises[state.activeExerciseIndex] || activeWorkoutPlan.exercises[0];
    const next = activeWorkoutPlan.exercises[state.activeExerciseIndex + 1] || null;
    state.currentExercise = current?.name || null;
    state.targetReps = current?.targetReps || null;
    state.targetTime = current?.targetTime || null;
    state.tempo = current?.tempo || '3-1-1';
    state.restSeconds = current?.restSeconds || 60;
    state.nextExercise = next?.name || 'Workout complete';
  }

  function render(formResult = null) {
    if (!global.HudRuntime?.render) throw new Error('HudRuntime.render missing');
    return global.HudRuntime.render({
      activeWorkoutPlan,
      activeWorkoutState: state,
      formResult,
      restRemainingSec
    });
  }

  function updateState(partial = {}, options = {}) {
    state = { ...state, ...(partial || {}) };
    decorateCurrentState();
    publishState();
    if (options.render !== false) render(options.formResult || null);
    deps.onStateChange?.(getState(), getPlan());
    log('state updated', { workoutStatus: state.workoutStatus, setStatus: state.setStatus, exercise: state.currentExercise, set: state.activeSetIndex + 1, reps: state.repCount, totalReps: state.totalReps });
    return getState();
  }

  function stopRestTimer(options = {}) {
    if (restTimerId) clearInterval(restTimerId);
    restTimerId = null;
    restRemainingSec = 0;
    if (options.render) render(options.formResult || null);
  }

  function advanceWorkoutProgress(forceNextExercise = false) {
    const exercise = activeWorkoutPlan?.exercises?.[state.activeExerciseIndex];
    if (!exercise) return completeWorkoutSession();
    if (!forceNextExercise && state.activeSetIndex + 1 < exercise.sets) {
      updateState({ activeSetIndex: state.activeSetIndex + 1, repCount: 0, setStatus: 'active' });
      deps.onSetStarted?.(state.activeSetIndex + 1, getCurrentExerciseMeta());
      return getState();
    }
    if (state.activeExerciseIndex + 1 < activeWorkoutPlan.exercises.length) {
      updateState({ activeExerciseIndex: state.activeExerciseIndex + 1, activeSetIndex: 0, repCount: 0, setStatus: 'active' });
      deps.onExerciseStarted?.(getCurrentExerciseMeta());
      return getState();
    }
    return completeWorkoutSession();
  }

  function startRestTimer(seconds) {
    stopRestTimer();
    restRemainingSec = Math.max(0, Number(seconds || state.restSeconds || 60));
    updateState({ setStatus: 'rest' });
    log('rest started', { seconds: restRemainingSec, exercise: state.currentExercise, set: state.activeSetIndex + 1 });
    if (restRemainingSec <= 0) return advanceWorkoutProgress(false);
    restTimerId = setInterval(() => {
      restRemainingSec = Math.max(0, restRemainingSec - 1);
      render();
      if (restRemainingSec <= 0) {
        stopRestTimer();
        advanceWorkoutProgress(false);
      }
    }, 1000);
    return getState();
  }

  function completeWorkoutSession() {
    if (completedEventDispatched) return getState();
    stopRestTimer();
    updateState({ workoutStatus: 'completed', setStatus: 'completed' });
    const canonicalSessionId = sessionId || deps.getSessionId?.() || null;
    const durationMs = sessionStartedAt ? Math.max(0, Date.now() - sessionStartedAt) : 0;
    const completion = {
      sessionId: canonicalSessionId,
      scheduledWorkoutId: state.activeWorkoutId,
      completedExercises: activeWorkoutPlan?.exercises?.slice(0, state.activeExerciseIndex + 1).map((x) => x.name) || [],
      completedSets: state.activeSetIndex + 1,
      repsCompleted: state.totalReps,
      formScoreSummary: Number((global.__lastFormResult?.overallScore || 0).toFixed(3)),
      durationSeconds: Math.round(durationMs / 1000),
      notes: activeWorkoutPlan?.notes || null,
      completedAt: new Date().toISOString()
    };
    try { global.localStorage?.setItem(ACTIVE_WORKOUT_COMPLETION_KEY, JSON.stringify(completion)); } catch (_) {}
    completedEventDispatched = true;
    global.dispatchEvent?.(new global.CustomEvent('workout:completed', { detail: completion }));
    if (canonicalSessionId) {
      const sessionWrite = deps.sessionWrite || global.SessionWrite || null;
      if (!sessionWrite?.completeSession) {
        setVisibleRuntimeError('Workout completion failed: SessionWrite.completeSession missing');
        throw new Error('SessionWrite.completeSession missing');
      }
      sessionWrite.completeSession(canonicalSessionId, {
        repsCompleted: state.totalReps,
        exerciseId: getCurrentExerciseId(),
        scheduledWorkoutId: state.activeWorkoutId,
        completedAt: completion.completedAt
      }).catch((err) => {
        deps.onCompleteSaveError?.(err);
        console.warn('[WORKOUT_COMPLETE] session_complete write failed', err);
      });
    }
    deps.trackPilotEvent?.('workout_completed', { sessionId: canonicalSessionId, totalReps: state.totalReps });
    deps.onRetentionSignal?.({ sessionId: canonicalSessionId, totalReps: state.totalReps, completedAt: completion.completedAt });
    retentionSignal('workout completed', { sessionId: canonicalSessionId, totalReps: state.totalReps });
    deps.onWorkoutCompleted?.(completion);
    console.log('[WORKOUT_COMPLETE] workout completed', completion);
    return getState();
  }

  function prepareWorkoutStart() {
    hydrateActiveWorkoutPlan();
    completedEventDispatched = false;
    sessionStartedAt = Date.now();
    sessionId = null;
    stopRestTimer();
    updateState({ activeExerciseIndex: 0, activeSetIndex: 0, repCount: 0, totalReps: 0, setStatus: 'ready', workoutStatus: 'ready' });
    return getState();
  }

  function startWorkout(createdSessionId) {
    sessionId = createdSessionId || deps.getSessionId?.() || null;
    if (!sessionId) throw new Error('workout progression requires a canonical session id');
    if (!activeWorkoutPlan) hydrateActiveWorkoutPlan();
    sessionStartedAt = sessionStartedAt || Date.now();
    updateState({ activeExerciseIndex: 0, activeSetIndex: 0, repCount: 0, totalReps: 0, setStatus: 'active', workoutStatus: 'in_progress' });
    log('workout started', { sessionId, workoutId: state.activeWorkoutId, programId: state.activeProgramId });
    return getState();
  }

  function pauseWorkout() {
    stopRestTimer();
    updateState({ workoutStatus: 'paused', setStatus: 'paused' });
    return getState();
  }

  function handleRepAnalysis(snapshot = {}, formResult = null) {
    const nextRepCount = Number(snapshot.repCount ?? state.repCount ?? 0);
    const nextTotalReps = Number(snapshot.totalReps ?? state.totalReps ?? 0);
    updateState({ repCount: nextRepCount, totalReps: nextTotalReps }, { formResult });
    return getState();
  }

  function handleRepComplete(snapshot = {}, formResult = null) {
    const nextRepCount = Number(snapshot.repCount ?? state.repCount ?? 0);
    const nextTotalReps = Number(snapshot.totalReps ?? state.totalReps ?? 0);
    updateState({ repCount: nextRepCount, totalReps: nextTotalReps }, { formResult });
    if (state.targetReps && state.repCount >= state.targetReps && state.setStatus === 'active') {
      startRestTimer(state.restSeconds);
    }
    return getState();
  }

  function skipRest() {
    if (state.setStatus !== 'rest') return getState();
    stopRestTimer();
    return advanceWorkoutProgress(false);
  }

  function repeatSet() {
    stopRestTimer();
    return updateState({ repCount: 0, setStatus: 'active' });
  }

  function nextExercise() {
    stopRestTimer();
    return advanceWorkoutProgress(true);
  }

  function getCurrentExerciseMeta() {
    return activeWorkoutPlan?.exercises?.[state.activeExerciseIndex] || null;
  }

  function getCurrentExerciseId() {
    return getCurrentExerciseMeta()?.exerciseId || null;
  }

  function getPlan() {
    return activeWorkoutPlan ? { ...activeWorkoutPlan, exercises: activeWorkoutPlan.exercises.map((exercise) => ({ ...exercise })) } : null;
  }

  function getState() {
    return { ...state, restRemainingSec, sessionId };
  }

  function configure(nextDeps) {
    deps = { ...deps, ...(nextDeps || {}) };
    publishState();
    log('configured', { hasSessionWrite: Boolean(deps.sessionWrite?.completeSession), hasHudRuntime: Boolean(global.HudRuntime?.render) });
    return getState();
  }

  function safeCall(fn, label) {
    return (...args) => {
      try { return fn(...args); }
      catch (err) {
        const message = `${label} failed: ${err?.message || err}`;
        console.error('[WORKOUT_PROGRESS] error', err);
        setVisibleRuntimeError(message);
        throw err;
      }
    };
  }

  global.WorkoutProgressionRuntime = {
    configure,
    hydrateActiveWorkoutPlan: safeCall(hydrateActiveWorkoutPlan, 'Workout plan hydration'),
    prepareWorkoutStart: safeCall(prepareWorkoutStart, 'Workout preparation'),
    startWorkout: safeCall(startWorkout, 'Workout progression start'),
    pauseWorkout: safeCall(pauseWorkout, 'Workout pause'),
    handleRepAnalysis: safeCall(handleRepAnalysis, 'Rep analysis progression'),
    handleRepComplete: safeCall(handleRepComplete, 'Rep completion progression'),
    skipRest: safeCall(skipRest, 'Skip rest'),
    repeatSet: safeCall(repeatSet, 'Repeat set'),
    nextExercise: safeCall(nextExercise, 'Next exercise'),
    completeWorkoutSession: safeCall(completeWorkoutSession, 'Workout completion'),
    getCurrentExerciseMeta,
    getCurrentExerciseId,
    getPlan,
    getState
  };
  log('loaded');
})(typeof window !== 'undefined' ? window : globalThis);
