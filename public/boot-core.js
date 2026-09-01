(function bootCore(globalScope) {
  'use strict';
  const NODE_BASE_URL = globalScope.RuntimeState?.getBackendOrigin?.() || globalScope.location.origin;
  const VERSION_URL = `${NODE_BASE_URL}/__version`;
  const FRONTEND_BUILD = globalScope.APP_BUILD_VERSION || 'unknown-frontend';
  const host = globalScope.location?.host || 'unknown-host';
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
      `last boot error: ${state.lastError || 'none'}`
    ].join('\n');
  }
  function renderBuildPill(text) { const pill = document.getElementById('buildVersionPill'); if (pill) pill.textContent = text; }

  function loadMovementCaptureStudio() {
    const builder = document.querySelector?.('[data-coach-template-builder]');
    if (!builder || globalScope.PocketPTMovementCaptureStudio || document.getElementById('movementCaptureStudioRuntimeScript')) return;
    state.movementCaptureStudioRequested = true;
    const script = document.createElement('script');
    script.id = 'movementCaptureStudioRuntimeScript';
    script.src = '/motion/movement-capture-studio.js?v=2026-09-01-paired-views-milestones-v1';
    script.async = true;
    script.onload = () => { state.movementCaptureStudioLoaded = Boolean(globalScope.PocketPTMovementCaptureStudio); state.updatedAt = new Date().toISOString(); renderBootStatus('movement-capture-studio-loaded'); };
    script.onerror = () => { state.lastError = 'movement_capture_studio_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-capture-studio-load-failed'); };
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
    script.onerror = () => { state.lastError = 'movement_roadmap_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-roadmap-load-failed'); };
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
    script.onerror = () => { state.lastError = 'movement_recorder_load_failed'; state.updatedAt = new Date().toISOString(); renderBootStatus('movement-recorder-load-failed'); };
    document.head.appendChild(script); renderBootStatus('movement-recorder-requested');
  }

  console.log('[BOOT_CORE] loaded');
  setText('bootCoreLoadedMarker', 'yes');
  renderBuildPill(`Build: loading… • Host: ${host}`);
  renderBootStatus('boot-core-start');
  loadTrainerMovementRecorder();

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
