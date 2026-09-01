(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMovementCaptureStudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RECORDINGS_KEY = 'pocketpt.motionLegoRecordings.v1';
  const CUSTOM_KEY = 'pocketpt.customMovementDefinitions.v1';
  const ROADMAP_URL = '/motion/registry/movement-recording-roadmap.v1.json';
  const REQUIRED_VIEWS = Object.freeze(['front', 'side']);

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function readJson(storage, key, fallback = []) {
    try { const value = JSON.parse(storage?.getItem?.(key) || 'null'); return value ?? fallback; } catch (_) { return fallback; }
  }
  function writeJson(storage, key, value) {
    try { storage?.setItem?.(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  function slug(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  }
  function recordingView(recording) {
    return recording?.meta?.captureView || recording?.captureView || null;
  }
  function coverage(recordings, primitiveId) {
    const views = new Set((recordings || []).filter((r) => r?.meta?.primitiveId === primitiveId).map(recordingView).filter(Boolean));
    return Object.freeze({ front: views.has('front'), side: views.has('side'), complete: REQUIRED_VIEWS.every((v) => views.has(v)) });
  }
  function nextRequiredView(recordings, primitiveId) {
    const state = coverage(recordings, primitiveId);
    return state.front ? (state.side ? null : 'side') : 'front';
  }
  function average(values) {
    const list = values.filter(Number.isFinite); return list.length ? list.reduce((a,b) => a+b, 0) / list.length : null;
  }
  function dist(a,b) { return a && b ? Math.hypot(a.x-b.x, a.y-b.y) : Infinity; }

  function selectKeyFrame(recording) {
    const frames = recording?.frames || [];
    if (!frames.length) return { index: 0, reason: 'no_frames' };
    const id = recording?.meta?.primitiveId || '';
    let bestIndex = Math.floor(frames.length / 2);
    let bestScore = null;
    frames.forEach((frame, index) => {
      let score = null;
      if (/crouch|squat/.test(id)) score = frame?.landmarks?.hipCenter?.y;
      else if (/elbow_flex|push/.test(id)) {
        const a = average([frame?.derivedAngles?.leftElbow, frame?.derivedAngles?.rightElbow]);
        score = Number.isFinite(a) ? -a : null;
      } else if (/jump/.test(id)) score = Number.isFinite(frame?.landmarks?.bodyCenter?.y) ? -frame.landmarks.bodyCenter.y : null;
      else if (/stand_to_ground/.test(id)) score = Number.isFinite(frame?.directions?.bodyAxis?.y) ? -Math.abs(frame.directions.bodyAxis.y) : null;
      else if (/knee_drive/.test(id)) {
        const joints = frame?.joints || {};
        const d = Math.min(dist(joints.left_knee, joints.left_hip), dist(joints.right_knee, joints.right_hip));
        score = Number.isFinite(d) ? -d : null;
      }
      if (Number.isFinite(score) && (bestScore == null || score > bestScore)) { bestScore = score; bestIndex = index; }
    });
    return { index: bestIndex, reason: bestScore == null ? 'midpoint' : 'movement_extreme' };
  }

  const BONES = Object.freeze([
    ['left_shoulder','right_shoulder'], ['left_shoulder','left_elbow'], ['left_elbow','left_wrist'],
    ['right_shoulder','right_elbow'], ['right_elbow','right_wrist'], ['left_shoulder','left_hip'],
    ['right_shoulder','right_hip'], ['left_hip','right_hip'], ['left_hip','left_knee'], ['left_knee','left_ankle'],
    ['right_hip','right_knee'], ['right_knee','right_ankle']
  ]);
  function skeletonSvg(frame, label = '') {
    const joints = frame?.joints || {};
    const p = (name) => joints[name] && Number.isFinite(joints[name].x) && Number.isFinite(joints[name].y)
      ? { x: 16 + joints[name].x * 168, y: 18 + joints[name].y * 208, c: joints[name].confidence || 0 }
      : null;
    const lines = BONES.map(([a,b]) => { const A=p(a),B=p(b); return A&&B ? `<line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}"/>` : ''; }).join('');
    const dots = Object.keys(joints).map((name) => { const P=p(name); return P ? `<circle cx="${P.x.toFixed(1)}" cy="${P.y.toFixed(1)}" r="3"/>` : ''; }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" role="img" aria-label="${esc(label)}"><rect width="200" height="250" rx="12" fill="#020617"/><g stroke="#facc15" stroke-width="3" stroke-linecap="round">${lines}</g><g fill="#22c55e">${dots}</g><text x="10" y="242" fill="#e5e7eb" font-size="10" font-family="system-ui">${esc(label)}</text></svg>`;
  }
  function buildMilestones(recording) {
    const frames = recording?.frames || [];
    if (!frames.length) return [];
    const key = selectKeyFrame(recording).index;
    const indexes = [...new Set([0, key, frames.length - 1])];
    const names = indexes.map((index) => index === 0 ? 'START / TOP' : index === frames.length - 1 ? 'RETURN / FINISH' : 'KEY / BOTTOM');
    return indexes.map((frameIndex, i) => ({
      id: i === 0 ? 'start' : (i === indexes.length - 1 ? 'finish' : 'key'),
      label: names[i], frameIndex, timestampMs: frames[frameIndex]?.t || 0,
      skeletonSvg: skeletonSvg(frames[frameIndex], `${recording?.meta?.label || recording?.meta?.primitiveId || 'movement'} · ${names[i]}`)
    }));
  }

  function annotateLatest(storage, { primitiveId, captureView, movementId, movementName, isCustom }) {
    const list = readJson(storage, RECORDINGS_KEY, []);
    const index = list.findIndex((item) => item?.meta?.primitiveId === primitiveId && !item?.meta?.captureView);
    const targetIndex = index >= 0 ? index : 0;
    const recording = list[targetIndex];
    if (!recording) return null;
    recording.meta = { ...(recording.meta || {}), captureView, movementId: movementId || primitiveId, movementName: movementName || recording?.meta?.label || primitiveId, isCustom: Boolean(isCustom), requiredViews: [...REQUIRED_VIEWS] };
    recording.poseCheckpoints = buildMilestones(recording);
    recording.pairedViewStatus = coverage(list.map((item, idx) => idx === targetIndex ? recording : item), primitiveId);
    list[targetIndex] = recording;
    writeJson(storage, RECORDINGS_KEY, list);
    return recording;
  }

  function installStyles(document) {
    if (document.getElementById('movementCaptureStudioStyles')) return;
    const style = document.createElement('style'); style.id = 'movementCaptureStudioStyles';
    style.textContent = `.mcs{margin-top:12px;padding:12px;border:1px solid #475569;border-radius:12px;background:#0b1220}.mcs h4{margin:0 0 6px}.mcs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mcs label{font-size:.78rem;color:#cbd5e1}.mcs input,.mcs select{width:100%;padding:8px;border-radius:8px;background:#020617;color:#fff;border:1px solid #334155}.mcs-pair{padding:9px;margin:8px 0;border-radius:9px;background:#020617}.mcs-pair strong{color:#fde68a}.mcs-checkpoints{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:8px}.mcs-checkpoint{border:1px solid #334155;border-radius:9px;padding:6px;background:#020617}.mcs-checkpoint svg{width:100%;height:auto;display:block}.mcs-custom{margin-top:10px;padding-top:10px;border-top:1px solid #334155}@media(max-width:640px){.mcs-grid{grid-template-columns:1fr}}`;
    document.head?.appendChild(style);
  }

  async function bootstrap(global) {
    const document = global.document, storage = global.localStorage;
    const recorderHost = document?.getElementById('motionLegoRecorder');
    if (!recorderHost || document.getElementById('movementCaptureStudio')) return null;
    installStyles(document);
    let roadmap = null;
    try { const r = await global.fetch(ROADMAP_URL, { cache:'no-store' }); if (r.ok) roadmap = await r.json(); } catch (_) {}
    const tasks = roadmap?.foundationSession?.tasks || [];
    const studio = document.createElement('section'); studio.id='movementCaptureStudio'; studio.className='mcs';
    studio.innerHTML = `<h4>Paired View + Pose Checkpoint Studio</h4><div id="mcsPair" class="mcs-pair">Select a roadmap movement or custom movement. Foundation captures require FRONT + SIDE.</div><div class="mcs-grid"><label>Capture view<select id="mcsView"><option value="front">Front</option><option value="side">Side</option></select></label><label>Movement identity<input id="mcsMovementName" placeholder="Loaded from roadmap or custom movement"></label></div><div class="mcs-custom"><strong>Custom movement</strong><div class="mcs-grid"><label>Name<input id="mcsCustomName" placeholder="Example: One-Arm Push-Up Left"></label><label>Base pattern<input id="mcsCustomBase" placeholder="Example: push-up variant"></label></div><button id="mcsCreateCustom" type="button" class="secondary">Create Custom Movement</button></div><div id="mcsCheckpoints" class="mcs-checkpoints"></div>`;
    recorderHost.insertBefore(studio, recorderHost.firstChild?.nextSibling || recorderHost.firstChild);
    const $ = (id) => document.getElementById(id);
    let active = { primitiveId: $('mlrPrimitive')?.value || '', movementId: '', movementName: '', isCustom:false };

    function recordings(){ return readJson(storage, RECORDINGS_KEY, []); }
    function customDefinitions(){ return readJson(storage, CUSTOM_KEY, []); }
    function chooseView(primitiveId){ return nextRequiredView(recordings(), primitiveId) || 'front'; }
    function renderPair() {
      if (!active.primitiveId) { $('mcsPair').textContent = 'Select a roadmap movement or custom movement. Foundation captures require FRONT + SIDE.'; return; }
      const c = coverage(recordings(), active.primitiveId), next = nextRequiredView(recordings(), active.primitiveId);
      $('mcsPair').innerHTML = `<strong>${esc(active.movementName || active.primitiveId)}</strong><br>Front: ${c.front ? '✓' : '□'} · Side: ${c.side ? '✓' : '□'}${c.complete ? '<br>2D paired evidence COMPLETE ✓' : `<br>Next required view: <strong>${String(next || '').toUpperCase()}</strong>`}`;
      if (next) $('mcsView').value = next;
    }
    function renderCheckpoints(recording) {
      $('mcsCheckpoints').innerHTML = (recording?.poseCheckpoints || []).map((m) => `<div class="mcs-checkpoint"><div><strong>${esc(m.label)}</strong><br><small>${m.timestampMs} ms · frame ${m.frameIndex}</small></div>${m.skeletonSvg}</div>`).join('');
    }
    function loadTask(task) {
      if (!task) return;
      active = { primitiveId: task.primaryBlockId, movementId: task.id, movementName: task.label, isCustom:false };
      $('mcsMovementName').value = task.label;
      $('mcsView').value = chooseView(task.primaryBlockId);
      renderPair();
    }
    function ensureCustomOption(def) {
      const select = $('mlrPrimitive'); if (!select) return;
      if (![...select.options].some((o) => o.value === def.primitiveId)) { const option=document.createElement('option'); option.value=def.primitiveId; option.textContent=`Custom · ${def.name}`; option.dataset.category='custom'; select.appendChild(option); }
    }
    customDefinitions().forEach(ensureCustomOption);

    document.addEventListener('click', (event) => {
      const taskButton = event.target?.closest?.('[data-load-roadmap-task]');
      if (taskButton) global.setTimeout?.(() => loadTask(tasks.find((t) => t.id === taskButton.dataset.loadRoadmapTask)), 0);
      if (event.target?.id === 'mlrSave') global.setTimeout?.(() => {
        const primitiveId = $('mlrPrimitive')?.value || active.primitiveId;
        if (!primitiveId) return;
        const view = $('mcsView')?.value || 'front';
        const card = tasks.find((t) => t.primaryBlockId === primitiveId);
        const annotated = annotateLatest(storage, { primitiveId, captureView:view, movementId:active.movementId || card?.id || primitiveId, movementName:active.movementName || card?.label || $('mlrLabel')?.value || primitiveId, isCustom:active.isCustom });
        renderCheckpoints(annotated);
        const next = nextRequiredView(recordings(), primitiveId);
        if (next) {
          $('mcsView').value = next;
          const status = $('mlrStatus'); if (status) status.textContent += `\n${view.toUpperCase()} saved. Now rotate and record the ${next.toUpperCase()} view.`;
        } else {
          const status = $('mlrStatus'); if (status) status.textContent += '\nFront + Side paired evidence complete ✓';
        }
        renderPair();
        global.__movementRecordingRoadmap?.render?.();
      }, 0);
    }, true);

    $('mcsCreateCustom')?.addEventListener('click', () => {
      const name = $('mcsCustomName').value.trim(); if (!name) return;
      const primitiveId = `custom_${slug(name) || Date.now().toString(36)}`;
      const def = { id: primitiveId, primitiveId, name, basePattern:$('mcsCustomBase').value.trim() || 'custom', requiredViews:[...REQUIRED_VIEWS], createdAt:new Date().toISOString(), status:'NEEDS_CAPTURE' };
      const defs = customDefinitions(); defs.unshift(def); writeJson(storage, CUSTOM_KEY, defs.slice(0, 30)); ensureCustomOption(def);
      $('mlrPrimitive').value = primitiveId; $('mlrLabel').value = name; $('mlrNotes').value = `Custom movement: ${name}. Base pattern: ${def.basePattern}. Capture FRONT then SIDE.`;
      active = { primitiveId, movementId:primitiveId, movementName:name, isCustom:true }; $('mcsMovementName').value=name; $('mcsView').value='front'; renderPair();
    });
    $('mlrPrimitive')?.addEventListener('change', () => {
      const primitiveId = $('mlrPrimitive').value; if (!primitiveId) return;
      const task = tasks.find((t) => t.primaryBlockId === primitiveId); const custom = customDefinitions().find((d) => d.primitiveId === primitiveId);
      active = { primitiveId, movementId:task?.id || custom?.id || primitiveId, movementName:task?.label || custom?.name || $('mlrLabel')?.value || primitiveId, isCustom:Boolean(custom) };
      $('mcsMovementName').value=active.movementName; $('mcsView').value=chooseView(primitiveId); renderPair();
    });
    renderPair();
    global.__movementCaptureStudio = { coverage:(id)=>coverage(recordings(),id), nextRequiredView:(id)=>nextRequiredView(recordings(),id), buildMilestones, skeletonSvg, customDefinitions };
    return global.__movementCaptureStudio;
  }

  if (typeof window !== 'undefined' && window.document) {
    if (window.document.readyState === 'loading') window.document.addEventListener('DOMContentLoaded', () => bootstrap(window), { once:true }); else bootstrap(window);
  }
  return Object.freeze({ REQUIRED_VIEWS, coverage, nextRequiredView, selectKeyFrame, skeletonSvg, buildMilestones, annotateLatest, bootstrap, RECORDINGS_KEY, CUSTOM_KEY });
});
