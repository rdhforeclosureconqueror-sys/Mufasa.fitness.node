(function (root) {
  'use strict';

  const VOICE_URL = '/api/game/speak';
  let arenaCommandHandler = null;
  let fallbackAskCoach = null;
  let voiceConfigured = false;
  const normalizeArenaCommand = command => String(command || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ARENA_COMMAND = /^(reset|restart|start over|restart everything|ready|i am ready|im ready|capture|capture top|top capture|capture bottom|bottom capture|start|go|begin|stop)$/;

  function voiceConfig() {
    const runtime = root.CoachRuntime;
    const state = runtime?.getState?.() || {};
    return {ok:Boolean(runtime && typeof runtime.speak === 'function' && state.configured && voiceConfigured), voiceUrl:VOICE_URL, configured:Boolean(state.configured), voiceConfigured};
  }

  function configure() {
    const runtime = root.CoachRuntime;
    if (!runtime || typeof runtime.configure !== 'function') {
      return {ok:false, reason:'coach_runtime_unavailable'};
    }
    // Always apply the Arena route. CoachRuntime.configure() explicitly accepts
    // a late voiceUrl update after its one-shot initialization, so skipping this
    // call when another page/runtime configured CoachRuntime first can leave the
    // Arena with no speech backend.
    runtime.configure({deps:{voiceUrl:VOICE_URL}});
    const after = runtime.getState?.() || {};
    voiceConfigured = Boolean(after.configured);
    return {ok:Boolean(after.configured && voiceConfigured), configured:Boolean(after.configured), voiceUrl:VOICE_URL, voiceConfigured};
  }

  function installCommandHandler(handler) {
    if (typeof handler !== 'function') return null;
    const runtime = root.CoachRuntime;
    if (!runtime?.configure) return null;
    arenaCommandHandler = handler;
    const before = runtime.getState?.() || {};
    fallbackAskCoach ||= typeof root.askCoach === 'function' ? root.askCoach : null;
    // configure is idempotent; the arena owns only a narrow command dispatcher.
    // General coach Q&A remains the fallback when the arena does not consume it.
    runtime.configure({deps:{voiceUrl:VOICE_URL, dispatchCommand: async (command, meta) => {
      const normalized = normalizeArenaCommand(command);
      root.__POCKETPT_ARENA_LAST_TRANSCRIPT__ = {command:normalized, at:Date.now()};
      if (/^(reset|restart|start over|restart everything)$/.test(normalized)) {
        root.__POCKETPT_ARENA_LAST_RESET_TRANSCRIPT__ = {command:normalized, at:Date.now()};
      }
      if (/^(ready|i am ready|im ready)$/.test(normalized)) {
        root.__POCKETPT_ARENA_LAST_READY_TRANSCRIPT__ = {command:normalized, at:Date.now()};
      }
      const deterministic = ARENA_COMMAND.test(normalized);
      if (deterministic) {
        const handled = Boolean(arenaCommandHandler && await arenaCommandHandler(normalized, meta));
        // A deterministic exercise command is Arena authority. Even if the UI
        // handler is temporarily unavailable, never reinterpret it as coach chat.
        return {ok:handled, arenaCommand:true, reason:handled ? null : 'arena_handler_unavailable'};
      }
      if (typeof fallbackAskCoach === 'function') return fallbackAskCoach(command, meta);
      return false;
    }, bareCommandMatcher: command => ARENA_COMMAND.test(normalizeArenaCommand(command))}});
    return {dispose(){ arenaCommandHandler = null; }};
  }

  root.PocketPTArenaCoachRuntime = Object.freeze({VOICE_URL, voiceConfig, configure, installCommandHandler});
  configure();
})(typeof window !== 'undefined' ? window : globalThis);
