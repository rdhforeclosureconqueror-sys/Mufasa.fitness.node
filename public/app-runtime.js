(function initAppRuntime(globalScope){
  'use strict';

  const state = {
    lastFeatureClick: null,
    lastFeatureBackendUrl: null,
    lastFeatureError: null
  };

  function logClick(feature){
    state.lastFeatureClick = feature;
    console.log(`[FEATURE_CLICK] ${feature}`);
  }

  function logBackend(url){
    state.lastFeatureBackendUrl = url;
    console.log(`[FEATURE_BACKEND] ${url}`);
  }

  function setError(msg){
    state.lastFeatureError = msg;
    const status = globalScope.document.getElementById('poseStatus');
    if (status) status.textContent = msg;
  }

  function boolText(value){ return value ? 'yes' : 'no'; }

  function updateFeaturePanel(reason){
    const panel = globalScope.document.getElementById('featureActivationStatus');
    if (!panel) return;
    const dashboardBtn = globalScope.document.getElementById('dashboardBtn');
    const cameraBtn = globalScope.document.getElementById('connectBtn');
    const startBtn = globalScope.document.getElementById('startBtn');
    const profileSummary = globalScope.document.getElementById('profileSummary');
    const retentionStatus = globalScope.document.getElementById('retentionFlowStatus');
    const workoutLibraryBtn = globalScope.document.getElementById('exerciseLibraryBtn');
    const dashboardReady = Boolean(dashboardBtn && !dashboardBtn.disabled && typeof dashboardBtn.onclick === 'function');
    const cameraReady = Boolean(cameraBtn && !cameraBtn.disabled && typeof cameraBtn.onclick === 'function');
    const startReady = Boolean(startBtn && !startBtn.disabled && typeof startBtn.onclick === 'function');
    const profileReady = Boolean(profileSummary && !/not signed in|loading/i.test(profileSummary.textContent || ''));
    const retentionReady = Boolean(retentionStatus && !/sign in|loading/i.test(retentionStatus.textContent || ''));
    const dashboardEnabled = Boolean(dashboardBtn && !dashboardBtn.disabled);
    panel.textContent = [
      `reason: ${reason}`,
      `profile ready: ${boolText(profileReady)}`,
      `retention ready: ${boolText(retentionReady)}`,
      `dashboard enabled: ${boolText(dashboardEnabled)}`,
      `camera enabled: ${boolText(cameraReady)}`,
      `start workout enabled: ${boolText(startReady)}`,
      `workout library enabled: ${boolText(Boolean(workoutLibraryBtn && !workoutLibraryBtn.disabled))}`,
      `last feature click: ${state.lastFeatureClick || 'none'}`,
      `last feature backend URL: ${state.lastFeatureBackendUrl || 'none'}`,
      `last feature error: ${state.lastFeatureError || 'none'}`
    ].join('\n');
  }

  async function safeRun(name, fn, missingMessage){
    try {
      if (typeof fn !== 'function') throw new Error(missingMessage);
      await fn();
    } catch (error) {
      const message = `${name} activation failed: ${error?.message || error}`;
      setError(message);
      console.error('[FEATURE_ERROR]', message);
    }
  }

  function bindFeatureClicks(){
    const dashboardBtn = globalScope.document.getElementById('dashboardBtn');
    const cameraBtn = globalScope.document.getElementById('connectBtn');
    const startBtn = globalScope.document.getElementById('startBtn');

    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        logClick('dashboard');
        updateFeaturePanel('dashboard click');
      });
    }

    if (cameraBtn) {
      cameraBtn.addEventListener('click', async () => {
        logClick('camera');
        try {
          if (typeof globalScope.window?.connectCamera !== 'function') throw new Error('connectCamera function missing');
          await globalScope.window.connectCamera();
        } catch (error) {
          setError(`Camera unavailable: ${error?.message || error}`);
        }
        updateFeaturePanel('camera click');
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        logClick('start_workout');
        const baseUrl = globalScope.NODE_BASE_URL || '';
        const smokeUrl = `${baseUrl}/__diagnostic-smoke`;
        logBackend(smokeUrl);
        try {
          await fetch(smokeUrl);
        } catch (error) {
          setError(`Workout backend smoke failed: ${error?.message || error}`);
        }
        try {
          if (typeof globalScope.window?.startWorkout !== 'function') throw new Error('startWorkout function missing');
          await globalScope.window.startWorkout();
        } catch (error) {
          setError(`Start workout unavailable: ${error?.message || error}`);
        }
        updateFeaturePanel('start click');
      });
    }
  }

  async function forceActivate(reason){
    const auth = globalScope.APP_AUTH || {};
    if (auth.isAuthenticated !== true) {
      updateFeaturePanel(`${reason}:not-authenticated`);
      return;
    }
    if (typeof globalScope.bindPrimaryButtonsAfterLogin === 'function') {
      globalScope.bindPrimaryButtonsAfterLogin(`app-runtime:${reason}`);
    }
    const ids = ['dashboardBtn','exerciseLibraryBtn','connectBtn','startBtn'];
    ids.forEach((id) => {
      const el = globalScope.document.getElementById(id);
      if (el) { el.disabled = false; el.removeAttribute('disabled'); }
    });

    await safeRun('retention', () => globalScope.window?.ensureRetentionFlowLoaded?.('app-runtime'), 'ensureRetentionFlowLoaded missing');
    await safeRun('profile', () => Promise.resolve(globalScope.window?.onLoginUI?.(globalScope.USER_PROFILE || auth.user || {})), 'onLoginUI missing');
    await safeRun('app activation', () => Promise.resolve(globalScope.window?.updateActivationStatusPanel?.('app-runtime-force')), 'updateActivationStatusPanel missing');

    bindFeatureClicks();
    updateFeaturePanel(`activated:${reason}`);
  }

  ['auth:ready','auth:changed'].forEach((evt)=> globalScope.addEventListener(evt, ()=>forceActivate(evt)));
  globalScope.addEventListener('DOMContentLoaded', ()=>updateFeaturePanel('DOMContentLoaded'));
  globalScope.addEventListener('load', ()=>forceActivate('load'));

  globalScope.__appRuntime = { forceActivate, updateFeaturePanel, state };
})(window);
