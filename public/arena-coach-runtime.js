(function (root) {
  'use strict';

  const VOICE_URL = '/api/game/speak';
  let arenaCommandHandler = null;
  let fallbackAskCoach = null;

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
    fallbackAskCoach ||= typeof root.askCoach === 'function' ? root.askCoach : null;
    // configure is idempotent; the arena owns only a narrow command dispatcher.
    // General coach Q&A remains the fallback when the arena does not consume it.
    runtime.configure({deps:{voiceUrl:VOICE_URL, dispatchCommand: async (command, meta) => {
      if (arenaCommandHandler && await arenaCommandHandler(command, meta)) return {ok:true, arenaCommand:true};
      if (typeof fallbackAskCoach === 'function') return fallbackAskCoach(command, meta);
      return false;
    }, bareCommandMatcher: command => /^(reset|restart|start over|restart everything|ready|i am ready|im ready|capture|capture top|top capture|capture bottom|bottom capture|start|go|begin)$/.test(String(command || '').trim().toLowerCase())}});
    return {dispose(){ arenaCommandHandler = null; }};
  }

  root.PocketPTArenaCoachRuntime = Object.freeze({VOICE_URL, configure, installCommandHandler});
  configure();
})(typeof window !== 'undefined' ? window : globalThis);
