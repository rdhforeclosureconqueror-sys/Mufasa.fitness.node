(function initAppRuntime(globalScope){
  'use strict';

  const NODE_BASE = 'https://mufasa-fitness-node.onrender.com';
  const state = {
    lastFeatureClick: null,
    lastFeatureBackendUrl: null,
    lastFeatureError: null,
    lastProfileHydrationError: null,
    bootSmokeRan: false,
    startSmokeRuns: 0,
    boundFeatureClicks: false
  };

  function logClick(feature){ state.lastFeatureClick = feature; console.log(`[FEATURE_CLICK] ${feature}`); }
  function logBackend(url){ state.lastFeatureBackendUrl = url; console.log(`[FEATURE_BACKEND] ${url}`); }
  function setError(msg){ state.lastFeatureError = msg; const status = globalScope.document.getElementById('poseStatus'); if (status) status.textContent = msg; }
  function boolText(value){ return value ? 'yes' : 'no'; }
  function getToken(){ return globalScope.APP_AUTH?.token || globalScope.localStorage?.getItem('maatAuthToken') || null; }

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
    const dashboardReady = Boolean(dashboardBtn && !dashboardBtn.disabled && typeof dashboardBtn.onclick === 'function');
    const cameraReady = Boolean(cameraBtn && !cameraBtn.disabled && typeof cameraBtn.onclick === 'function');
    const startReady = Boolean(startBtn && !startBtn.disabled && typeof startBtn.onclick === 'function');
    const profileReady = Boolean(profileSummary && !/not signed in|loading/i.test(profileSummary.textContent || ''));
    const retentionReady = Boolean(retentionStatus && !/sign in|loading/i.test(retentionStatus.textContent || ''));
    const dashboardEnabled = Boolean(dashboardBtn && !dashboardBtn.disabled);
    panel.textContent = [
      `reason: ${reason}`,
      `auth authenticated: ${boolText(auth.isAuthenticated === true)}`,
      `profile ready: ${boolText(profileReady)}`,
      `retention ready: ${boolText(retentionReady)}`,
      `dashboard enabled: ${boolText(dashboardEnabled)}`,
      `camera enabled: ${boolText(cameraReady)}`,
      `start workout enabled: ${boolText(startReady)}`,
      `workout library enabled: ${boolText(Boolean(workoutLibraryBtn && !workoutLibraryBtn.disabled))}`,
      `last feature click: ${state.lastFeatureClick || 'none'}`,
      `last feature backend URL: ${state.lastFeatureBackendUrl || 'none'}`,
      `profile hydration error: ${state.lastProfileHydrationError || 'none'}`,
      `last feature error: ${state.lastFeatureError || 'none'}`
    ].join('\n');
  }

  async function fetchJsonAuthed(path){
    const token = getToken();
    const url = `${NODE_BASE}${path}`;
    logBackend(url);
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = json?.error || json?.message || `${res.status}`;
      throw new Error(`${path} failed (${res.status}): ${msg}`);
    }
    return json || {};
  }

  async function hydrateAuthAndProfile(reason){
    const token = getToken();
    if (!token) return;
    try {
      const me = await fetchJsonAuthed('/api/auth/me');
      const user = me.user || me.data?.user || me;
      globalScope.APP_AUTH = { ...(globalScope.APP_AUTH || {}), token, isAuthenticated: true, user };
      globalScope.APP_AUTH.isAuthenticated = true;
      const email = user?.email || globalScope.APP_AUTH?.user?.email || 'unknown';
      const summary = globalScope.document.getElementById('profileSummary');
      if (summary) summary.textContent = `Signed in as ${email}`;
    } catch (error) {
      state.lastProfileHydrationError = error?.message || String(error);
      setError(`Auth propagation failed: ${state.lastProfileHydrationError}`);
      updateFeaturePanel(`auth-hydration-failed:${reason}`);
      return;
    }

    try {
      const profile = await fetchJsonAuthed('/api/me/profile');
      const merged = { ...(globalScope.USER_PROFILE || {}), ...(profile.profile || profile.data || profile || {}) };
      globalScope.USER_PROFILE = merged;
      if (typeof globalScope.window?.onLoginUI === 'function') globalScope.window.onLoginUI(merged);
      state.lastProfileHydrationError = null;
    } catch (error) {
      state.lastProfileHydrationError = error?.message || String(error);
      const email = globalScope.APP_AUTH?.user?.email || 'unknown';
      const summary = globalScope.document.getElementById('profileSummary');
      if (summary) summary.textContent = `Signed in as ${email}\nProfile fetch failed: ${state.lastProfileHydrationError}`;
    }
  }

  function ensureRuntimeHandlers(){
    if (typeof globalScope.window.connectCamera !== 'function') {
      globalScope.window.connectCamera = async function runtimeConnectCamera(){
        logBackend('navigator.mediaDevices.getUserMedia');
        if (!globalScope.navigator?.mediaDevices?.getUserMedia) throw new Error('mediaDevices.getUserMedia unavailable');
        return globalScope.navigator.mediaDevices.getUserMedia({ video: true });
      };
    }
    if (typeof globalScope.window.startWorkout !== 'function') {
      globalScope.window.startWorkout = async function runtimeStartWorkout(){
        const token = getToken();
        const url = `${NODE_BASE}/api/sessions`;
        logBackend(url);
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ source: 'app-runtime-fallback' }) });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (!res.ok) throw new Error(`/api/sessions failed (${res.status}): ${json?.error || json?.message || 'route error'}`);
        return json;
      };
    }
  }

  function bindFeatureClicks(){
    if (state.boundFeatureClicks) return;
    state.boundFeatureClicks = true;
    const cameraBtn = globalScope.document.getElementById('connectBtn');
    const startBtn = globalScope.document.getElementById('startBtn');

    if (cameraBtn) cameraBtn.addEventListener('click', async () => { logClick('camera'); try { await globalScope.window.connectCamera(); } catch (e) { setError(`Camera unavailable: ${e?.message || e}`); } updateFeaturePanel('camera click'); });
    if (startBtn) startBtn.addEventListener('click', async () => {
      logClick('start_workout');
      if (state.startSmokeRuns < 1) {
        state.startSmokeRuns += 1;
        const smokeUrl = `${NODE_BASE}/__diagnostic-smoke`;
        logBackend(smokeUrl);
        try { await fetch(smokeUrl, { cache: 'no-store' }); } catch (_) {}
      }
      try { await globalScope.window.startWorkout(); } catch (e) { setError(`Start workout unavailable: ${e?.message || e}`); }
      updateFeaturePanel('start click');
    });
  }

  async function forceActivate(reason){
    if (!state.bootSmokeRan) {
      state.bootSmokeRan = true;
      const smokeUrl = `${NODE_BASE}/__diagnostic-smoke`;
      logBackend(smokeUrl);
      try { await fetch(smokeUrl, { cache: 'no-store' }); } catch (_) {}
    }

    await hydrateAuthAndProfile(reason);
    const auth = globalScope.APP_AUTH || {};
    if (auth.isAuthenticated !== true) { updateFeaturePanel(`${reason}:not-authenticated`); return; }

    ensureRuntimeHandlers();
    if (typeof globalScope.bindPrimaryButtonsAfterLogin === 'function') globalScope.bindPrimaryButtonsAfterLogin(`app-runtime:${reason}`);
    ['dashboardBtn','exerciseLibraryBtn','connectBtn','startBtn'].forEach((id) => { const el = globalScope.document.getElementById(id); if (el) { el.disabled = false; el.removeAttribute('disabled'); } });

    try { if (typeof globalScope.window?.ensureRetentionFlowLoaded === 'function') await globalScope.window.ensureRetentionFlowLoaded('app-runtime'); } catch (e) { setError(`retention load failed: ${e?.message || e}`); }
    try { if (typeof globalScope.window?.__retentionFlowRefresh === 'function') await globalScope.window.__retentionFlowRefresh('app-runtime'); } catch (e) { setError(`retention refresh failed: ${e?.message || e}`); }
    const retentionStatus = globalScope.document.getElementById('retentionFlowStatus');
    if (auth.isAuthenticated === true && retentionStatus && /sign in/i.test(retentionStatus.textContent || '')) {
      retentionStatus.textContent = 'Retention route missing';
    }
    bindFeatureClicks();
    updateFeaturePanel(`activated:${reason}`);
  }

  ['auth:ready','auth:changed'].forEach((evt)=> globalScope.addEventListener(evt, ()=>forceActivate(evt)));
  globalScope.addEventListener('DOMContentLoaded', ()=>updateFeaturePanel('DOMContentLoaded'));
  globalScope.addEventListener('load', ()=>forceActivate('load'));
  globalScope.__appRuntime = { forceActivate, updateFeaturePanel, state };
})(window);
