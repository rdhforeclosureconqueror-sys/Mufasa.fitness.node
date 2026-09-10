(function createArenaDebugConsolidation(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTArenaDebugConsolidation = api;
})(typeof window === 'undefined' ? globalThis : window, function (root) {
  'use strict';
  const AUTHORITY_ID = 'arenaDebugAuthority';
  const LAUNCHER_ID = 'arenaDebugAuthorityLauncher';
  const MANAGED_ATTRIBUTE = 'data-pocketpt-debug-producer';
  const SOURCE_ORDER = ['bridgeDebugBoard', 'mirrorMotionAcceptanceDebug', 'mirrorMotionLiveAcceptanceDebug', 'mirrorMotionLiveAcceptanceControls'];
  let installed = false, open = false, interval = null, observer = null;
  const providers = new Map();

  function safeText(element) { return String(element?.innerText || element?.textContent || '').replace(/\n{3,}/g, '\n\n').trim(); }
  function isProducer(element) {
    if (!element || element.nodeType !== 1 || element.id === AUTHORITY_ID || element.id === LAUNCHER_ID) return false;
    const id = String(element.id || '');
    return id === 'bridgeDebugBoard' || id === 'bridgeDebugToggle'
      || id === 'pocketptMirrorDebugCenter' || id === 'pocketptMirrorDebugLauncher'
      || /^mirrorMotion.*(?:Debug|Acceptance|Controls)$/i.test(id)
      || /^mirror.*Camera.*(?:Debug|Review|Motion)$/i.test(id)
      || Boolean(element.matches?.('[data-mirror-motion-diagnostics],[data-mirror-motion-phase3-diagnostics],[data-mirror-motion-phase4-diagnostics]'));
  }
  function producerHost(element) {
    if (!element) return null;
    const id = String(element.id || '');
    if (id === 'bridgeDebugBoard' || id === 'bridgeDebugToggle' || id === 'pocketptMirrorDebugCenter' || id === 'pocketptMirrorDebugLauncher'
      || /^mirrorMotion.*(?:Debug|Acceptance|Controls)$/i.test(id) || /^mirror.*Camera.*(?:Debug|Review|Motion)$/i.test(id)) return element;
    if (element.matches?.('[data-mirror-motion-diagnostics],[data-mirror-motion-phase3-diagnostics],[data-mirror-motion-phase4-diagnostics]'))
      return element.closest?.('section,details,aside,div') || element;
    const nested = element.querySelectorAll?.('[id],[data-mirror-motion-diagnostics],[data-mirror-motion-phase3-diagnostics],[data-mirror-motion-phase4-diagnostics]') || [];
    for (const candidate of nested) {
      if (!isProducer(candidate)) continue;
      return candidate.closest?.('section,details,aside,div') || candidate;
    }
    return null;
  }
  function suppress(element) {
    const host = producerHost(element);
    if (!host || host.id === AUTHORITY_ID || host.id === LAUNCHER_ID) return null;
    if (host.getAttribute?.(MANAGED_ATTRIBUTE) !== 'true') host.setAttribute(MANAGED_ATTRIBUTE, 'true');
    if (host.getAttribute?.('aria-hidden') !== 'true') host.setAttribute('aria-hidden', 'true');
    if (host.style?.getPropertyValue?.('display') !== 'none' || host.style?.getPropertyPriority?.('display') !== 'important') host.style?.setProperty('display', 'none', 'important');
    return host;
  }
  function discover(doc = root?.document) {
    if (!doc?.body) return [];
    const found = new Set();
    for (const element of doc.querySelectorAll?.('[id],[data-mirror-motion-diagnostics],[data-mirror-motion-phase3-diagnostics],[data-mirror-motion-phase4-diagnostics]') || []) {
      const host = producerHost(element);
      if (host) found.add(host);
    }
    return [...found].filter(element => element.id !== AUTHORITY_ID && element.id !== LAUNCHER_ID);
  }
  function sourceLabel(element) {
    if (element.id === 'bridgeDebugBoard') return 'Arena launch and bridge';
    if (element.id === 'bridgeDebugToggle' || /Launcher$/.test(element.id)) return '';
    const text = safeText(element);
    const phase = `${element.id} ${text}`.match(/phase\s*(\d+)/i);
    if (phase) return `Mirror Motion Phase ${phase[1]}`;
    if (/live acceptance/i.test(`${element.id} ${text}`)) return 'Mirror Motion Live Acceptance';
    if (/acceptance/i.test(`${element.id} ${text}`)) return 'Mirror Motion Acceptance';
    if (/camera/i.test(`${element.id} ${text}`)) return 'Mirror Motion Camera';
    if (element.id === 'pocketptMirrorDebugCenter') return 'Mirror diagnostic consolidation';
    return element.id || 'Diagnostic producer';
  }
  function sources() {
    const dom = discover().map(element => ({id: element.id || 'anonymous', label: sourceLabel(element), text: safeText(element)}))
      .filter(source => source.label && source.text);
    const supplied = [...providers].map(([id, provider]) => {
      try { return {id, label: provider.label || id, text: String(provider.report?.() || '')}; }
      catch (error) { return {id, label: provider.label || id, text: `Provider error: ${error?.message || error}`}; }
    }).filter(source => source.text);
    const unique = new Map();
    for (const source of [...dom, ...supplied]) {
      const key = source.text.replace(/\s+/g, ' ').trim();
      if (key && !unique.has(key)) unique.set(key, source);
    }
    return [...unique.values()].sort((a, b) => {
      const ai = SOURCE_ORDER.indexOf(a.id), bi = SOURCE_ORDER.indexOf(b.id);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
  }
  function failureFrom(text) {
    const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const explicit = lines.find(line => /^(?:FIRST FAILURE|First failing boundary)\s*:/i.test(line) && !/:\s*(?:none|none observed|NONE)\b/i.test(line));
    return explicit?.replace(/^(?:FIRST FAILURE|First failing boundary)\s*:\s*/i, '') || null;
  }
  function firstFailure(allSources = sources()) {
    for (const source of allSources) { const failure = failureFrom(source.text); if (failure) return failure; }
    return 'NONE';
  }
  function report(allSources = sources()) {
    const output = ['POCKETPT PUSH-UP ARENA — DEBUG', `FIRST FAILURE: ${firstFailure(allSources)}`];
    for (const source of allSources) output.push('', `=== ${source.label.toUpperCase()} ===`, source.text);
    if (!allSources.length) output.push('', 'Waiting for diagnostic producers…');
    return output.join('\n');
  }
  function copy(value, button, panel) {
    const done = () => { button.textContent = 'Copied ✓'; root.setTimeout?.(() => { if (button.isConnected) button.textContent = 'Copy All'; }, 1200); };
    if (root.navigator?.clipboard?.writeText) { root.navigator.clipboard.writeText(value).then(done).catch(() => { panel.dataset.copyError = 'Clipboard unavailable'; render(); }); return; }
    const area = root.document.createElement('textarea'); area.value = value; area.readOnly = true; area.style.position = 'fixed'; area.style.opacity = '0'; root.document.body.appendChild(area); area.select();
    if (root.document.execCommand?.('copy')) done(); else { panel.dataset.copyError = 'Clipboard unavailable'; render(); } area.remove();
  }
  function ensureStyle(doc) {
    if (doc.getElementById('arenaDebugAuthorityStyles')) return;
    const style = doc.createElement('style'); style.id = 'arenaDebugAuthorityStyles';
    style.textContent = `[${MANAGED_ATTRIBUTE}="true"]{display:none!important}#${LAUNCHER_ID}{position:fixed;z-index:2147483000;right:14px;bottom:max(48px,calc(14px + env(safe-area-inset-bottom)));border:1px solid #765f1e;background:#17130a;color:#ffd35a;border-radius:999px;padding:12px 16px;font:800 13px system-ui}#${AUTHORITY_ID}{position:fixed;z-index:2147483001;right:12px;bottom:max(100px,calc(64px + env(safe-area-inset-bottom)));width:min(560px,calc(100vw - 24px));max-height:min(76dvh,760px);overflow:hidden;background:#090b10fa;border:1px solid #39455a;border-radius:18px;color:#f6f8fb;box-shadow:0 26px 80px #000d;font:13px/1.45 system-ui}#${AUTHORITY_ID}[hidden],#${LAUNCHER_ID}[hidden]{display:none!important}#${AUTHORITY_ID} .ada-head{display:flex;gap:8px;align-items:flex-start;padding:12px;border-bottom:1px solid #39455a}#${AUTHORITY_ID} .ada-title{flex:1;font-size:18px;font-weight:900;color:#ffd35a}#${AUTHORITY_ID} button{min-height:40px;padding:8px 11px;border:1px solid #52617a;border-radius:8px;background:#20283a;color:#fff;font-weight:800}#${AUTHORITY_ID} .ada-body{padding:12px;max-height:calc(76dvh - 66px);overflow:auto}#${AUTHORITY_ID} .ada-first{padding:10px;border:1px solid #a8485c;border-radius:9px;background:#2b1117;color:#ffc0c9;font-weight:800}#${AUTHORITY_ID} details{border:1px solid #293244;border-radius:9px;margin-top:9px}#${AUTHORITY_ID} summary{padding:9px;font-weight:800}#${AUTHORITY_ID} pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:9px;margin:0;color:#dce4f2;font:11px/1.4 ui-monospace,monospace}@media(max-width:600px){#${AUTHORITY_ID}{inset:auto 8px max(72px,calc(54px + env(safe-area-inset-bottom))) 8px;width:auto;max-height:72dvh}}`;
    doc.head.appendChild(style);
  }
  function ensureElements(doc) {
    let launcher = doc.getElementById(LAUNCHER_ID);
    if (!launcher) { launcher = doc.createElement('button'); launcher.id = LAUNCHER_ID; launcher.type = 'button'; launcher.textContent = 'Arena Diagnostics'; launcher.addEventListener('click', () => { open = true; render(); }); doc.body.appendChild(launcher); }
    let panel = doc.getElementById(AUTHORITY_ID);
    if (!panel) { panel = doc.createElement('aside'); panel.id = AUTHORITY_ID; panel.setAttribute('aria-label', 'PocketPT Arena debug authority'); panel.innerHTML = '<div class="ada-head"><div class="ada-title">Arena Debug</div><button type="button" data-copy>Copy All</button><button type="button" data-close>Close</button></div><div class="ada-body"><div class="ada-first"></div><div data-sources></div></div>'; panel.addEventListener('click', event => { const button = event.target?.closest?.('button'); if (!button) return; if (button.hasAttribute('data-close')) { open = false; render(); launcher.focus?.(); } else if (button.hasAttribute('data-copy')) copy(panel.dataset.copyText || '', button, panel); }); doc.body.appendChild(panel); }
    return {launcher, panel};
  }
  function render() {
    const doc = root?.document; if (!doc?.body) return;
    ensureStyle(doc); discover(doc).forEach(suppress);
    const {launcher, panel} = ensureElements(doc), allSources = sources();
    panel.hidden = !open; launcher.hidden = open; panel.querySelector('.ada-first').textContent = `FIRST FAILURE: ${firstFailure(allSources)}`;
    const holder = panel.querySelector('[data-sources]'); holder.innerHTML = '';
    for (const source of allSources) { const details = doc.createElement('details'), summary = doc.createElement('summary'), pre = doc.createElement('pre'); summary.textContent = source.label; pre.textContent = source.text; details.append(summary, pre); holder.appendChild(details); }
    if (!allSources.length) holder.textContent = 'Waiting for diagnostic producers…'; panel.dataset.copyText = report(allSources);
  }
  function registerProducer(id, provider = {}) { providers.set(String(id), provider); render(); return () => { providers.delete(String(id)); render(); }; }
  function observe(doc) {
    if (!root.MutationObserver || observer) return;
    observer = new root.MutationObserver(records => { let changed = false; for (const record of records) { if (record.type === 'attributes' && suppress(record.target)) changed = true; for (const node of record.addedNodes || []) if (suppress(node)) changed = true; } if (changed && open) render(); });
    observer.observe(doc.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden', MANAGED_ATTRIBUTE, 'aria-hidden']});
  }
  function install() {
    if (installed) return api; installed = true;
    root.PocketPTDebugPresentation = Object.freeze({authority: 'arena', registerProducer, suppress, refresh: render});
    const start = () => { render(); observe(root.document); interval = root.setInterval?.(render, 1000) || null; };
    if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
    return api;
  }
  const api = Object.freeze({install, render, registerProducer, suppress, sources, open() {open = true; render();}, close() {open = false; render();}, firstFailure, report, diagnostics: () => Object.freeze({installed, open, intervalActive: interval !== null, observerActive: observer !== null, producerCount: sources().length})});
  return api;
});
