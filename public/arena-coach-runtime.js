(function (root) {
  'use strict';

  const VOICE_URL = '/api/game/speak';

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

  root.PocketPTArenaCoachRuntime = Object.freeze({VOICE_URL, configure});
  configure();
})(typeof window !== 'undefined' ? window : globalThis);
