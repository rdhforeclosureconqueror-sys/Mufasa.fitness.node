(function () {
  'use strict';
  const diagnostics = window.PocketPTArenaDiagnostics;
  const status = document.getElementById('status');
  const message = document.getElementById('message');
  const game = document.getElementById('game');
  const exitArena = document.getElementById('exitArena');
  if (!diagnostics) {
    message.textContent = 'Arena diagnostics could not load. Reload this page.';
    return;
  }
  let view;
  const model = diagnostics.create({onChange: () => view?.render()});
  view = diagnostics.mount({model, board: document.getElementById('bridgeDebugBoard'),
    toggle: document.getElementById('bridgeDebugToggle'), document, navigator, reload: () => location.reload()});
  let returnTo = '/push-up-challenge.html';
  let leaving = false;
  let disposed = false;
  let frameStarted = false;
  let frameLoaded = false;
  let readyReceived = false;
  let readyDocument = null;
  let expiresAt = 0;
  let requestId = null;
  let lastRequestedId = null;
  let lastGodotStartupStage = null;
  const GODOT_STARTUP_STAGES = new Set([
    'MAIN_SCENE_READY', 'BOOTSTRAP_ENTERED', 'CLIENT_CREATED', 'DEBUG_BOUND',
    'MAIN_SCENE_MISSING', 'AVATAR_LOADER_BOUND', 'LOCAL_RUNTIME_BOUND', 'LOCAL_PLAYER_MISSING',
    'CLIENT_INITIALIZE_QUEUED', 'OPTIONAL_MULTIPLAYER_QUEUED', 'OPTIONAL_MULTIPLAYER_ENTERED',
    'OPTIONAL_MULTIPLAYER_SKIPPED', 'OPTIONAL_MULTIPLAYER_SCRIPT_LOAD', 'REMOTE_AVATAR_LOADER_CREATE',
    'LOBBY_CLIENT_CREATE', 'OPTIONAL_MULTIPLAYER_BOUND', 'INNER_BOOTSTRAP_STARTED',
    'INNER_BOOTSTRAP_ACCEPTED', 'READY_SENT', 'CORE_CLIENT_ERROR', 'AVATAR_LOADING',
    'AVATAR_MOUNTED', 'AVATAR_FALLBACK', 'AVATAR_ERROR', 'PRACTICE_RUNTIME_STARTED', 'UNKNOWN_STAGE'
  ]);
  const HANDSHAKE_FATAL_STARTUP_STAGES = new Set(['MAIN_SCENE_MISSING', 'CORE_CLIENT_ERROR']);
  const timers = new Map();
  const requests = new Set();
  const mark = (id, state, code) => model.mark(id, state, code);
  const phone = window.PocketPTArenaPhoneUI?.mount({game, mark, send: data => {
    const stopping = data.action === 'STOP' || (data.action === 'SET_CONTEXT' && data.context === 'LOCKED');
    if (frameStarted && readyReceived && !disposed && !leaving && (Date.now() < expiresAt || stopping)) game.contentWindow.postMessage(data, location.origin);
  }});

  function cancelTimer(name) { clearTimeout(timers.get(name)); timers.delete(name); }
  function schedule(name, delay, callback) {
    cancelTimer(name);
    timers.set(name, setTimeout(() => { timers.delete(name); if (!disposed && !leaving) callback(); }, delay));
  }
  function renderStartupStage(stage, stageStatus = 'RUNNING') {
    if (!GODOT_STARTUP_STAGES.has(stage)) return;
    const board = document.getElementById('bridgeDebugBoard');
    if (!board || typeof board.querySelector !== 'function' || typeof board.prepend !== 'function' || typeof document.createElement !== 'function') return;
    let trace = board.querySelector('#godotPreReadyStage');
    if (!trace) {
      trace = document.createElement('div');
      trace.id = 'godotPreReadyStage';
      trace.style.cssText = 'margin:8px 0 12px;padding:9px 10px;border:1px solid #59657a;border-radius:10px;background:#101722;color:#f5f7fb;font:700 12px system-ui;overflow-wrap:anywhere';
      board.prepend(trace);
    }
    trace.textContent = `PRE-READY GODOT STAGE: ${stage} · ${stageStatus}`;
    trace.dataset.stage = stage;
    trace.dataset.status = stageStatus;
  }
  function showError(stage, code) {
    if (disposed || leaving) return;
    phone?.close();
    mark(stage, 'FAIL', code);
    status.style.display = 'grid';
    game.style.display = 'none';
    message.className = 'error';
    message.textContent = `${diagnostics.DETAILS[code]} Open Arena Diagnostics for the next step.`;
    view.setOpen(true);
  }
  function errorCode(error) {
    return Object.hasOwn(diagnostics.DETAILS, error?.safeCode) ? error.safeCode : 'NETWORK_ERROR';
  }
  async function jsonFetch(url, init = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {credentials: 'same-origin', cache: 'no-store',
        ...init, headers: {'Content-Type': 'application/json', ...(init.headers || {})}, signal: controller.signal});
      if (!response.ok) {
        const safeCode = [401, 403, 404, 409].includes(response.status) ? `HTTP_${response.status}` : 'HTTP_ERROR';
        throw {safeCode};
      }
      const result = await response.json().catch(() => { throw {safeCode: 'INVALID_PAYLOAD'}; });
      if (result?.ok !== true || !result.data) throw {safeCode: 'INVALID_PAYLOAD'};
      return result.data;
    } catch (error) {
      if (controller.signal.aborted) throw {safeCode: 'REQUEST_TIMEOUT'};
      throw error;
    } finally { clearTimeout(timeout); requests.delete(controller); }
  }
  function expireSession() {
    if (!expiresAt || Date.now() < expiresAt || disposed || leaving) return;
    mark('SESSION_LIFETIME', 'FAIL', 'SESSION_EXPIRED');
    phone?.close();
    model.close();
    cancelTimer('frame');
    cancelTimer('ready');
    view.setOpen(true);
  }
  function requestDiagnostics() {
    if (!readyReceived || !requestId || requestId === lastRequestedId || disposed || leaving || Date.now() >= expiresAt) return;
    lastRequestedId = requestId;
    game.contentWindow.postMessage({type: 'POCKETPT_GODOT_BRIDGE', event: 'DIAGNOSTICS_REQUEST',
      protocolVersion: 1, diagnosticVersion: 1, requestId}, location.origin);
  }
  function startGameGeneration() {
    phone?.reset();
    requestId = window.crypto.randomUUID();
    lastGodotStartupStage = null;
    model.resetGame(requestId);
  }
  function waitForReady() {
    mark('GODOT_HANDSHAKE', 'RUNNING', 'REQUEST_STARTED');
    if (lastGodotStartupStage) renderStartupStage(lastGodotStartupStage, 'RUNNING');
    schedule('ready', 120000, () => {
      mark('GODOT_HANDSHAKE', 'FAIL', 'HANDSHAKE_TIMEOUT');
      if (lastGodotStartupStage) renderStartupStage(lastGodotStartupStage, 'TIMEOUT');
      view.setOpen(true);
    });
  }
  window.addEventListener('message', event => {
    if (!frameStarted || disposed || leaving || !diagnostics.isGameMessage(event, game, location.origin)) return;
    if (Date.now() >= expiresAt) { expireSession(); return; }
    const data = event.data;
    if (data.event === 'STARTUP_STAGE') {
      const stage = String(data.stage || '');
      const stageStatus = String(data.status || '');
      if (data.protocolVersion !== 1 || !GODOT_STARTUP_STAGES.has(stage) || !['PASS', 'FAIL'].includes(stageStatus)) return;
      lastGodotStartupStage = stage;
      if (!readyReceived) {
        const handshakeFatal = stageStatus === 'FAIL' && HANDSHAKE_FATAL_STARTUP_STAGES.has(stage);
        mark('GODOT_HANDSHAKE', handshakeFatal ? 'FAIL' : 'RUNNING', handshakeFatal ? 'GAME_ERROR' : 'REQUEST_STARTED');
        renderStartupStage(stage, stageStatus);
        if (stageStatus === 'FAIL') view.setOpen(true);
      }
      return;
    }
    if (data.event === 'READY') {
      if (frameLoaded && readyDocument !== game.contentDocument) {
        startGameGeneration();
        readyReceived = false;
      }
      readyDocument = game.contentDocument;
      const firstReady = !readyReceived;
      readyReceived = true;
      lastGodotStartupStage = 'READY_SENT';
      cancelTimer('ready');
      mark('GODOT_HANDSHAKE', 'PASS', 'HANDSHAKE_READY');
      renderStartupStage('READY_SENT', 'PASS');
      if (firstReady) {requestDiagnostics(); phone?.connect();}
    } else if (data.event === 'ERROR') {
      phone?.close();
      const sessionError = data.code === 'ARENA_SESSION_INVALID';
      mark(sessionError ? 'SESSION_LIFETIME' : 'GODOT_HANDSHAKE', 'FAIL', sessionError ? 'HTTP_401' : 'GAME_ERROR');
      readyReceived = false;
      cancelTimer('ready');
      if (lastGodotStartupStage) renderStartupStage(lastGodotStartupStage, 'FAIL');
      if (sessionError) model.close();
      view.setOpen(true);
    } else if (data.event === 'DIAGNOSTIC' && model.acceptRuntime(data) && model.summary().firstFailure) {
      view.setOpen(true);
    } else phone?.accept(data);
  });
  async function endArenaSessionAndReturn(destination) {
    if (leaving) return;
    phone?.close();
    leaving = true;
    for (const timer of timers.values()) clearTimeout(timer);
    for (const request of requests) request.abort();
    model.close();
    mark('SESSION_LIFETIME', 'WAITING', 'SESSION_CLOSED');
    mark('EXIT_REVOKE', 'RUNNING', 'EXIT_STARTED');
    try {
      const result = await jsonFetch('/api/game/session', {method: 'DELETE', keepalive: true}, 5000);
      mark('EXIT_REVOKE', result.ended === true ? 'PASS' : 'FAIL', result.ended === true ? 'EXIT_OK' : 'INVALID_PAYLOAD');
    } catch (error) { mark('EXIT_REVOKE', 'FAIL', errorCode(error)); }
    finally { location.assign(destination || returnTo); }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('[data-arena-exit]');
    if (!link) return;
    event.preventDefault();
    endArenaSessionAndReturn(returnTo);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) expireSession(); else phone?.suspend(); });
  window.addEventListener('pagehide', () => {
    phone?.close();
    disposed = true;
    model.close();
    for (const timer of timers.values()) clearTimeout(timer);
    for (const request of requests) request.abort();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      mark('BOOTSTRAP', 'FAIL', 'PAGE_RESTORED');
      view.setOpen(true);
    }
  });

  async function start() {
    mark('ARENA_SHELL', 'PASS', 'PAGE_LOADED');
    mark('CONFIG', 'RUNNING', 'REQUEST_STARTED');
    let config;
    try {
      config = await jsonFetch('/api/game/config');
      if (disposed || leaving) return;
      if (config.protocolVersion !== 1) throw {safeCode: 'INVALID_PAYLOAD'};
      if (config.returnUrl) {
        const target = new URL(config.returnUrl, location.origin);
        if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/push-up-challenge.html') throw {safeCode: 'INVALID_PAYLOAD'};
        returnTo = target.href;
        exitArena.href = returnTo;
      }
      mark('CONFIG', 'PASS', 'CONFIG_VALID');
    } catch (error) { showError('CONFIG', errorCode(error)); return; }
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const ticket = params.get('ticket');
    if (ticket) {
      mark('TICKET_PRESENT', 'PASS', 'TICKET_FOUND');
      mark('SESSION_EXCHANGE', 'RUNNING', 'REQUEST_STARTED');
      try {
        const exchange = await jsonFetch('/api/game/session-exchange', {method: 'POST', body: JSON.stringify({ticket})});
        if (disposed || leaving) return;
        if (exchange.ready !== true) throw {safeCode: 'INVALID_PAYLOAD'};
        mark('SESSION_EXCHANGE', 'PASS', 'EXCHANGE_OK');
      } catch (error) { showError('SESSION_EXCHANGE', errorCode(error)); return; }
      finally {
        history.replaceState(null, document.title, location.pathname + location.search);
        mark('FRAGMENT_SCRUB', 'PASS', 'FRAGMENT_CLEARED');
      }
    } else {
      mark('TICKET_PRESENT', 'SKIP', 'EXISTING_SESSION');
      mark('SESSION_EXCHANGE', 'SKIP', 'EXISTING_SESSION');
      if (location.hash) history.replaceState(null, document.title, location.pathname + location.search);
      mark('FRAGMENT_SCRUB', 'SKIP', 'NO_FRAGMENT');
    }
    mark('BOOTSTRAP', 'RUNNING', 'REQUEST_STARTED');
    let bootstrap;
    try {
      bootstrap = await jsonFetch('/api/game/bootstrap');
      if (disposed || leaving) return;
    } catch (error) { showError('BOOTSTRAP', errorCode(error)); return; }
    const checked = diagnostics.inspectBootstrap(bootstrap);
    if (checked.failure === 'BOOTSTRAP') { showError('BOOTSTRAP', 'INVALID_PAYLOAD'); return; }
    mark('BOOTSTRAP', 'PASS', 'BOOTSTRAP_VALID');
    if (checked.failure === 'IDENTITY') { showError('IDENTITY', 'INVALID_PAYLOAD'); return; }
    mark('IDENTITY', 'PASS', 'MEMBER_VALID');
    if (checked.failure === 'CHALLENGE_CONTEXT') { showError('CHALLENGE_CONTEXT', 'INVALID_PAYLOAD'); return; }
    mark('CHALLENGE_CONTEXT', 'PASS', 'CONTEXT_VALID');
    if (checked.failure === 'SESSION_LIFETIME') { showError('SESSION_LIFETIME', checked.expired ? 'SESSION_EXPIRED' : 'INVALID_PAYLOAD'); return; }
    expiresAt = checked.expiresAt;
    mark('SESSION_LIFETIME', 'PASS', 'SESSION_CURRENT');
    schedule('expiry', Math.min(expiresAt - Date.now(), 2147483647), expireSession);
    if (checked.failure === 'AVATAR_DESCRIPTOR') mark('AVATAR_DESCRIPTOR', 'FAIL', 'INVALID_PAYLOAD');
    else {
      mark('AVATAR_DESCRIPTOR', checked.fallback ? 'SKIP' : 'PASS', checked.fallback ? 'FALLBACK_EXPECTED' : 'DESCRIPTOR_VALID');
      model.setFallback(checked.fallback);
    }
    mark('BUILD_PROBE', 'RUNNING', 'REQUEST_STARTED');
    try {
      const build = await jsonFetch('/api/game/build');
      if (disposed || leaving) return;
      if (build.available !== true || build.entryPath !== '/game/push-up-arena/index.html' || build.protocolVersion !== 1) throw {safeCode: 'INVALID_PAYLOAD'};
      mark('BUILD_PROBE', 'PASS', 'BUILD_AVAILABLE');
    } catch (error) { showError('BUILD_PROBE', errorCode(error)); return; }
    frameStarted = true;
    startGameGeneration();
    mark('IFRAME_LOAD', 'RUNNING', 'REQUEST_STARTED');
    schedule('frame', 120000, () => { mark('IFRAME_LOAD', 'FAIL', 'FRAME_TIMEOUT'); view.setOpen(true); });
    game.onload = () => {
      if (disposed || leaving) return;
      cancelTimer('frame');
      if (frameLoaded && readyDocument !== game.contentDocument) {
        readyReceived = false;
        startGameGeneration();
        mark('GODOT_HANDSHAKE', 'WAITING', 'FRAME_RELOADED');
      }
      frameLoaded = true;
      status.style.display = 'none';
      game.style.display = 'block';
      mark('IFRAME_LOAD', 'PASS', 'FRAME_LOADED');
      if (!readyReceived) waitForReady();
      else requestDiagnostics();
    };
    game.onerror = () => { mark('IFRAME_LOAD', 'FAIL', 'NETWORK_ERROR'); view.setOpen(true); };
    game.src = '/game/push-up-arena/index.html';
  }
  start().catch(() => showError('ARENA_SHELL', 'PAGE_ERROR'));
})();
