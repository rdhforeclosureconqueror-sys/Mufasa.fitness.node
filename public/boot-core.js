(function bootCore(globalScope) {
  'use strict';
  const VERSION_URL = 'https://mufasa-fitness-node.onrender.com/__version';
  const FRONTEND_BUILD = globalScope.APP_BUILD_VERSION || 'unknown-frontend';
  const host = globalScope.location?.host || 'unknown-host';
  const state = globalScope.__bootCoreState = {
    loaded: true,
    frontendBuild: FRONTEND_BUILD,
    backendVersionReached: false,
    backendBuildParsed: false,
    lastError: null,
    updatedAt: new Date().toISOString()
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
    return el;
  }

  function renderBootStatus(reason) {
    const systemBootStatusEl = document.getElementById('systemBootStatus');
    if (!systemBootStatusEl) return;
    const lines = [
      `reason: ${reason}`,
      'boot core loaded: yes',
      `frontend build: ${FRONTEND_BUILD}`,
      `backend __version reached: ${state.backendVersionReached ? 'yes' : 'no'}`,
      `backend build parsed: ${state.backendBuildParsed ? 'yes' : 'no'}`,
      `last boot error: ${state.lastError || 'none'}`
    ];
    systemBootStatusEl.textContent = lines.join('\n');
  }

  function renderBuildPill(text) {
    const pill = document.getElementById('buildVersionPill');
    if (!pill) return;
    pill.textContent = text;
  }

  console.log('[BOOT_CORE] loaded');
  setText('bootCoreLoadedMarker', 'yes');
  renderBuildPill(`Build: loading… • Host: ${host}`);
  renderBootStatus('boot-core-start');

  (async function loadBackendVersion() {
    let buildText = 'Build error: network_error';
    try {
      const controller = new AbortController();
      const timeoutId = globalScope.setTimeout(() => controller.abort(), 2000);
      const response = await fetch(VERSION_URL, { cache: 'no-store', signal: controller.signal });
      globalScope.clearTimeout(timeoutId);
      state.backendVersionReached = true;

      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }
      const payload = await response.json().catch(() => ({}));
      if (!payload || !payload.build) {
        throw new Error('missing_build');
      }
      state.backendBuildParsed = true;
      buildText = `Build: ${payload.build} • Host: ${host}`;
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'timeout_2s' : (error?.message || 'network_error');
      state.lastError = reason;
      buildText = `Build error: ${reason} • Host: ${host}`;
    }
    state.updatedAt = new Date().toISOString();
    renderBuildPill(buildText);
    renderBootStatus('boot-core-version');
  })();
})(window);
