(function installArenaDebugConsolidationLoader(root) {
  'use strict';
  if (!root?.document || root.PocketPTArenaDebugConsolidationLoader) return;
  let task = null;

  function load() {
    if (root.PocketPTArenaDebugConsolidation) {
      root.PocketPTArenaDebugConsolidation.install();
      return Promise.resolve(root.PocketPTArenaDebugConsolidation);
    }
    if (task) return task;
    task = new Promise((resolve, reject) => {
      let script = root.document.querySelector('script[data-arena-debug-consolidation]');
      if (!script) {
        script = root.document.createElement('script');
        script.src = '/arena-debug-consolidation.js?v=20260910-consolidation-v3';
        script.async = false;
        script.dataset.arenaDebugConsolidation = 'true';
        root.document.head.appendChild(script);
      }
      const ready = () => {
        const authority = root.PocketPTArenaDebugConsolidation;
        if (!authority) { reject(new Error('ARENA_DEBUG_CONSOLIDATION_NOT_LOADED')); return; }
        authority.install(); resolve(authority);
      };
      if (root.PocketPTArenaDebugConsolidation) ready();
      else { script.addEventListener('load', ready, {once: true}); script.addEventListener('error', reject, {once: true}); }
    });
    return task;
  }

  root.PocketPTArenaDebugConsolidationLoader = Object.freeze({load});
  load();
})(typeof window === 'undefined' ? globalThis : window);
