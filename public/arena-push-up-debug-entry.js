(function installArenaDebugEntry(root) {
  'use strict';
  if (!root?.document || root.__pocketPTArenaDebugEntryInstalled) return;
  root.__pocketPTArenaDebugEntryInstalled = true;

  const SUPPRESSION_STYLE_ID = 'arena-debug-legacy-suppression';

  function suppressLegacyAuthority() {
    const doc = root.document;
    if (!doc.getElementById(SUPPRESSION_STYLE_ID)) {
      const style = doc.createElement('style');
      style.id = SUPPRESSION_STYLE_ID;
      style.textContent = '[data-pocketpt-debug-producer="true"]{display:none!important}';
      (doc.head || doc.documentElement).appendChild(style);
    }
    for (const id of ['bridgeDebugBoard', 'bridgeDebugToggle']) {
      const element = doc.getElementById(id);
      if (!element) continue;
      element.setAttribute('data-pocketpt-debug-producer', 'true');
      element.setAttribute('aria-hidden', 'true');
      element.style.setProperty('display', 'none', 'important');
    }
  }

  function start() {
    // The legacy board remains the diagnostic producer, but it must never become a
    // second visible authority while the consolidated mobile panel is loading.
    suppressLegacyAuthority();
    if (root.PocketPTArenaDebugConsolidationLoader) {
      root.PocketPTArenaDebugConsolidationLoader.load();
      return;
    }
    if (root.document.querySelector('script[data-arena-debug-consolidation-loader]')) return;
    const script = root.document.createElement('script');
    script.src = '/arena-debug-consolidation-loader.js?v=20260910-consolidation-v3';
    script.async = false;
    script.dataset.arenaDebugConsolidationLoader = 'true';
    root.document.head.appendChild(script);
  }

  // Install suppression immediately; waiting for DOMContentLoaded allowed the old
  // diagnostics control to reappear and cover the phone controls during startup.
  suppressLegacyAuthority();
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})(typeof window === 'undefined' ? globalThis : window);
