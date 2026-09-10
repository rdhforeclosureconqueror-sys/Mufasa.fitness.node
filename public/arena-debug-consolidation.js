(function installArenaDebugConsolidation(root) {
  'use strict';
  if (!root?.document || root.PocketPTArenaDebugConsolidation) return;

  const doc = root.document;
  const LEGACY_BOARD = 'bridgeDebugBoard';
  const LEGACY_TOGGLE = 'bridgeDebugToggle';
  const CENTER_ID = 'pocketptArenaDebugCenter';
  const LAUNCHER_ID = 'pocketptArenaDebugLauncher';

  function sourceText() {
    const board = doc.getElementById(LEGACY_BOARD);
    return String(board?.innerText || board?.textContent || '').trim();
  }

  function firstFailure(text) {
    const explicit = String(text).match(/FIRST FAILURE:\s*([^\n]+)/i)?.[1]?.trim();
    if (explicit && !/^none observed$/i.test(explicit)) return explicit;
    const line = String(text).split(/\n+/).map(v => v.trim()).find(v => /^(FAIL|NOT_CONNECTED|BLOCKED)\s*\|/i.test(v));
    return line || 'none observed';
  }

  function copy(text, button) {
    const done = () => { button.textContent = 'Copied ✓'; root.setTimeout(() => { if (button.isConnected) button.textContent = 'Copy All'; }, 1200); };
    if (root.navigator?.clipboard?.writeText) return root.navigator.clipboard.writeText(text).then(done).catch(() => {});
    const area = doc.createElement('textarea'); area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
    doc.body.appendChild(area); area.select(); const ok = doc.execCommand?.('copy'); area.remove(); if (ok) done();
  }

  function install() {
    const legacyBoard = doc.getElementById(LEGACY_BOARD);
    const legacyToggle = doc.getElementById(LEGACY_TOGGLE);
    if (!legacyBoard || !legacyToggle || doc.getElementById(CENTER_ID)) return false;

    legacyToggle.hidden = true;
    legacyToggle.style.setProperty('display', 'none', 'important');
    legacyBoard.hidden = true;
    legacyBoard.style.setProperty('display', 'none', 'important');

    const style = doc.createElement('style');
    style.textContent = `#${LAUNCHER_ID}{position:fixed;right:12px;bottom:12px;z-index:2147483000;border:1px solid #a78bfa;border-radius:999px;background:#08111d;color:#fff;padding:10px 14px;font:700 13px system-ui}#${CENTER_ID}{position:fixed;right:12px;bottom:12px;z-index:2147483001;width:min(680px,calc(100vw - 24px));max-height:78vh;background:#020617;color:#f8fafc;border:1px solid #8b5cf6;border-radius:16px;overflow:hidden;font:13px system-ui}#${CENTER_ID}[hidden],#${LAUNCHER_ID}[hidden]{display:none!important}#${CENTER_ID} header{min-height:0;padding:10px 12px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #334155}#${CENTER_ID} header strong{flex:1}#${CENTER_ID} button{min-height:34px;border:1px solid #475569;border-radius:8px;background:#111827;color:#fff;padding:5px 9px;font-weight:700}#${CENTER_ID} .arena-debug-body{padding:10px;overflow:auto;max-height:calc(78vh - 56px)}#${CENTER_ID} pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.4 ui-monospace,monospace}#${CENTER_ID} .arena-first{padding:10px;border:1px solid #475569;border-radius:10px;background:#0b1220}`;
    doc.head.appendChild(style);

    const launcher = doc.createElement('button'); launcher.id = LAUNCHER_ID; launcher.type = 'button'; launcher.textContent = 'Debug';
    const center = doc.createElement('section'); center.id = CENTER_ID; center.hidden = true;
    center.innerHTML = '<header><strong>Arena Debug Center</strong><button data-copy type="button">Copy All</button><button data-close type="button" aria-label="Close debug center">✕</button></header><div class="arena-debug-body"><div class="arena-first"></div><pre></pre></div>';
    function render() { const text = sourceText() || 'Waiting for Arena diagnostics…'; center.querySelector('.arena-first').textContent = `FIRST FAILURE: ${firstFailure(text)}`; center.querySelector('pre').textContent = text; center.dataset.copyText = text; }
    launcher.addEventListener('click', () => { render(); launcher.hidden = true; center.hidden = false; });
    center.querySelector('[data-close]').addEventListener('click', () => { center.hidden = true; launcher.hidden = false; });
    center.querySelector('[data-copy]').addEventListener('click', event => copy(center.dataset.copyText || sourceText(), event.currentTarget));
    doc.body.append(launcher, center);
    new MutationObserver(() => { legacyToggle.style.setProperty('display','none','important'); legacyBoard.style.setProperty('display','none','important'); if (!center.hidden) render(); }).observe(legacyBoard, {subtree:true, childList:true, characterData:true, attributes:true});
    root.PocketPTArenaDebugConsolidation = Object.freeze({render, sourceText});
    return true;
  }

  if (!install()) doc.addEventListener('DOMContentLoaded', install, {once:true});
})(window);
