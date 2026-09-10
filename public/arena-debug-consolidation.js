(function createArenaDebugConsolidation(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaDebugConsolidation = api;
})(typeof window === 'undefined' ? globalThis : window, function (root) {
  'use strict';
  const AUTHORITY_ID = 'arenaDebugAuthority';
  const LAUNCHER_ID = 'arenaDebugAuthorityLauncher';
  const LEGACY_BOARD_ID = 'bridgeDebugBoard';
  const LEGACY_TOGGLE_ID = 'bridgeDebugToggle';
  let installed = false, open = false, interval = null;

  function forceHidden(element) {
    if (!element) return;
    element.setAttribute('aria-hidden', 'true');
    element.style?.setProperty('display', 'none', 'important');
  }
  function safeText(element) { return String(element?.innerText || element?.textContent || '').replace(/\n{3,}/g, '\n\n').trim(); }
  function firstFailure(board) {
    const explicit = safeText(board?.querySelector?.('.dbg-first'));
    if (explicit) return explicit.replace(/^FIRST FAILURE\s*:?\s*/i, '').trim() || 'NONE';
    const failed = board?.querySelector?.('li .dbg-FAIL')?.closest?.('li');
    return failed ? safeText(failed) : 'NONE';
  }
  function report(board) {
    return ['POCKETPT PUSH-UP ARENA — DEBUG', `FIRST FAILURE: ${firstFailure(board)}`,
      'Live diagnostic evidence:', safeText(board) || 'Waiting for Arena diagnostic producer…'].join('\n\n');
  }
  function copy(text, button, panel) {
    const done = () => { button.textContent = 'Copied ✓'; root.setTimeout?.(() => { if (button.isConnected) button.textContent = 'Copy All'; }, 1200); };
    if (root.navigator?.clipboard?.writeText) {
      root.navigator.clipboard.writeText(text).then(done).catch(() => { panel.dataset.copyError = 'Clipboard unavailable'; render(); });
      return;
    }
    const area = root.document.createElement('textarea'); area.value = text; area.readOnly = true;
    area.style.position = 'fixed'; area.style.opacity = '0'; root.document.body.appendChild(area); area.select();
    if (root.document.execCommand?.('copy')) done(); else { panel.dataset.copyError = 'Clipboard unavailable'; render(); }
    area.remove();
  }
  function ensureStyle(doc) {
    if (doc.getElementById('arenaDebugAuthorityStyles')) return;
    const style = doc.createElement('style'); style.id = 'arenaDebugAuthorityStyles';
    style.textContent = `#${LAUNCHER_ID}{position:fixed;z-index:2147483000;right:14px;bottom:max(48px,calc(14px + env(safe-area-inset-bottom)));border:1px solid #765f1e;background:#17130a;color:#ffd35a;border-radius:999px;padding:12px 16px;font:800 13px system-ui}#${AUTHORITY_ID}{position:fixed;z-index:2147483001;right:12px;bottom:max(100px,calc(64px + env(safe-area-inset-bottom)));width:min(560px,calc(100vw - 24px));max-height:min(76dvh,760px);overflow:hidden;background:#090b10fa;border:1px solid #39455a;border-radius:18px;color:#f6f8fb;box-shadow:0 26px 80px #000d;font:13px/1.45 system-ui}#${AUTHORITY_ID}[hidden],#${LAUNCHER_ID}[hidden]{display:none!important}#${AUTHORITY_ID} .ada-head{display:flex;gap:8px;align-items:flex-start;padding:12px;border-bottom:1px solid #39455a}#${AUTHORITY_ID} .ada-title{flex:1;font-size:18px;font-weight:900;color:#ffd35a}#${AUTHORITY_ID} button{min-height:40px;padding:8px 11px;border:1px solid #52617a;border-radius:8px;background:#20283a;color:#fff;font-weight:800}#${AUTHORITY_ID} .ada-body{padding:12px;max-height:calc(76dvh - 66px);overflow:auto}#${AUTHORITY_ID} .ada-first{padding:10px;border:1px solid #a8485c;border-radius:9px;background:#2b1117;color:#ffc0c9;font-weight:800}#${AUTHORITY_ID} pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#dce4f2;font:11px/1.4 ui-monospace,monospace}#${AUTHORITY_ID} .ada-error{color:#ffb4b4}`;
    doc.head.appendChild(style);
  }
  function ensureElements(doc) {
    let launcher = doc.getElementById(LAUNCHER_ID);
    if (!launcher) { launcher = doc.createElement('button'); launcher.id = LAUNCHER_ID; launcher.type = 'button'; launcher.textContent = 'Arena Diagnostics'; launcher.addEventListener('click', () => { open = true; render(); }); doc.body.appendChild(launcher); }
    let panel = doc.getElementById(AUTHORITY_ID);
    if (!panel) {
      panel = doc.createElement('aside'); panel.id = AUTHORITY_ID; panel.setAttribute('aria-label', 'PocketPT Arena debug authority');
      panel.innerHTML = '<div class="ada-head"><div class="ada-title">Arena Debug</div><button type="button" data-copy>Copy All</button><button type="button" data-close>Close</button></div><div class="ada-body"><div class="ada-first"></div><pre></pre></div>';
      panel.addEventListener('click', event => { const button = event.target?.closest?.('button'); if (!button) return; if (button.hasAttribute('data-close')) { open = false; render(); } else if (button.hasAttribute('data-copy')) copy(panel.dataset.copyText || '', button, panel); });
      doc.body.appendChild(panel);
    }
    return {launcher, panel};
  }
  function render() {
    const doc = root?.document; if (!doc?.body) return;
    ensureStyle(doc);
    const board = doc.getElementById(LEGACY_BOARD_ID), toggle = doc.getElementById(LEGACY_TOGGLE_ID);
    forceHidden(board); forceHidden(toggle);
    const {launcher, panel} = ensureElements(doc), failure = firstFailure(board), evidence = safeText(board) || 'Waiting for Arena diagnostic producer…';
    panel.hidden = !open; launcher.hidden = open; panel.querySelector('.ada-first').textContent = `FIRST FAILURE: ${failure}`;
    panel.querySelector('pre').textContent = evidence; panel.dataset.copyText = report(board);
  }
  function install() {
    if (installed) return api; installed = true;
    const start = () => { render(); interval = root.setInterval?.(render, 1000) || null; };
    if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
    return api;
  }
  const api = Object.freeze({install, render, open() {open = true; render();}, close() {open = false; render();}, firstFailure, report,
    diagnostics: () => Object.freeze({installed, open, intervalActive: interval !== null})});
  return api;
});
