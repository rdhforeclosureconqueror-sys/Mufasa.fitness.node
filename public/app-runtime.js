(function initAppRuntime(globalScope){
  'use strict';

  const NODE_BASE = globalScope.RuntimeState?.getBackendOrigin?.() || globalScope.location.origin;
  const HYDRATE_DEBOUNCE_MS = 1200;
  const state = {
    lastFeatureClick: null,
    lastFeatureBackendUrl: null,
    lastFeatureError: null,
    lastProfileHydrationError: null,
    boundFeatureClicks: false,
    hydrationInFlight: null,
    hydrationLastStartedAt: 0,
    hydrationLastToken: null,
    hydrationLastReason: null,
    cameraDiagnostics: {
      buttonClicked: false,
      getUserMediaCalled: false,
      streamReceived: false,
      videoElementReady: false,
      videoPlaying: false,
      lastCameraError: null
    }
  };

  function logClick(feature){ state.lastFeatureClick = feature; console.log(`[FEATURE_CLICK] ${feature}`); }
  function logBackend(url){ state.lastFeatureBackendUrl = url; console.log(`[FEATURE_BACKEND] ${url}`); }
  function setError(msg){
    state.lastFeatureError = msg;
    const status = globalScope.document.getElementById('poseStatus');
    const brain = globalScope.document.getElementById('brainStatus');
    if (status) status.textContent = msg;
    if (brain) brain.textContent = msg;
  }
  function boolText(value){ return value ? 'yes' : 'no'; }
  function getToken(){ return globalScope.APP_AUTH?.token || globalScope.localStorage?.getItem('maatAuthToken') || null; }

  function isAuthenticated(){ return (globalScope.APP_AUTH || {}).isAuthenticated === true || Boolean(getToken()); }

  function setButtonInteractive(el, enabled, reason){
    if (!el) return false;
    el.disabled = !enabled;
    if (enabled) {
      el.removeAttribute('disabled');
      el.removeAttribute('data-disabled');
      el.setAttribute('aria-disabled', 'false');
      el.style.pointerEvents = 'auto';
      el.classList?.remove?.('disabled', 'is-disabled', 'btn-disabled');
      if (reason) el.title = reason;
    } else {
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('aria-disabled', 'true');
      if (reason) {
        el.title = reason;
        el.setAttribute('data-blocked-reason', reason);
      }
    }
    return true;
  }

  function clearStaleAppError(reason){
    const stale = globalScope.__lastAppError;
    if (typeof stale === 'string' && /toSafeUserId/i.test(stale)) {
      globalScope.__lastAppError = null;
      console.log('[APP_RUNTIME] cleared stale app error', { reason, stale });
      globalScope.updateActivationStatusPanel?.(`cleared stale app error:${reason}`);
      return true;
    }
    return false;
  }

  function getStartWorkoutBlockedReason(){
    const retentionStatus = globalScope.document.getElementById('retentionFlowStatus');
    const retentionReady = Boolean(retentionStatus && !/not_ready|sign in|loading/i.test(retentionStatus.textContent || ''));
    const workoutState = globalScope.WorkoutProgressionRuntime?.getState?.() || {};
    const plan = globalScope.WorkoutProgressionRuntime?.getPlan?.() || null;
    const hasPlan = Boolean(plan?.exercises?.length || workoutState.activeWorkoutId || workoutState.activeProgramId);
    if (!retentionReady && !hasPlan) return 'Complete intake/goals or choose an exercise first.';
    return '';
  }

  function applyAuthenticatedPilotButtonGates(reason){
    if (!isAuthenticated()) return false;
    ['dashboardBtn','exerciseLibraryBtn','connectBtn','runSystemDiagnosticBtn'].forEach((id) => {
      setButtonInteractive(globalScope.document.getElementById(id), true);
    });

    const startBtn = globalScope.document.getElementById('startBtn');
    const blockedReason = getStartWorkoutBlockedReason();
    if (startBtn && blockedReason && startBtn.disabled) {
      startBtn.setAttribute('data-blocked-reason', blockedReason);
      startBtn.title = blockedReason;
      startBtn.setAttribute('aria-disabled', 'true');
    }

    const cameraConnected = globalScope.WorkoutRuntime?.getState?.().cameraActive === true || globalScope.__cameraStatus === 'connected';
    if (cameraConnected) {
      setButtonInteractive(globalScope.document.getElementById('fullscreenCameraBtn'), true);
      setButtonInteractive(globalScope.document.getElementById('ohsaBtn'), true);
    }
    clearStaleAppError(reason);
    return true;
  }

  function updateFeaturePanel(reason){
    const panel = globalScope.document.getElementById('featureActivationStatus');
    if (!panel) return;
    const dashboardBtn = globalScope.document.getElementById('dashboardBtn');
    const cameraBtn = globalScope.document.getElementById('connectBtn');
    const startBtn = globalScope.document.getElementById('startBtn');
    const profileSummary = globalScope.document.getElementById('profileSummary');
    const retentionStatus = globalScope.document.getElementById('retentionFlowStatus');
    const workoutLibraryBtn = globalScope.document.getElementById('exerciseLibraryBtn');
    const auth = globalScope.APP_AUTH || {};
    const profileReady = Boolean(profileSummary && !/not signed in|loading/i.test(profileSummary.textContent || ''));
    const retentionReady = Boolean(retentionStatus && !/sign in|loading/i.test(retentionStatus.textContent || ''));
    const cameraDiag = state.cameraDiagnostics;
    panel.textContent = [
      `reason: ${reason}`,
      `auth authenticated: ${boolText(auth.isAuthenticated === true)}`,
      `profile ready: ${boolText(profileReady)}`,
      `retention ready: ${boolText(retentionReady)}`,
      `dashboard enabled: ${boolText(Boolean(dashboardBtn && !dashboardBtn.disabled))}`,
      `camera enabled: ${boolText(Boolean(cameraBtn && !cameraBtn.disabled))}`,
      `start workout enabled: ${boolText(Boolean(startBtn && !startBtn.disabled))}`,
      `start workout blocked reason: ${startBtn?.getAttribute?.('data-blocked-reason') || getStartWorkoutBlockedReason() || 'none'}`,
      `workout library enabled: ${boolText(Boolean(workoutLibraryBtn && !workoutLibraryBtn.disabled))}`,
      `last feature click: ${state.lastFeatureClick || 'none'}`,
      `last feature backend URL: ${state.lastFeatureBackendUrl || 'none'}`,
      `profile hydration error: ${state.lastProfileHydrationError || 'none'}`,
      `last feature error: ${state.lastFeatureError || 'none'}`,
      `camera button clicked: ${boolText(cameraDiag.buttonClicked)}`,
      `camera getUserMedia called: ${boolText(cameraDiag.getUserMediaCalled)}`,
      `camera stream received: ${boolText(cameraDiag.streamReceived)}`,
      `camera video element found/created: ${boolText(cameraDiag.videoElementReady)}`,
      `camera video playing: ${boolText(cameraDiag.videoPlaying)}`,
      `camera last error: ${cameraDiag.lastCameraError || 'none'}`,
      globalScope.__liveWorkoutBreakpoints?.summaryLine?.() || 'live workout breakpoint: tracker unavailable'
    ].join('\n');
  }

  async function fetchJsonAuthed(path){
    const token = getToken();
    const url = `${NODE_BASE}${path}`;
    logBackend(url);
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(`${path} failed (${res.status}): ${json?.error || json?.message || `${res.status}`}`);
    return json || {};
  }

  async function hydrateAuthAndProfile(reason){
    const token = getToken();
    if (!token) return;
    const now = Date.now();
    if (state.hydrationInFlight) return state.hydrationInFlight;
    if (state.hydrationLastToken === token && now - state.hydrationLastStartedAt < HYDRATE_DEBOUNCE_MS) return;
    state.hydrationLastStartedAt = now;
    state.hydrationLastToken = token;
    state.hydrationLastReason = reason;

    state.hydrationInFlight = (async () => {
      try {
        const me = await fetchJsonAuthed('/api/auth/me');
        const user = me.user || me.data?.user || me;
        globalScope.setCanonicalAuthState?.({ token, user }, { reason: `app-runtime:${reason}` });
        const summary = globalScope.document.getElementById('profileSummary');
        if (summary) summary.textContent = `Signed in as ${user?.email || 'unknown'}`;

        const profile = await fetchJsonAuthed('/api/me/profile');
        const merged = { ...(globalScope.USER_PROFILE || {}), ...(profile.profile || profile.data || profile || {}) };
        globalScope.USER_PROFILE = merged;
        if (typeof globalScope.window?.onLoginUI === 'function') globalScope.window.onLoginUI(merged);
        state.lastProfileHydrationError = null;
      } catch (error) {
        state.lastProfileHydrationError = error?.message || String(error);
        setError(`Auth/profile hydration failed: ${state.lastProfileHydrationError}`);
      } finally {
        state.hydrationInFlight = null;
      }
    })();

    return state.hydrationInFlight;
  }

  function ensureRuntimeHandlers(){
    const missing = ['connectBtn','startBtn','fullscreenCameraBtn','exitCameraBtn','video','workoutHud','poseStatus','brainStatus']
      .filter((id) => !globalScope.document.getElementById(id));
    if (missing.length) setError(`Camera/workout DOM missing: ${missing.join(', ')}`);
    if (typeof globalScope.window.connectCamera !== 'function' && typeof globalScope.WorkoutRuntime?.connectCamera === 'function') {
      globalScope.window.connectCamera = (...args) => globalScope.WorkoutRuntime.connectCamera(...args);
    }
    if (typeof globalScope.window.startWorkout !== 'function' && typeof globalScope.WorkoutRuntime?.startWorkout === 'function') {
      globalScope.window.startWorkout = (...args) => globalScope.WorkoutRuntime.startWorkout(...args);
    }
  }


  function bindFeatureClicks(){
    if (state.boundFeatureClicks) return;
    state.boundFeatureClicks = true;
    const cameraBtn = globalScope.document.getElementById('connectBtn');
    const startBtn = globalScope.document.getElementById('startBtn');

    // Audit-only listeners: normal camera/workout behavior is owned by ButtonRuntime + WorkoutRuntime.
    // Do not invoke connectCamera/startWorkout here, otherwise a single click double-starts and then stops.
    if (cameraBtn) cameraBtn.addEventListener('click', () => {
      logClick('camera');
      state.cameraDiagnostics.buttonClicked = true;
      state.cameraDiagnostics.lastCameraError = null;
      updateFeaturePanel('camera click observed');
    }, { passive: true });
    if (startBtn) startBtn.addEventListener('click', () => {
      logClick('start_workout');
      updateFeaturePanel('start click observed');
    }, { passive: true });
  }


  async function forceActivate(reason){
    await hydrateAuthAndProfile(reason);
    const auth = globalScope.APP_AUTH || {};
    if (auth.isAuthenticated !== true) { updateFeaturePanel(`${reason}:not-authenticated`); return; }
    ensureRuntimeHandlers();

    if (globalScope.WorkoutRuntime?.configureWorkoutRuntime) {
      globalScope.WorkoutRuntime.configureWorkoutRuntime({
        createSession: async (payload) => {
          const token = getToken();
          const url = `${NODE_BASE}/api/sessions`;
          logBackend(url);
          const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload || { source: 'workout-runtime' }) });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(`/api/sessions failed (${res.status}): ${json?.error || json?.message || 'route error'}`);
          return json;
        }
      });
    }
    if (typeof globalScope.bindPrimaryButtonsAfterLogin === 'function') globalScope.bindPrimaryButtonsAfterLogin(`app-runtime:${reason}`);
    applyAuthenticatedPilotButtonGates(reason);
    bindFeatureClicks();
    updateFeaturePanel(`activated:${reason}`);
  }

  ['auth:ready','auth:changed'].forEach((evt)=> globalScope.addEventListener(evt, ()=>forceActivate(evt)));
  globalScope.addEventListener('DOMContentLoaded', ()=>{ applyAuthenticatedPilotButtonGates('DOMContentLoaded'); updateFeaturePanel('DOMContentLoaded'); });
  globalScope.addEventListener('load', ()=>forceActivate('load'));
  globalScope.addEventListener('camera:connected', ()=>{ applyAuthenticatedPilotButtonGates('camera:connected'); updateFeaturePanel('camera:connected'); });
  globalScope.__appRuntime = { forceActivate, updateFeaturePanel, state, applyAuthenticatedPilotButtonGates, clearStaleAppError, getStartWorkoutBlockedReason };
})(window);
