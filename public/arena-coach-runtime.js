(function (root) {
  'use strict';

  const VOICE_URL = '/api/game/speak';
  let arenaCommandHandler = null;
  let previousDispatcher = null;

  function configure() {
    const runtime = root.CoachRuntime;
    if (!runtime || typeof runtime.configure !== 'function') {
      return {ok:false, reason:'coach_runtime_unavailable'};
    }
    const before = runtime.getState?.() || {};
    if (!before.configured) {
      runtime.configure({deps:{voiceUrl:VOICE_URL}});
    }
    const after = runtime.getState?.() || {};
    return {ok:Boolean(after.configured), configured:Boolean(after.configured), voiceUrl:VOICE_URL};
  }

  function installCommandHandler(handler) {
    if (typeof handler !== 'function') return null;
    const runtime = root.CoachRuntime;
    if (!runtime?.configure) return null;
    arenaCommandHandler = handler;
    const before = runtime.getState?.() || {};
    previousDispatcher = previousDispatcher || null;
    // configure is idempotent; the arena owns only a narrow command dispatcher.
    // General coach Q&A remains the fallback when the arena does not consume it.
    runtime.configure({deps:{voiceUrl:VOICE_URL, dispatchCommand: async (command, meta) => {
      if (arenaCommandHandler && await arenaCommandHandler(command, meta)) return {ok:true, arenaCommand:true};
      if (typeof previousDispatcher === 'function') return previousDispatcher(command, meta);
      return false;
    }}});
    return {dispose(){ arenaCommandHandler = null; }};
  }

  root.PocketPTArenaCoachRuntime = Object.freeze({VOICE_URL, configure, installCommandHandler});
  configure();
})(typeof window !== 'undefined' ? window : globalThis);
