(function initHudRuntime(globalScope) {
  'use strict';

  const global = globalScope || window;
  if (global.__POCKET_PT_HUD_RUNTIME_INITIALIZED) {
    if (new URLSearchParams(global.location?.search || '').get('debugWorkoutPerformance') === '1') console.info('[WORKOUT_PERF] duplicate HUD runtime initialization ignored');
    return;
  }
  global.__POCKET_PT_HUD_RUNTIME_INITIALIZED = true;
  const state = global.__HUD_RUNTIME_STATE = {
    ...(global.__HUD_RUNTIME_STATE || {}),
    loaded: true,
    lastRenderAt: null,
    lastLogAt: 0,
    lastCueAt: null,
    lastCue: null,
    workoutStatus: 'idle',
    setStatus: 'ready',
    currentExercise: null,
    repCount: 0,
    lastError: null
  };
  let deps = {};

  function log(message, details) {
    if (details === undefined) console.log(`[HUD_RUNTIME] ${message}`);
    else console.log(`[HUD_RUNTIME] ${message}`, details);
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
      panel.textContent = `${panel.textContent || ''}\nhud runtime error: ${message}`.trim();
    }
  }

  function configure(nextDeps) {
    deps = { ...deps, ...(nextDeps || {}) };
    log('configured', { hasMarkPerfMetric: typeof deps.markPerfMetric === 'function' });
    return snapshot();
  }

  function getRefs() {
    return {
      workoutHudEl: deps.workoutHudEl || byId('workoutHud'),
      hudExerciseNameEl: deps.hudExerciseNameEl || byId('hudExerciseName'),
      hudSetEl: deps.hudSetEl || byId('hudSet'),
      hudRepsEl: deps.hudRepsEl || byId('hudReps'),
      hudTempoEl: deps.hudTempoEl || byId('hudTempo'),
      hudRestEl: deps.hudRestEl || byId('hudRest'),
      hudTimerEl: deps.hudTimerEl || byId('hudTimer'),
      workoutDetailsBtn: byId('workoutDetailsBtn'),
      closeWorkoutDetailsBtn: byId('closeWorkoutDetailsBtn'),
      workoutDetailsPanel: byId('workoutDetailsPanel'),
      hudTimerStateEl: deps.hudTimerStateEl || byId('hudTimerState'),
      hudNextExerciseEl: deps.hudNextExerciseEl || byId('hudNextExercise'),
      hudCoachCueEl: deps.hudCoachCueEl || byId('hudCoachCue'),
      exerciseLabelEl: deps.exerciseLabelEl || byId('exerciseLabel'),
      repCountEl: deps.repCountEl || byId('repCount'),
      avatarDebugOverlayEl: deps.avatarDebugOverlayEl || byId('avatarDebugOverlay')
    };
  }

  function getPrimaryCue(formResult = null, options = {}) {
    const plan = options.activeWorkoutPlan || deps.getActiveWorkoutPlan?.() || null;
    const workoutState = options.activeWorkoutState || deps.getActiveWorkoutState?.() || {};
    if (formResult?.corrections?.length) {
      const cue = formResult.corrections[0].text;
      if (cue !== state.lastCue) coachLog('active correction cue', { cue, status: formResult.overallStatus || null });
      state.lastCue = cue;
      state.lastCueAt = new Date().toISOString();
      return cue;
    }
    const current = plan?.exercises?.[workoutState.activeExerciseIndex || 0];
    const cue = current?.formCues?.[0] || current?.instructions?.[0] || 'Stay controlled and breathe.';
    if (cue !== state.lastCue) coachLog('primary cue', { cue, exercise: current?.name || null });
    state.lastCue = cue;
    state.lastCueAt = new Date().toISOString();
    return cue;
  }

  function formatTime(seconds) { const safe=Math.max(0,Number(seconds)||0); return `${String(Math.floor(safe/60)).padStart(2,'0')}:${String(Math.floor(safe%60)).padStart(2,'0')}`; }
  function focusLabel(workoutState) { if(workoutState.setStatus==='preparing')return 'Get ready'; if(workoutState.setStatus==='transition')return 'Transition'; if(workoutState.setStatus==='completed')return 'Completed'; if(workoutState.timerStatus==='paused')return 'Paused'; if(workoutState.timerStatus==='running')return 'Running'; return 'Ready'; }
  function bindDetails(refs){ if(!refs.workoutDetailsBtn||refs.workoutDetailsBtn.dataset.focusBound)return; const setOpen=(open)=>{refs.workoutDetailsPanel.hidden=!open;refs.workoutDetailsBtn.setAttribute('aria-expanded',String(open));if(open)refs.closeWorkoutDetailsBtn?.focus?.();if(new URLSearchParams(global.location?.search||'').get('debugWorkoutFocus')==='1')console.info('[WORKOUT_FOCUS]',open?'details opened':'details closed');}; refs.workoutDetailsBtn.addEventListener('click',()=>setOpen(true));refs.closeWorkoutDetailsBtn?.addEventListener('click',()=>setOpen(false));refs.workoutDetailsBtn.dataset.focusBound='1'; }

  function render(options = {}) {
    try {
      if (global.__workoutPerformance) global.__workoutPerformance.hudRenders += 1;
      const workoutState = options.activeWorkoutState || deps.getActiveWorkoutState?.() || {};
      const plan = options.activeWorkoutPlan || deps.getActiveWorkoutPlan?.() || null;
      const formResult = options.formResult || null;
      const restRemainingSec = Number(options.restRemainingSec ?? deps.getRestRemainingSec?.() ?? 0);
      const refs = getRefs();
      bindDetails(refs);
      const debugFocus=new URLSearchParams(global.location?.search||'').get('debugWorkoutFocus')==='1';
      const debugDetails=byId('workoutDebugDetails');if(debugDetails)debugDetails.hidden=!debugFocus;
      const now = Date.now();
      state.lastRenderAt = new Date(now).toISOString();
      state.workoutStatus = workoutState.workoutStatus || 'idle';
      state.setStatus = workoutState.setStatus || 'ready';
      state.currentExercise = workoutState.currentExercise || null;
      state.repCount = Number(workoutState.repCount || 0);
      if (!state.lastLogAt || now - state.lastLogAt > 2500) {
        state.lastLogAt = now;
        log('render', {
          workoutStatus: state.workoutStatus,
          setStatus: state.setStatus,
          currentExercise: state.currentExercise,
          repCount: state.repCount
        });
      }
      const perfValues = global.__perfMetrics?.values || {};
      if (perfValues.workoutHudReadyMs == null && typeof deps.markPerfMetric === 'function') {
        deps.markPerfMetric('workoutHudReadyMs', Math.round(global.performance?.now?.() || 0));
      }
      const totalSets = plan?.exercises?.[workoutState.activeExerciseIndex || 0]?.sets || 1;
      if (refs.hudExerciseNameEl) refs.hudExerciseNameEl.textContent = workoutState.currentExercise || '--';
      if (refs.hudSetEl) refs.hudSetEl.textContent = `Set ${Number(workoutState.activeSetIndex || 0) + 1} of ${totalSets}`;
      if (refs.hudRepsEl) refs.hudRepsEl.textContent = `${Number(workoutState.repCount || 0)} / ${workoutState.targetReps || '--'}`;
      if (refs.hudTempoEl) refs.hudTempoEl.textContent = `${workoutState.tempo || '--'}${workoutState.tempoDescription ? ` — ${workoutState.tempoDescription}` : ''}`;
      if (refs.hudRestEl) refs.hudRestEl.textContent = `${Number(workoutState.remainingSeconds ?? restRemainingSec)} seconds remaining`;
      if (refs.hudTimerEl) { refs.hudTimerEl.textContent=formatTime(workoutState.remainingSeconds ?? restRemainingSec); refs.hudTimerEl.setAttribute('aria-label',`${focusLabel(workoutState)}: ${Number(workoutState.remainingSeconds ?? restRemainingSec)} seconds remaining`); }
      if (refs.hudTimerStateEl) refs.hudTimerStateEl.textContent = focusLabel(workoutState);
      if (refs.hudNextExerciseEl) refs.hudNextExerciseEl.textContent = workoutState.nextExercise || '--';
      if (refs.hudCoachCueEl) refs.hudCoachCueEl.textContent = getPrimaryCue(formResult, { activeWorkoutPlan: plan, activeWorkoutState: workoutState });
      if (refs.exerciseLabelEl) refs.exerciseLabelEl.textContent = workoutState.currentExercise || '--';
      if (refs.repCountEl) refs.repCountEl.textContent = String(workoutState.repCount || 0);
      if (refs.workoutHudEl) refs.workoutHudEl.classList.toggle('resting', workoutState.setStatus === 'transition');
      const isDebug = global.__debugWorkoutOverlay === true || Boolean(deps.isAvatarDebug?.());
      if (refs.avatarDebugOverlayEl) refs.avatarDebugOverlayEl.style.display = isDebug ? 'block' : 'none';
      return snapshot();
    } catch (err) {
      const message = err?.message || String(err || 'hud_render_failed');
      console.error('[HUD_RUNTIME] render failed', err);
      setVisibleRuntimeError(`HUD render failed: ${message}`);
      throw err;
    }
  }

  function updateTimer(workoutState = {}) {
    if (global.__workoutPerformance) global.__workoutPerformance.timerUpdates += 1;
    const timer = byId('hudTimer');
    const label = byId('hudTimerState');
    const seconds = Number(workoutState.remainingSeconds || 0);
    if (timer) {
      timer.textContent = formatTime(seconds);
      timer.setAttribute('aria-label', `${focusLabel(workoutState)}: ${seconds} seconds remaining`);
    }
    if (label) label.textContent = focusLabel(workoutState);
    state.timerUpdates = Number(state.timerUpdates || 0) + 1;
    return snapshot();
  }

  function snapshot() {
    return { ...state };
  }

  global.HudRuntime = { configure, render, updateTimer, getPrimaryCue, getState: snapshot };
  log('loaded');
})(typeof window !== 'undefined' ? window : globalThis);
