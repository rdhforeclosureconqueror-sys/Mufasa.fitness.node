(function initLiveWorkoutBreakpoints(globalScope) {
  'use strict';

  const global = globalScope || window;
  const MILESTONES = [
    'login-ready',
    'auth-ready',
    'camera-clicked',
    'camera-stream-received',
    'video-playing',
    'detector-init-started',
    'detector-ready',
    'workout-start-clicked',
    'workoutStartClicked',
    'workoutStartHandlerEntered',
    'selectedWorkoutResolved',
    'fallbackWorkoutApplied',
    'sessionPayloadBuilt',
    'sessionCreateAttempted',
    'sessionCreateSucceeded',
    'sessionCreateFailed',
    'session-created',
    'liveModeEntered',
    'live-mode-entered',
    'poseRuntimeLoadAttempted',
    'pose-runtime-loading',
    'poseRuntimeLoaded',
    'poseRuntimeFailed',
    'guidancePromptStarted',
    'poseLoopStarted',
    'pose-loop-started',
    'firstPoseFrameReceived',
    'first-pose-frame',
    'rep-analysis-called',
    'first-rep-counted',
    'rep-persisted',
    'workout-completed',
    'dashboard-propagated'
  ];

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
  }

  function normalizeError(error) {
    if (!error) return null;
    if (typeof error === 'string') return error;
    return error.message || error.name || String(error);
  }

  function safeExtra(extra) {
    if (!extra || typeof extra !== 'object') return extra || null;
    try { return JSON.parse(JSON.stringify(extra)); }
    catch (_) { return { unserializable: true, summary: String(extra) }; }
  }

  const existing = global.__liveWorkoutBreakpoints;
  const state = existing && typeof existing === 'object' ? existing : {};
  state.milestones = state.milestones || {};
  state.order = MILESTONES.slice();
  state.lastUpdatedAt = state.lastUpdatedAt || nowIso();

  for (const name of MILESTONES) {
    state.milestones[name] = {
      status: 'pending',
      timestamp: null,
      error: null,
      extra: null,
      ...(state.milestones[name] || {})
    };
  }

  function update(name, status, extra, error) {
    if (!state.milestones[name]) {
      state.order.push(name);
      state.milestones[name] = { status: 'pending', timestamp: null, error: null, extra: null };
    }
    const next = state.milestones[name];
    if (next.status === 'pass' && status === 'pass') return { ...next };
    next.status = status;
    next.timestamp = nowIso();
    next.error = normalizeError(error);
    next.extra = safeExtra(extra);
    state.lastUpdatedAt = next.timestamp;
    const tag = status === 'pass' ? '[LIVE_WORKOUT_PASS]' : status === 'fail' ? '[LIVE_WORKOUT_FAIL]' : '[LIVE_WORKOUT_BREAKPOINT]';
    const payload = { milestone: name, status, timestamp: next.timestamp, error: next.error, extra: next.extra };
    if (status === 'fail') console.error(tag, payload);
    else console.log(tag, payload);
    global.StatusPanels?.renderLiveWorkoutBreakpointStatus?.(`live-workout:${name}:${status}`);
    return { ...next };
  }

  state.markPending = (name, extra) => update(name, 'pending', extra, null);
  state.markPass = (name, extra) => update(name, 'pass', extra, null);
  state.markFail = (name, error, extra) => update(name, 'fail', extra, error);
  function shouldSkipBlocking(name) {
    if (name === 'sessionCreateFailed' && state.milestones.sessionCreateSucceeded?.status === 'pass') return true;
    if (name === 'poseRuntimeFailed' && state.milestones.poseRuntimeLoaded?.status === 'pass') return true;
    return false;
  }

  state.getFirstBlocking = () => {
    for (const name of state.order) {
      const item = state.milestones[name];
      if (!item || item.status === 'pass' || shouldSkipBlocking(name)) continue;
      return { name, ...item };
    }
    return null;
  };
  state.snapshot = () => ({
    order: state.order.slice(),
    lastUpdatedAt: state.lastUpdatedAt,
    milestones: Object.fromEntries(state.order.map((name) => [name, { ...(state.milestones[name] || {}) }]))
  });
  state.summaryLine = () => {
    const first = state.getFirstBlocking();
    if (!first) return 'live workout breakpoint: all milestones passed';
    const detail = first.error ? ` (${first.error})` : '';
    return `live workout breakpoint: ${first.name} ${first.status}${detail}`;
  };
  state.traceLines = () => state.order
    .filter((name) => /workoutStart|selectedWorkout|fallbackWorkout|session|liveMode|poseRuntime|guidancePrompt|poseLoopStarted|firstPoseFrameReceived/.test(name))
    .map((name) => {
      const item = state.milestones[name] || {};
      const detail = item.error ? ` error=${item.error}` : '';
      const extra = item.extra ? ` extra=${JSON.stringify(item.extra).slice(0, 240)}` : '';
      return `live workout trace: ${name} ${item.status || 'pending'}${detail}${extra}`;
    });

  global.__liveWorkoutBreakpoints = state;

  global.addEventListener?.('auth:ready', (event) => {
    if (event?.detail?.isAuthenticated !== true) return;
    const user = event?.detail?.user || {};
    state.markPass('login-ready', {
      reason: 'auth:ready',
      userId: user.userId || user.id || null,
      email: user.email || null
    });
    state.markPass('auth-ready', { reason: 'auth:ready' });
  });
  global.addEventListener?.('retention:completion-propagated', (event) => {
    state.markPass('dashboard-propagated', { key: event?.detail?.key || null });
  });

  console.log('[LIVE_WORKOUT_BREAKPOINT]', { tracker: 'installed', milestones: MILESTONES });
})(typeof window !== 'undefined' ? window : globalThis);
