(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMovementRecordingRoadmap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'pocketpt.motionLegoRecordings.v1';
  const ROADMAP_URL = '/motion/registry/movement-recording-roadmap.v1.json';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function readRecordings(storage) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function taskStatus(task, recordings) {
    const count = recordings.filter((item) => item?.meta?.primitiveId === task?.primaryBlockId).length;
    return Object.freeze({ captured: count > 0, count });
  }

  function sessionProgress(tasks, recordings) {
    const list = Array.isArray(tasks) ? tasks : [];
    const captured = list.filter((task) => taskStatus(task, recordings).captured).length;
    return Object.freeze({ captured, total: list.length, complete: list.length > 0 && captured === list.length });
  }

  function installStyles(document) {
    if (document.getElementById('movementRecordingRoadmapStyles')) return;
    const style = document.createElement('style');
    style.id = 'movementRecordingRoadmapStyles';
    style.textContent = `
      .movement-recording-roadmap{margin-top:14px;padding:14px;border:1px solid rgba(250,204,21,.6);border-radius:14px;background:rgba(15,23,42,.8)}
      .movement-recording-roadmap h3{margin:0 0 4px}.mrr-muted{color:#94a3b8;font-size:.82rem}.mrr-progress{margin:8px 0;padding:8px;border-radius:9px;background:#020617;font-size:.82rem}
      .mrr-task-list{display:grid;gap:8px;margin-top:10px}.mrr-task{border:1px solid #334155;border-radius:11px;padding:10px;background:#111827}.mrr-task[data-captured="true"]{border-color:#22c55e}
      .mrr-task-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.mrr-task-title{font-weight:700}.mrr-badge{font-size:.72rem;border:1px solid #475569;border-radius:999px;padding:3px 7px;white-space:nowrap}.mrr-task[data-captured="true"] .mrr-badge{border-color:#22c55e;color:#bbf7d0}
      .mrr-meta{font-size:.78rem;color:#cbd5e1;margin-top:5px}.mrr-details{font-size:.78rem;color:#cbd5e1;margin-top:7px;line-height:1.45}.mrr-details strong{color:#fde68a}.mrr-task button{margin-top:8px;border-radius:9px}
      .mrr-rules{margin-top:10px;padding:9px;border-radius:9px;background:#020617;font-size:.78rem;color:#cbd5e1}.mrr-rules ul{margin:6px 0 0 18px;padding:0}
    `;
    document.head?.appendChild(style);
  }

  function loadTaskIntoRecorder(global, task) {
    const document = global.document;
    const primitive = document.getElementById('mlrPrimitive');
    const label = document.getElementById('mlrLabel');
    const duration = document.getElementById('mlrDuration');
    const notes = document.getElementById('mlrNotes');
    if (!primitive || !label || !duration || !notes) return false;
    primitive.value = task.primaryBlockId || '';
    label.value = task.recordingLabel || task.label || '';
    duration.value = String(task.durationMs || 5000);
    notes.value = `${task.repetitions || ''} View: ${task.view || 'unspecified'}. Also useful for: ${(task.alsoSupports || []).join(', ') || 'none'}`.trim();
    document.getElementById('motionLegoRecorder')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    return true;
  }

  async function bootstrap(global) {
    const document = global.document;
    const host = document?.querySelector?.('[data-coach-template-builder]');
    if (!host || document.getElementById('movementRecordingRoadmap')) return null;
    installStyles(document);

    let roadmap;
    try {
      const response = await global.fetch(ROADMAP_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`roadmap_http_${response.status}`);
      roadmap = await response.json();
    } catch (_) { return null; }

    const tasks = roadmap?.foundationSession?.tasks || [];
    const section = document.createElement('section');
    section.id = 'movementRecordingRoadmap';
    section.className = 'movement-recording-roadmap';
    host.appendChild(section);

    function render() {
      const recordings = readRecordings(global.localStorage);
      const progress = sessionProgress(tasks, recordings);
      section.innerHTML = `
        <h3>${escapeHtml(roadmap.title || 'Movement Recording Roadmap')}</h3>
        <p class="mrr-muted">${escapeHtml(roadmap.purpose || '')}</p>
        <div class="mrr-progress"><strong>${escapeHtml(roadmap.foundationSession?.label || 'Foundation Session')}</strong> · ${progress.captured}/${progress.total} primary captures complete${progress.complete ? ' ✓' : ''}</div>
        <div class="mrr-task-list">
          ${tasks.map((task) => {
            const status = taskStatus(task, recordings);
            return `<article class="mrr-task" data-task-id="${escapeHtml(task.id)}" data-captured="${status.captured}">
              <div class="mrr-task-head"><div><div class="mrr-task-title">${task.order}. ${escapeHtml(task.label)}</div><div class="mrr-meta">${escapeHtml(task.view)} view · ${Math.round((task.durationMs || 0) / 1000)} sec · primary block: ${escapeHtml(task.primaryBlockId)}</div></div><span class="mrr-badge">${status.captured ? `CAPTURED ✓ (${status.count})` : 'NEEDS CAPTURE'}</span></div>
              <div class="mrr-details"><strong>Do:</strong> ${escapeHtml(task.repetitions)}<br><strong>Your 2D capture teaches:</strong> ${escapeHtml((task.twoDTeaches || []).join(', '))}<br><strong>Animation/FBX adds:</strong> ${escapeHtml((task.animationAdds || []).join(', '))}<br><strong>Search animation for:</strong> ${escapeHtml((task.animationSearch || []).join(', '))}<br><strong>Helps us create:</strong> ${escapeHtml((task.helpsCreate || []).join(', '))}${(task.alsoSupports || []).length ? `<br><strong>Secondary Lego blocks:</strong> ${escapeHtml(task.alsoSupports.join(', '))}` : ''}</div>
              <button type="button" data-load-roadmap-task="${escapeHtml(task.id)}">Load this capture into recorder</button>
            </article>`;
          }).join('')}
        </div>
        <div class="mrr-rules"><strong>Capture rules</strong><ul>${(roadmap.captureRules || []).map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul></div>
      `;
      section.querySelectorAll('[data-load-roadmap-task]').forEach((button) => button.addEventListener('click', () => {
        const task = tasks.find((item) => item.id === button.dataset.loadRoadmapTask);
        if (task) loadTaskIntoRecorder(global, task);
      }));
    }

    render();
    document.addEventListener('click', (event) => {
      if (event?.target?.id === 'mlrSave') global.setTimeout?.(render, 0);
    });
    global.addEventListener?.('storage', (event) => { if (event?.key === STORAGE_KEY) render(); });
    global.__movementRecordingRoadmap = { roadmap, render };
    return global.__movementRecordingRoadmap;
  }

  if (typeof window !== 'undefined' && window.document) {
    if (window.document.readyState === 'loading') window.document.addEventListener('DOMContentLoaded', () => bootstrap(window), { once: true });
    else bootstrap(window);
  }

  return Object.freeze({ readRecordings, taskStatus, sessionProgress, loadTaskIntoRecorder, bootstrap, STORAGE_KEY, ROADMAP_URL });
});
