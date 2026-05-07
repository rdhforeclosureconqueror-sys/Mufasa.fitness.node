(function initRepRuntime(globalScope) {
  'use strict';

  const global = globalScope || window;
  const state = global.__REP_RUNTIME_STATE = {
    ...(global.__REP_RUNTIME_STATE || {}),
    loaded: true,
    repCount: 0,
    totalReps: 0,
    phase: 'up',
    lastSentAt: 0,
    lastPersistError: null,
    lastPersistAt: null,
    lastPayload: null
  };

  function log(message, details) {
    if (details === undefined) console.log(`[REP_RUNTIME] ${message}`);
    else console.log(`[REP_RUNTIME] ${message}`, details);
  }

  function setVisibleRuntimeError(message) {
    state.lastPersistError = message;
    const poseStatus = global.document?.getElementById('poseStatus');
    const featurePanel = global.document?.getElementById('featureActivationStatus');
    if (poseStatus) {
      poseStatus.textContent = message;
      poseStatus.classList?.add?.('status-bad');
    }
    if (featurePanel && !String(featurePanel.textContent || '').includes(message)) {
      featurePanel.textContent = `${featurePanel.textContent || ''}\nrep runtime error: ${message}`.trim();
    }
  }

  function reset(nextState) {
    state.repCount = Number(nextState?.repCount || 0);
    state.totalReps = Number(nextState?.totalReps || 0);
    state.phase = String(nextState?.phase || 'up');
    state.lastPersistError = null;
    state.lastPayload = null;
    log('reset', { repCount: state.repCount, totalReps: state.totalReps, phase: state.phase });
  }

  function sync(nextState) {
    if (nextState?.repCount != null) state.repCount = Number(nextState.repCount || 0);
    if (nextState?.totalReps != null) state.totalReps = Number(nextState.totalReps || 0);
    if (nextState?.phase) state.phase = String(nextState.phase);
    return snapshot();
  }

  function snapshot() {
    return {
      repCount: state.repCount,
      totalReps: state.totalReps,
      phase: state.phase,
      lastSentAt: state.lastSentAt,
      lastPersistError: state.lastPersistError,
      lastPersistAt: state.lastPersistAt,
      lastPayload: state.lastPayload ? { ...state.lastPayload } : null
    };
  }

  function persistRepUpdate(options) {
    const {
      sessionId,
      exerciseId,
      repsThisSet,
      totalReps,
      depthScore,
      goodForm,
      sessionWrite = global.SessionWrite,
      now = Date.now(),
      minIntervalMs = 120
    } = options || {};

    if (!sessionId) return false;
    if (now - state.lastSentAt < minIntervalMs) return false;
    state.lastSentAt = now;
    const payload = {
      sessionId,
      exerciseId,
      repsThisSet,
      totalReps,
      depthScore,
      goodForm,
      ts: now
    };
    state.lastPayload = payload;

    try {
      if (!sessionWrite?.enqueueRepUpdate) throw new Error('SessionWrite.enqueueRepUpdate missing');
      sessionWrite.enqueueRepUpdate(payload);
      state.lastPersistAt = new Date(now).toISOString();
      state.lastPersistError = null;
      log('rep update enqueued', payload);
      global.__liveWorkoutBreakpoints?.markPass?.('rep-persisted', { sessionId, exerciseId, totalReps });
      return true;
    } catch (err) {
      const message = err?.message || String(err || 'rep_persist_failed');
      console.error('[REP_RUNTIME] rep update failed', err);
      global.__liveWorkoutBreakpoints?.markFail?.('rep-persisted', err, { sessionId, exerciseId, totalReps });
      setVisibleRuntimeError(`Rep persistence failed: ${message}`);
      return false;
    }
  }

  global.RepRuntime = {
    reset,
    sync,
    snapshot,
    persistRepUpdate,
    getState: snapshot
  };

  log('loaded');
})(typeof window !== 'undefined' ? window : globalThis);
