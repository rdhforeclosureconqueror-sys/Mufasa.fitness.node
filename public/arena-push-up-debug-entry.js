(function installArenaDebugEntry(root) {
  'use strict';
  if (!root?.document || root.__pocketPTArenaDebugEntryInstalled) return;
  root.__pocketPTArenaDebugEntryInstalled = true;

  function start() {
    if (root.PocketPTArenaDebugConsolidationLoader) {
      root.PocketPTArenaDebugConsolidationLoader.load();
      return;
    }
    if (root.document.querySelector('script[data-arena-debug-consolidation-loader]')) return;
    const script = root.document.createElement('script');
    script.src = '/arena-debug-consolidation-loader.js?v=20260910-consolidation-v1';
    script.async = false;
    script.dataset.arenaDebugConsolidationLoader = 'true';
    root.document.head.appendChild(script);
  }

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})(typeof window === 'undefined' ? globalThis : window);
