(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMovementRecordingRoadmap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'pocketpt.motionLegoRecordings.v1';
  const ROADMAP_URL = '/motion/registry/movement-recording-roadmap.v1.json';
  const REQUIRED_VIEWS = Object.freeze(['front','side']);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  function readRecordings(storage) { try { const value=JSON.parse(storage?.getItem?.(STORAGE_KEY)||'[]'); return Array.isArray(value)?value:[]; } catch (_) { return []; } }
  function viewOf(recording) { return recording?.meta?.captureView || recording?.captureView || null; }
  function taskStatus(task, recordings) {
    const mine=(recordings||[]).filter((item)=>item?.meta?.primitiveId===task?.primaryBlockId);
    const views=new Set(mine.map(viewOf).filter(Boolean));
    const required=Array.isArray(task?.requiredViews)&&task.requiredViews.length?task.requiredViews:REQUIRED_VIEWS;
    return Object.freeze({ front:views.has('front'), side:views.has('side'), captured:required.every((v)=>views.has(v)), count:mine.length, missing:required.filter((v)=>!views.has(v)) });
  }
  function sessionProgress(tasks, recordings) { const list=Array.isArray(tasks)?tasks:[]; const captured=list.filter((task)=>taskStatus(task,recordings).captured).length; return Object.freeze({captured,total:list.length,complete:list.length>0&&captured===list.length}); }
  function installStyles(document) {
    if (document.getElementById('movementRecordingRoadmapStyles')) return;
    const style=document.createElement('style'); style.id='movementRecordingRoadmapStyles'; style.textContent=`.movement-recording-roadmap{margin-top:14px;padding:14px;border:1px solid rgba(250,204,21,.6);border-radius:14px;background:rgba(15,23,42,.8)}.movement-recording-roadmap h3{margin:0 0 4px}.mrr-muted{color:#94a3b8;font-size:.82rem}.mrr-progress{margin:8px 0;padding:8px;border-radius:9px;background:#020617;font-size:.82rem}.mrr-task-list{display:grid;gap:8px;margin-top:10px}.mrr-task{border:1px solid #334155;border-radius:11px;padding:10px;background:#111827}.mrr-task[data-captured="true"]{border-color:#22c55e}.mrr-task-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.mrr-task-title{font-weight:700}.mrr-badge{font-size:.72rem;border:1px solid #475569;border-radius:999px;padding:3px 7px;white-space:nowrap}.mrr-task[data-captured="true"] .mrr-badge{border-color:#22c55e;color:#bbf7d0}.mrr-meta,.mrr-details{font-size:.78rem;color:#cbd5e1;margin-top:5px}.mrr-details{line-height:1.45;margin-top:7px}.mrr-details strong{color:#fde68a}.mrr-views{display:flex;gap:6px;margin-top:7px}.mrr-view{font-size:.72rem;padding:3px 7px;border:1px solid #475569;border-radius:999px}.mrr-view.done{border-color:#22c55e;color:#bbf7d0}.mrr-task button{margin-top:8px;border-radius:9px}.mrr-rules{margin-top:10px;padding:9px;border-radius:9px;background:#020617;font-size:.78rem;color:#cbd5e1}.mrr-rules ul{margin:6px 0 0 18px;padding:0}`; document.head?.appendChild(style);
  }
  function loadTaskIntoRecorder(global, task) {
    const d=global.document, primitive=d.getElementById('mlrPrimitive'), label=d.getElementById('mlrLabel'), duration=d.getElementById('mlrDuration'), notes=d.getElementById('mlrNotes');
    if (!primitive||!label||!duration||!notes) return false;
    primitive.value=task.primaryBlockId||''; label.value=task.recordingLabel||task.label||''; duration.value=String(task.durationMs||5000);
    const status=taskStatus(task,readRecordings(global.localStorage)); const next=status.missing[0]||'front';
    notes.value=`${task.repetitions||''} Required views: ${(task.requiredViews||REQUIRED_VIEWS).join(' + ')}. Next: ${next}. ${next==='front'?(task.frontGuidance||''):(task.sideGuidance||'')}`.trim();
    d.getElementById('mcsView') && (d.getElementById('mcsView').value=next);
    d.getElementById('motionLegoRecorder')?.scrollIntoView?.({behavior:'smooth',block:'start'}); return true;
  }
  async function bootstrap(global) {
    const d=global.document, host=d?.querySelector?.('[data-coach-template-builder]'); if(!host||d.getElementById('movementRecordingRoadmap')) return null; installStyles(d);
    let roadmap; try{const r=await global.fetch(ROADMAP_URL,{cache:'no-store'}); if(!r.ok) throw new Error(); roadmap=await r.json();}catch(_){return null;}
    const tasks=roadmap?.foundationSession?.tasks||[], section=d.createElement('section'); section.id='movementRecordingRoadmap'; section.className='movement-recording-roadmap'; host.appendChild(section);
    function render(){ const recordings=readRecordings(global.localStorage), progress=sessionProgress(tasks,recordings); section.innerHTML=`<h3>${esc(roadmap.title||'Movement Recording Roadmap')}</h3><p class="mrr-muted">${esc(roadmap.purpose||'')}</p><div class="mrr-progress"><strong>${esc(roadmap.foundationSession?.label||'Foundation Session')}</strong> · ${progress.captured}/${progress.total} paired movements complete${progress.complete?' ✓':''}</div><div class="mrr-task-list">${tasks.map((task)=>{const s=taskStatus(task,recordings);return `<article class="mrr-task" data-task-id="${esc(task.id)}" data-captured="${s.captured}"><div class="mrr-task-head"><div><div class="mrr-task-title">${task.order}. ${esc(task.label)}</div><div class="mrr-meta">FRONT + SIDE · ${Math.round((task.durationMs||0)/1000)} sec each · primary: ${esc(task.primaryBlockId)}</div></div><span class="mrr-badge">${s.captured?'PAIRED ✓':`NEEDS ${esc(s.missing.join(' + ').toUpperCase())}`}</span></div><div class="mrr-views"><span class="mrr-view ${s.front?'done':''}">Front ${s.front?'✓':'□'}</span><span class="mrr-view ${s.side?'done':''}">Side ${s.side?'✓':'□'}</span></div><div class="mrr-details"><strong>Do:</strong> ${esc(task.repetitions)}<br><strong>Front:</strong> ${esc(task.frontGuidance||'')}<br><strong>Side:</strong> ${esc(task.sideGuidance||'')}<br><strong>2D teaches:</strong> ${esc((task.twoDTeaches||[]).join(', '))}<br><strong>Animation/FBX adds:</strong> ${esc((task.animationAdds||[]).join(', '))}<br><strong>Helps create:</strong> ${esc((task.helpsCreate||[]).join(', '))}</div><button type="button" data-load-roadmap-task="${esc(task.id)}">Load next required view</button></article>`;}).join('')}</div><div class="mrr-rules"><strong>Capture rules</strong><ul>${(roadmap.captureRules||[]).map((rule)=>`<li>${esc(rule)}</li>`).join('')}</ul></div>`;
      section.querySelectorAll('[data-load-roadmap-task]').forEach((button)=>button.addEventListener('click',()=>{const task=tasks.find((item)=>item.id===button.dataset.loadRoadmapTask); if(task) loadTaskIntoRecorder(global,task);}));
    }
    render(); d.addEventListener('click',(e)=>{if(e?.target?.id==='mlrSave') global.setTimeout?.(render,20);}); global.addEventListener?.('storage',(e)=>{if(e?.key===STORAGE_KEY) render();});
    global.__movementRecordingRoadmap={roadmap,tasks,render}; return global.__movementRecordingRoadmap;
  }
  if(typeof window!=='undefined'&&window.document){if(window.document.readyState==='loading')window.document.addEventListener('DOMContentLoaded',()=>bootstrap(window),{once:true});else bootstrap(window);}
  return Object.freeze({readRecordings,taskStatus,sessionProgress,loadTaskIntoRecorder,bootstrap,STORAGE_KEY,ROADMAP_URL,REQUIRED_VIEWS});
});
