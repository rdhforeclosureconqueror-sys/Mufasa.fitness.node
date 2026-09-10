// Stable entry point for the Push-Up Arena consolidated diagnostics.
// Loaded by the Arena page after its legacy producer so the producer remains evidence-only.
(function (root) {
  'use strict';
  if (!root?.document) return;
  const script = root.document.createElement('script');
  script.src = '/arena-debug-consolidation-loader.js?v=20260910-arena-single-authority-v1';
  script.defer = true;
  root.document.head.appendChild(script);
})(window);
