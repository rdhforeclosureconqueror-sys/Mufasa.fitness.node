(function initArenaPreReadyTrace(global) {
  'use strict';

  const ALLOWED_STAGES = new Set([
    'MAIN_SCENE_READY', 'BOOTSTRAP_ENTERED', 'CLIENT_CREATED', 'DEBUG_BOUND',
    'MAIN_SCENE_MISSING', 'AVATAR_LOADER_BOUND', 'LOCAL_RUNTIME_BOUND', 'LOCAL_PLAYER_MISSING',
    'CLIENT_INITIALIZE_QUEUED', 'OPTIONAL_MULTIPLAYER_QUEUED', 'OPTIONAL_MULTIPLAYER_ENTERED',
    'OPTIONAL_MULTIPLAYER_SKIPPED', 'OPTIONAL_MULTIPLAYER_SCRIPT_LOAD', 'REMOTE_AVATAR_LOADER_CREATE',
    'LOBBY_CLIENT_CREATE', 'OPTIONAL_MULTIPLAYER_BOUND', 'INNER_BOOTSTRAP_STARTED',
    'INNER_BOOTSTRAP_ACCEPTED', 'READY_SENT', 'CORE_CLIENT_ERROR', 'AVATAR_LOADING',
    'AVATAR_MOUNTED', 'AVATAR_FALLBACK', 'AVATAR_ERROR', 'PRACTICE_RUNTIME_STARTED', 'UNKNOWN_STAGE'
  ]);
  const ALLOWED_STATUS = new Set(['PASS', 'FAIL']);
  let lastStage = '';
  let lastStatus = '';
  let boardObserver = null;

  function gameFrame() {
    return global.document?.getElementById?.('game') || null;
  }

  function board() {
    return global.document?.getElementById?.('bridgeDebugBoard') || null;
  }

  function ensureTrace() {
    if (!lastStage) return;
    const target = board();
    if (!target || typeof target.querySelector !== 'function' || typeof target.prepend !== 'function' || typeof global.document?.createElement !== 'function') return;
    let trace = target.querySelector('#godotPreReadyStage');
    if (!trace) {
      trace = global.document.createElement('div');
      trace.id = 'godotPreReadyStage';
      trace.style.cssText = 'margin:8px 0 12px;padding:9px 10px;border:1px solid #59657a;border-radius:10px;background:#101722;color:#f5f7fb;font:700 12px system-ui;overflow-wrap:anywhere';
      target.prepend(trace);
    }
    trace.textContent = `PRE-READY GODOT STAGE: ${lastStage} · ${lastStatus}`;
    trace.dataset.stage = lastStage;
    trace.dataset.status = lastStatus;
  }

  function installObserver() {
    const target = board();
    if (!target || typeof global.MutationObserver !== 'function' || boardObserver) return;
    boardObserver = new global.MutationObserver(() => ensureTrace());
    boardObserver.observe(target, {childList: true});
  }

  function validGameMessage(event) {
    const frame = gameFrame();
    return !!frame && event?.source === frame.contentWindow && event?.origin === global.location?.origin && event?.data?.type === 'POCKETPT_GODOT_BRIDGE' && event?.data?.protocolVersion === 1;
  }

  function onMessage(event) {
    if (!validGameMessage(event)) return;
    const data = event.data;
    if (data.event === 'READY') {
      lastStage = 'READY_SENT';
      lastStatus = 'PASS';
      ensureTrace();
      return;
    }
    if (data.event !== 'STARTUP_STAGE') return;
    const stage = String(data.stage || '');
    const status = String(data.status || '');
    if (!ALLOWED_STAGES.has(stage) || !ALLOWED_STATUS.has(status)) return;
    lastStage = stage;
    lastStatus = status;
    ensureTrace();
  }

  function install() {
    installObserver();
    global.addEventListener?.('message', onMessage);
  }

  if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();

  if (typeof module === 'object' && module.exports) module.exports = {ALLOWED_STAGES, ALLOWED_STATUS};
})(typeof window !== 'undefined' ? window : globalThis);
