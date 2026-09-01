(function bootCore(globalScope) {
  'use strict';
  const NODE_BASE_URL = globalScope.RuntimeState?.getBackendOrigin?.() || globalScope.location.origin;
  const VERSION_URL = `${NODE_BASE_URL}/__version`;
  const FRONTEND_BUILD = globalScope.APP_BUILD_VERSION || 'unknown-frontend';
  const host = globalScope.location?.host || 'unknown-host';
  const MOVEMENT_CAPTURE_MODE = new URLSearchParams(globalScope.location?.search || '').get('movementCaptureStudio') === '1';
  const state = globalScope.__bootCoreState = {
    loaded: true,
    frontendBuild: FRONTEND_BUILD,
    backendVersionReached: false,
    backendBuildParsed: false,
    movementRecorderRequested: false,
    movementRecorderLoaded: false,
    movementRoadmapRequested: false,
    movementRoadmapLoaded: false,
    movementCaptureStudioRequested: false,
    movementCaptureStudioLoaded: false,
    movementCaptureDebugRequested: false,
    movementCaptureDebugLoaded: false,
    movementCaptureFocusRequested: MOVEMENT_CAPTURE_MODE,
    movementCaptureFocusActive: false,
    movementCaptureFocusDenied: false,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; return el; }
  function renderBootStatus(reason) {
    const el = document.getElementById('systemBootStatus'); if (!el) return;
    el.textContent = [
      `reason: ${reason}`,
      'boot core loaded: yes',
      `frontend build: ${FRONTEND_BUILD}`,
      `backend __version reached: ${state.backendVersionReached ? 'yes' : 'no'}`,
      `backend build parsed: ${state.backendBuildParsed ? 'yes' : 'no'}`,
      `movement recorder requested: ${state.movementRecorderRequested ? 'yes' : 'no'}`,
      `movement recorder loaded: ${state.movementRecorderLoaded ? 'yes' : 'no'}`,
      `movement roadmap requested: ${state.movementRoadmapRequested ? 'yes' : 'no'}`,
      `movement roadmap loaded: ${state.movementRoadmapLoaded ? 'yes' : 'no'}`,
      `capture studio requested: ${state.movementCaptureStudioRequested ? 'yes' : 'no'}`,
      `capture studio loaded: ${state.movementCaptureStudioLoaded ? 'yes' : 'no'}`,
      `capture debug requested: ${state.movementCaptureDebugRequested ? 'yes' : 'no'}`,
      `capture debug loaded: ${state.movementCaptureDebugLoaded ? 'yes' : 'no'}`,
      `capture focus requested: ${state.movementCaptureFocusRequested ? 'yes' : 'no'}`,
      `capture focus active: ${state.movementCaptureFocusActive ? 'yes' : 'no'}`,
      `capture focus denied: ${state.movementCaptureFocusDenied ? 'yes' : 'no'}`,
      `last boot error: ${state.lastError || 'none'}`
    ].join('\n');
  }
  function renderBuildPill(text) { const pill = document.getElementById('buildVersionPill'); if (pill) pill.textContent = text; }

  function roleSet(user) {
    return new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase()));
  }

  function isMovementCaptureAdmin(user) {
    const roles = roleSet(user);
    return roles.has('admin') || roles.has('super_admin');
  }

  function installMovementCaptureFocusStyles() {
    if (document.getElementById('movementCaptureFocusStyles')) return;
    const style = document.createElement('style');
    style.id = 'movementCaptureFocusStyles';
    style.textContent = `
      body.movement-capture-studio-mode{align-items:stretch;background:#020617}
      body.movement-capture-studio-mode #appShell{grid-template-columns:minmax(0,1fr)!important;max-width:1120px!important;width:100%!important}
      body.movement-capture-studio-mode .workout-support-pane{display:none!important}
      body.movement-capture-studio-mode .workout-stage-pane{display:flex!important;flex-direction:column!important;gap:12px!important}
      body.movement-capture-studio-mode .workout-stage-pane>*{display:none!important}
      body.movement-capture-studio-mode #movementCaptureStudioHeading,
      body.movement-capture-studio-mode #workoutPresentation,
      body.movement-capture-studio-mode .workout-stage-pane>.btn-row,
      body.movement-capture-studio-mode #exerciseTemplateBuilderPanel{display:flex!important}
      body.movement-capture-studio-mode #movementCaptureStudioHeading{flex-direction:column;gap:7px;padding:14px;border:1px solid #facc15;border-radius:14px;background:#0b1220}
      body.movement-capture-studio-mode #movementCaptureStudioHeading h1{margin:0;font-size:1.35rem;color:#fde68a}
      body.movement-capture-studio-mode #movementCaptureStudioHeading p{margin:0;color:#cbd5e1;font-size:.88rem}
      body.movement-capture-studio-mode #movementCaptureStudioHeading a{align-self:flex-start;color:#fde68a}
      body.movement-capture-studio-mode .workout-stage-pane>.btn-row{flex-wrap:wrap!important;gap:8px!important}
      body.movement-capture-studio-mode .workout-stage-pane>.btn-row>*{display:none!important}
      body.movement-capture-studio-mode #connectBtn,
      body.movement-capture-studio-mode #startBtn,
      body.movement-capture-studio-mode #diagnosticsToggleBtn{display:inline-flex!important}
      body.movement-capture-studio-mode #exerciseTemplateBuilderPanel{flex-direction:column!important;position:static!important;visibility:visible!important;opacity:1!important;width:100%!important;max-width:none!important}
      body.movement-capture-studio-mode #frontendShellMarker,
      body.movement-capture-studio-mode #clickDiagBanner,
      body.movement-capture-studio-mode #authRestoreStatus,
      body.movement-capture-studio-mode #userInfo{display:none!important}
      @media(max-width:640px){body.movement-capture-studio-mode{padding:8px!important}body.movement-capture-studio-mode #appShell{padding:8px!important}}
    `;
    document.head.appendChild(style);
  }

  function renderMovementCaptureDenied() {
    state.movementCaptureFocusDenied = true;
    state.movementCaptureFocusActive = false;
    state.updatedAt = new Date().toISOString();
    let denied = document.getElementById('movementCaptureAccessDenied');
    if (!denied) {
      denied = document.createElement('section');
      denied.id = 'movementCaptureAccessDenied';
      denied.style.cssText = 'max-width:760px;margin:40px auto;padding:20px;border:1px solid #ef4444;border-radius:14px;background:#020617;color:#fff';
      denied.innerHTML = '<h1>Movement Capture Studio</h1><p>Admin access is required.</p><p><a href="/dashboard.html" style="color:#fde68a">Return to Dashboard</a></p>';
      document.body.prepend(denied);
    }
    const app = document.getElementById('appShell');
    if (app) app.style.display = 'none';
    renderBootStatus('movement-capture-focus-denied');
  }

  function revealMovementCaptureWorkspace() {
    const panel = document.getElementById('exerciseTemplateBuilderPanel');
    const stage = document.querySelector('.workout-stage-pane');
    if (!panel || !stage) {
      state.lastError = !panel ? 'movement_capture_builder_missing' : 'movement_capture_stage_missing';
      state.updatedAt = new Date().toISOString();
      renderBootStatus('movement-capture-focus-missing-boundary');
      globalScope.__diagnosticAutoReport?.(state.lastError);
      return false;
    }
    installMovementCaptureFocusStyles();
    document.body.classList.add('movement-capture-studio-mode');
    panel.hidden = false;
    panel.classList.remove('hidden');
    panel.removeAttribute('aria-hidden');

    let heading = document.getElementById('movementCaptureStudioHeading');
    if (!heading) {
      heading = document.createElement('section');
      heading.id = 'movementCaptureStudioHeading';
      heading.innerHTML = '<h1>Movement Capture Studio</h1><p>Admin motion-intelligence workspace: collect FRONT + SIDE MoveNet evidence, custom movements, pose checkpoints, Motion Lego coverage, and first-failure diagnostics.</p><p>Use the canonical camera and pose runtime below. No raw video is stored by the Movement Lego Recorder.</p><a href="/dashboard.html">← Back to Dashboard</a>';
      stage.prepend(heading);
    }
    if (panel.parentElement !== stage) stage.appendChild(panel);
    state.movementCaptureFocusActive = true;
    state.movementCaptureFocusDenied = false;
    state.updatedAt = new Date().toISOString();
    renderBootStatus('movement-capture-focus-active');
    globalScope.setTimeout?.(() => panel.scrollIntoView?.({ block: 'start' }), 250);
    return true;
  }

  async function activateMovementCaptureFocus() {
    if (!MOVEMENT_CAPTURE_MODE) return false;
    try {
      await globalScope.AuthStateRuntime?.whenReady?.();
      const auth = globalScope.AuthStateRuntime?.getCanonicalAuthState?.();
      if (!auth?.isAuthenticated || !isMovementCaptureAdmin(auth.user)) {
        renderMovementCaptureDenied();
        return false;
      }
      return revealMovementCaptureWorkspace();
    } catch (error) {
      state.lastError = `movement_capture_focus_auth_failed:${error?.message || String(error)}`;
      renderMovementCaptureDenied();
      return false;
    }
  }

  function loadMovementCaptureDebug() {
    const builder = document.querySelector?.('[data-coach-template-builder]');
    if (!builder || globalScope.PocketPTMovementCaptureDebug || document.getElementById('movementCaptureDebugRuntimeScript')) return;
    state.movementCaptureDebugRequested = true;
    const script = document.createElement('script');
    script.id = 'movementCaptureDebugRuntimeScript';
    script.src = '/motion/movement-capture-debug.js?v=2026-09-01-first-failure-debug-v1';
    script.async = true;
    script.onload = () => { state.movementCaptureDebugLoaded = Boolean(globalScope.PocketPTMovementCaptureDebug); state.updatedAt = new Date().toISOString(); renderBootStatus('movement-capture-debug-loaded'); };
    script.onerror = () => { state.lastError = 'movement_capture_debug_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-capture-debug-load-failed'); globalScope.__diagnosticAutoReport?.('movement_capture_debug_load_failed'); };
    document.head.appendChild(script); renderBootStatus('movement-capture-debug-requested');
  }

  function loadMovementCaptureStudio() {
    const builder = document.querySelector?.('[data-coach-template-builder]');
    if (!builder || globalScope.PocketPTMovementCaptureStudio || document.getElementById('movementCaptureStudioRuntimeScript')) return;
    state.movementCaptureStudioRequested = true;
    const script = document.createElement('script');
    script.id = 'movementCaptureStudioRuntimeScript';
    script.src = '/motion/movement-capture-studio.js?v=2026-09-01-paired-views-milestones-v1';
    script.async = true;
    script.onload = () => { state.movementCaptureStudioLoaded = Boolean(globalScope.PocketPTMovementCaptureStudio); state.updatedAt = new Date().toISOString(); renderBootStatus('movement-capture-studio-loaded'); loadMovementCaptureDebug(); };
    script.onerror = () => { state.lastError = 'movement_capture_studio_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-capture-studio-load-failed'); globalScope.__diagnosticAutoReport?.('movement_capture_studio_load_failed'); };
    document.head.appendChild(script); renderBootStatus('movement-capture-studio-requested');
  }

  function loadTrainerMovementRoadmap() {
    const builder = document.querySelector?.('[data-coach-template-builder]');
    if (!builder || globalScope.PocketPTMovementRecordingRoadmap || document.getElementById('movementRecordingRoadmapRuntimeScript')) return;
    state.movementRoadmapRequested = true;
    const script = document.createElement('script');
    script.id = 'movementRecordingRoadmapRuntimeScript';
    script.src = '/motion/movement-recording-roadmap.js?v=2026-09-01-paired-roadmap-v2';
    script.async = true;
    script.onload = () => { state.movementRoadmapLoaded = Boolean(globalScope.PocketPTMovementRecordingRoadmap); state.updatedAt = new Date().toISOString(); renderBootStatus('movement-roadmap-loaded'); loadMovementCaptureStudio(); };
    script.onerror = () => { state.lastError = 'movement_roadmap_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-roadmap-load-failed'); globalScope.__diagnosticAutoReport?.('movement_roadmap_load_failed'); };
    document.head.appendChild(script); renderBootStatus('movement-roadmap-requested');
  }

  function loadTrainerMovementRecorder() {
    const builder = document.querySelector?.('[data-coach-template-builder]');
    if (!builder || globalScope.PocketPTMovementRecorder || document.getElementById('movementRecorderRuntimeScript')) return;
    state.movementRecorderRequested = true;
    const script = document.createElement('script');
    script.id = 'movementRecorderRuntimeScript';
    script.src = '/motion/movement-recorder.js?v=2026-09-01-movement-lego-recorder-v1';
    script.async = true;
    script.onload = () => { state.movementRecorderLoaded = Boolean(globalScope.PocketPTMovementRecorder); state.updatedAt = new Date().toISOString(); renderBootStatus('movement-recorder-loaded'); loadTrainerMovementRoadmap(); };
    script.onerror = () => { state.lastError = 'movement_recorder_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-recorder-load-failed'); globalScope.__diagnosticAutoReport?.('movement_recorder_load_failed'); };
    document.head.appendChild(script); renderBootStatus('movement-recorder-requested');
  }

  console.log('[BOOT_CORE] loaded');
  setText('bootCoreLoadedMarker', 'yes');
  renderBuildPill(`Build: loading… • Host: ${host}`);
  renderBootStatus('boot-core-start');
  loadTrainerMovementRecorder();
  activateMovementCaptureFocus();

  (async function loadBackendVersion() {
    let buildText = 'Build error: network_error';
    try {
      const controller = new AbortController();
      const timeoutId = globalScope.setTimeout(() => controller.abort(), 2000);
      const response = await fetch(VERSION_URL, { cache: 'no-store', signal: controller.signal });
      globalScope.clearTimeout(timeoutId);
      state.backendVersionReached = true;
      if (!response.ok) throw new Error(`http_${response.status}`);
      const payload = await response.json().catch(() => ({}));
      if (!payload || !payload.build) throw new Error('missing_build');
      state.backendBuildParsed = true; buildText = `Build: ${payload.build} • Host: ${host}`;
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'timeout_2s' : (error?.message || 'network_error');
      state.lastError = reason; buildText = `Build error: ${reason} • Host: ${host}`;
    }
    state.updatedAt = new Date().toISOString(); renderBuildPill(buildText); renderBootStatus('boot-core-version');
  })();
})(window);
