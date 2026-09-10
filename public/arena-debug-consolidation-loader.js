(function loadArenaDebugConsolidation(root) {
  'use strict';
  if (!root?.document || root.document.querySelector('script[data-arena-debug-consolidation]')) return;
  const script = root.document.createElement('script');
  script.src = '/arena-debug-consolidation.js?v=20260910-arena-single-authority-v1';
  script.defer = true;
  script.dataset.arenaDebugConsolidation = 'true';
  root.document.head.appendChild(script);
})(window);
