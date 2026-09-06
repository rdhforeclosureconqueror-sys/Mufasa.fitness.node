(function initMirrorDebugCenter(global){
  'use strict';
  if (!global || global.PocketPTMirrorDebugCenter) return;

  const state = { installed:false, open:false, showLegacy:false, refreshes:0, managedIds:[] };
  const CENTER_ID = 'pocketptMirrorDebugCenter';
  const LAUNCHER_ID = 'pocketptMirrorDebugLauncher';
  const STYLE_ID = 'pocketptMirrorDebugCenterStyles';

  function isManagedPanel(el){
    if (!el || el.id === CENTER_ID || el.id === LAUNCHER_ID) return false;
    const id = String(el.id || '');
    if (/^mirrorMotion.*(?:Debug|Acceptance|Controls)$/i.test(id)) return true;
    if (/^mirror.*Camera.*(?:Debug|Review|Motion)/i.test(id)) return true;
    if (el.querySelector?.('[data-mirror-motion-diagnostics],[data-mirror-motion-phase3-diagnostics],[data-mirror-motion-phase4-diagnostics]')) return true;
    return false;
  }

  function discoverPanels(){
    const doc = global.document;
    if (!doc?.body) return [];
    const found = new Set();
    doc.querySelectorAll('[id]').forEach(el => { if (isManagedPanel(el)) found.add(el); });
    doc.querySelectorAll('[data-mirror-motion-diagnostics],[data-mirror-motion-phase3-diagnostics],[data-mirror-motion-phase4-diagnostics]').forEach(node => {
      const host = node.closest?.('section,details,aside,div');
      if (host && host.id !== CENTER_ID) found.add(host);
    });
    return [...found];
  }

  function phaseNumber(text){
    const match = String(text || '').match(/phase\s*(\d+)/i);
    return match ? Number(match[1]) : 999;
  }

  function labelFor(panel){
    const text = `${panel.id || ''} ${panel.textContent || ''}`;
    const phase = text.match(/phase\s*(\d+)/i);
    if (phase) return `Phase ${phase[1]}`;
    if (/live acceptance|acceptance harness|acceptance controls/i.test(text)) return 'Live Acceptance';
    if (/camera/i.test(text)) return 'Camera Motion';
    return panel.id || 'Mirror Diagnostics';
  }

  function purposeFor(label){
    const n = phaseNumber(label);
    const purposes = {
      2:'MoveNet confidence + temporal stabilization',3:'Body proportions + left/right structural constraints',4:'Exercise context + contact anchors',5:'Contact-aware IK',6:'Adaptive live smoothing/curves',7:'Facing intent',8:'Rest-relative avatar yaw',9:'Foreshortening guard',10:'Live foreshortening activation',11:'Near/far occlusion authority',12:'Pipeline health + downstream loader truth',13:'Lateral body intent',14:'Avatar root-X movement',15:'Contact/root conflict analysis',16:'Contact compensation',17:'Standing-to-floor transition state',18:'Direction-aware floor assistance'
    };
    if (purposes[n]) return purposes[n];
    if (/acceptance/i.test(label)) return 'Ordered real-device acceptance + first-failure gate';
    if (/camera/i.test(label)) return 'Separate member translation from camera/scene motion';
    return 'Mirror-motion diagnostics';
  }

  function diagnosticsText(panel){
    const pre = panel.querySelector?.('pre');
    return String(pre?.textContent || panel.textContent || '').trim();
  }

  function firstBoundaryFrom(text){
    const lines = String(text || '').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const preferred = lines.find(line => /first failing boundary\s*:/i.test(line) && !/:\s*(none|NONE)\s*$/i.test(line));
    return preferred || null;
  }

  function currentAcceptance(){
    const h = global.PocketPTMirrorMotionLiveAcceptance;
    const report = h?.report?.() || null;
    return { h, report, controls: global.PocketPTMirrorMotionLiveAcceptanceControls };
  }

  function installStyles(){
    const doc = global.document;
    if (!doc || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${LAUNCHER_ID}{position:fixed;right:12px;bottom:12px;z-index:9000;border:1px solid #a78bfa;border-radius:999px;background:#08111d;color:#fff;padding:10px 14px;font:700 13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35)}
      #${CENTER_ID}{position:fixed;left:8px;right:8px;bottom:8px;z-index:9001;max-height:76vh;background:rgba(2,6,23,.98);color:#f8fafc;border:1px solid #8b5cf6;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.55);font:13px system-ui;overflow:hidden}
      #${CENTER_ID}[hidden]{display:none!important}
      #${CENTER_ID} .mdc-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #334155;position:sticky;top:0;background:#07111f;z-index:2}
      #${CENTER_ID} .mdc-title{font-weight:800;flex:1}.mdc-sub{font-size:11px;color:#94a3b8}
      #${CENTER_ID} button{min-height:36px;border-radius:9px;border:1px solid #475569;background:#111827;color:#fff;padding:6px 10px;font-weight:700}
      #${CENTER_ID} button[data-result="PASS"]{background:#16a34a}#${CENTER_ID} button[data-result="FAIL"]{background:#dc2626}#${CENTER_ID} button[data-result="BLOCKED"]{background:#d97706}
      #${CENTER_ID} .mdc-body{padding:10px;overflow:auto;max-height:calc(76vh - 58px)}
      #${CENTER_ID} .mdc-summary{padding:10px;border:1px solid #334155;border-radius:12px;margin-bottom:10px;background:#0b1220}
      #${CENTER_ID} .mdc-bad{color:#fca5a5;font-weight:800}.mdc-good{color:#86efac;font-weight:800}.mdc-wait{color:#fde68a;font-weight:800}
      #${CENTER_ID} .mdc-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      #${CENTER_ID} details{border:1px solid #334155;border-radius:10px;margin:7px 0;background:#050b16}#${CENTER_ID} summary{cursor:pointer;padding:9px 10px;font-weight:750}
      #${CENTER_ID} .mdc-purpose{font-size:11px;color:#94a3b8;font-weight:500;margin-left:6px}
      #${CENTER_ID} pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:10px;border-top:1px solid #1e293b;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#dbeafe}
      #${CENTER_ID} textarea{width:100%;box-sizing:border-box;min-height:52px;background:#020617;color:#fff;border:1px solid #475569;border-radius:8px;padding:8px;margin-top:8px}
      [data-mirror-debug-center-managed="true"]{display:none!important}
      body.mirror-debug-show-legacy [data-mirror-debug-center-managed="true"]{display:revert!important}
      @media (min-width:800px){#${CENTER_ID}{left:auto;width:min(620px,calc(100vw - 24px));right:12px;bottom:12px}}
    `;
    doc.head.appendChild(style);
  }

  function markLegacyPanels(){
    const panels = discoverPanels();
    state.managedIds = panels.map((p,i)=>p.id || `anonymous-${i}`);
    panels.forEach(panel => panel.setAttribute('data-mirror-debug-center-managed','true'));
    return panels;
  }

  function render(){
    const doc = global.document;
    if (!doc?.body) return;
    installStyles();
    const panels = markLegacyPanels();
    doc.body.classList.toggle('mirror-debug-show-legacy', state.showLegacy);

    let launcher = doc.getElementById(LAUNCHER_ID);
    if (!launcher){
      launcher = doc.createElement('button');
      launcher.id = LAUNCHER_ID;
      launcher.type = 'button';
      launcher.textContent = 'Debug';
      launcher.addEventListener('click',()=>{state.open=true;render();});
      doc.body.appendChild(launcher);
    }

    let center = doc.getElementById(CENTER_ID);
    if (!center){
      center = doc.createElement('section');
      center.id = CENTER_ID;
      center.innerHTML = '<div class="mdc-head"><div><div class="mdc-title">Mirror Debug Center</div><div class="mdc-sub">One panel • earliest failure first • phase/source preserved</div></div><button data-legacy type="button">Legacy</button><button data-close type="button" aria-label="Close debug center">✕</button></div><div class="mdc-body"></div>';
      center.addEventListener('click',event=>{
        const btn = event.target?.closest?.('button'); if(!btn) return;
        if(btn.hasAttribute('data-close')){state.open=false;render();return;}
        if(btn.hasAttribute('data-legacy')){state.showLegacy=!state.showLegacy;render();return;}
        if(btn.hasAttribute('data-reset-acceptance')){try{currentAcceptance().controls?.reset?.() || currentAcceptance().h?.reset?.();}catch(_){} render();return;}
        const result=btn.getAttribute('data-result');
        if(result){try{const notes=center.querySelector('[data-acceptance-notes]')?.value||'';currentAcceptance().controls?.record?.(result,notes);if(center.querySelector('[data-acceptance-notes]'))center.querySelector('[data-acceptance-notes]').value='';}catch(error){center.dataset.lastError=String(error?.message||error);}render();}
      });
      doc.body.appendChild(center);
    }
    center.hidden = !state.open;
    launcher.hidden = state.open;
    if(!state.open) return;

    const body = center.querySelector('.mdc-body');
    const acceptance = currentAcceptance();
    const report = acceptance.report;
    const allTexts = panels.map(panel=>({panel,label:labelFor(panel),text:diagnosticsText(panel)}));
    const firstPanelFailure = allTexts.map(x=>({label:x.label,boundary:firstBoundaryFrom(x.text)})).find(x=>x.boundary);
    const canonicalStatus = global.PocketPTMirrorMotionAcceptance?.diagnostics?.()?.mirrorMotionFoundationStatus || report?.snapshot?.mirrorMotionFoundationStatus || 'UNKNOWN';
    const firstFailure = report?.firstFailure ? `${report.firstFailure.label} (${report.firstFailure.result})` : firstPanelFailure?.boundary || 'NONE';
    const statusClass = /FAIL|STOPPED/i.test(String(canonicalStatus)) || firstFailure!=='NONE' ? 'mdc-bad' : /READY|PASS/i.test(String(canonicalStatus)) ? 'mdc-good' : 'mdc-wait';
    const next = report?.firstFailure ? 'STOP — fix first failure, then RESET' : report?.steps?.find(s=>s.result==='NOT_RUN')?.label || (report?.complete?'Acceptance complete':'Waiting for acceptance harness');

    const cards = allTexts.sort((a,b)=>phaseNumber(a.label)-phaseNumber(b.label)).map(item=>`<details><summary>${escapeHtml(item.label)}<span class="mdc-purpose">${escapeHtml(purposeFor(item.label))}</span></summary><pre>${escapeHtml(item.text||'No diagnostic text yet')}</pre></details>`).join('');
    const stopped = Boolean(report?.firstFailure);
    const runnable = report?.steps?.some(s=>s.result==='NOT_RUN') && !stopped;
    const acceptanceControls = report ? `<div class="mdc-actions"><button data-result="PASS" ${runnable?'':'disabled'}>PASS</button><button data-result="FAIL" ${runnable?'':'disabled'}>FAIL</button><button data-result="BLOCKED" ${runnable?'':'disabled'}>BLOCKED</button><button data-reset-acceptance>RESET</button></div><textarea data-acceptance-notes placeholder="What did you see?" ${runnable?'':'disabled'}></textarea>` : '';
    body.innerHTML = `<div class="mdc-summary"><div class="${statusClass}">Canonical status: ${escapeHtml(String(canonicalStatus))}</div><div><strong>First failing boundary:</strong> ${escapeHtml(String(firstFailure))}</div><div><strong>Next action:</strong> ${escapeHtml(String(next))}</div>${center.dataset.lastError?`<div class="mdc-bad">Control error: ${escapeHtml(center.dataset.lastError)}</div>`:''}${acceptanceControls}</div><details open><summary>Acceptance / first-failure overview<span class="mdc-purpose">Cross-phase authority</span></summary><pre>${escapeHtml(acceptance.h?.diagnosticsText?.() || 'Acceptance harness not available yet')}</pre></details>${cards || '<div class="mdc-wait">Waiting for mirror diagnostic sources…</div>'}`;
    state.refreshes += 1;
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  function install(){
    if(state.installed) return api;
    state.installed=true;
    const start=()=>{render();global.setInterval?.(render,1000);};
    if(global.document?.readyState==='loading') global.document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
    return api;
  }

  const api=Object.freeze({install,open:()=>{state.open=true;render();},close:()=>{state.open=false;render();},render,diagnostics:()=>Object.freeze({...state})});
  global.PocketPTMirrorDebugCenter=api;
  install();
})(typeof window!=='undefined'?window:globalThis);
