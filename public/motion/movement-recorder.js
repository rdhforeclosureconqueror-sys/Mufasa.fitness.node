(function (root, factory) {
  const normalized = typeof module === 'object' && module.exports
    ? require('./normalized-pose')
    : root.PocketPTNormalizedPose;
  const api = factory(normalized);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTMovementRecorder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (normalized) {
  'use strict';

  const STORAGE_KEY = 'pocketpt.motionLegoRecordings.v1';
  const MAX_LOCAL_RECORDINGS = 8;
  const MAX_DURATION_MS = 15000;
  const MIN_FRAME_INTERVAL_MS = 60;
  const MIN_CONFIDENCE = 0.35;
  const RECORDED_JOINTS = Object.freeze([
    'nose',
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ]);

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function point(joint) {
    if (!joint) return null;
    return Object.freeze({
      x: number(joint.x),
      y: number(joint.y),
      confidence: number(joint.confidence)
    });
  }

  function angle(a, b, c) {
    if (!a || !b || !c) return null;
    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;
    const denom = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
    if (!denom) return null;
    const cosine = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / denom));
    return Math.round((Math.acos(cosine) * 180 / Math.PI) * 10) / 10;
  }

  function compactDirection(direction) {
    if (!direction) return null;
    return { x: number(direction.x), y: number(direction.y), z: number(direction.z) };
  }

  function compactLandmark(landmark) {
    if (landmark == null) return null;
    if (typeof landmark === 'number') return number(landmark);
    if (Number.isFinite(Number(landmark.x)) && Number.isFinite(Number(landmark.y))) return point(landmark);
    return null;
  }

  function compactFrame(frame, relativeMs) {
    const joints = {};
    for (const name of RECORDED_JOINTS) joints[name] = point(frame?.joints?.[name]);
    const visibleJointCount = Object.values(joints).filter((joint) => joint && joint.confidence >= MIN_CONFIDENCE).length;
    const bodyHeight = number(frame?.landmarks?.bodyHeightNormalized);
    const overallConfidence = number(frame?.confidence?.overall, frame?.confidence?.bodyDetected ? 1 : 0);
    const bodyDetected = Boolean(frame?.confidence?.bodyDetected);
    return Object.freeze({
      t: Math.max(0, Math.round(number(relativeMs))),
      sourceTimestamp: number(frame?.timestamp),
      quality: Object.freeze({
        bodyDetected,
        overallConfidence,
        visibleJointCount,
        usable: bodyDetected && overallConfidence >= MIN_CONFIDENCE && bodyHeight >= 0.1
      }),
      joints: Object.freeze(joints),
      landmarks: Object.freeze({
        shoulderCenter: compactLandmark(frame?.landmarks?.shoulderCenter),
        hipCenter: compactLandmark(frame?.landmarks?.hipCenter),
        ankleCenter: compactLandmark(frame?.landmarks?.ankleCenter),
        bodyCenter: compactLandmark(frame?.landmarks?.bodyCenter),
        bodyHeightNormalized: bodyHeight
      }),
      directions: Object.freeze({
        shoulderLine: compactDirection(frame?.directions?.shoulderLine || frame?.landmarks?.shoulderLine),
        hipLine: compactDirection(frame?.directions?.hipLine || frame?.landmarks?.hipLine),
        torsoAxis: compactDirection(frame?.directions?.torsoAxis || frame?.landmarks?.torsoAxis),
        bodyAxis: compactDirection(frame?.directions?.bodyAxis || frame?.landmarks?.bodyAxis)
      }),
      derivedAngles: Object.freeze({
        leftElbow: angle(joints.left_shoulder, joints.left_elbow, joints.left_wrist),
        rightElbow: angle(joints.right_shoulder, joints.right_elbow, joints.right_wrist),
        leftKnee: angle(joints.left_hip, joints.left_knee, joints.left_ankle),
        rightKnee: angle(joints.right_hip, joints.right_knee, joints.right_ankle)
      })
    });
  }

  function normalizePacket(posePacket, cameraState = {}) {
    if (!posePacket || typeof normalized?.fromMoveNetPosePacket !== 'function') return null;
    return normalized.fromMoveNetPosePacket(posePacket, {
      cameraFacing: cameraState.facingMode || 'user',
      previewMirrored: cameraState.isMirrored !== false
    });
  }

  function summarize(frames) {
    const list = Array.isArray(frames) ? frames : [];
    const usable = list.filter((frame) => frame?.quality?.usable);
    const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return Object.freeze({
      frameCount: list.length,
      usableFrameCount: usable.length,
      usableRatio: list.length ? usable.length / list.length : 0,
      averageConfidence: average(list.map((frame) => number(frame?.quality?.overallConfidence))),
      averageVisibleJoints: average(list.map((frame) => number(frame?.quality?.visibleJointCount))),
      durationMs: list.length > 1 ? list[list.length - 1].t - list[0].t : 0
    });
  }

  class MovementRecorder {
    constructor({ eventTarget, now = () => Date.now(), cameraState = () => ({}) } = {}) {
      this.eventTarget = eventTarget || (typeof globalThis !== 'undefined' ? globalThis : null);
      this.now = now;
      this.cameraState = cameraState;
      this.state = 'IDLE';
      this.frames = [];
      this.startedAt = null;
      this.lastAcceptedAt = null;
      this.lastPoseAt = null;
      this.timer = null;
      this.meta = null;
      this.latest = null;
      this.listeners = new Set();
      this.onPoseFrame = (event) => this.handlePoseFrame(event);
      this.eventTarget?.addEventListener?.('pose-runtime:frame', this.onPoseFrame);
    }

    subscribe(listener) {
      if (typeof listener === 'function') this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    notify() {
      const snapshot = this.getState();
      this.listeners.forEach((listener) => { try { listener(snapshot); } catch (_) {} });
    }

    getState() {
      return Object.freeze({
        state: this.state,
        frameCount: this.frames.length,
        startedAt: this.startedAt,
        lastPoseAt: this.lastPoseAt,
        meta: this.meta ? { ...this.meta } : null,
        latest: this.latest
      });
    }

    start({ label, primitiveId, category, durationMs = 5000, notes = '' } = {}) {
      if (this.state === 'RECORDING') throw new Error('movement_recording_already_active');
      const cleanLabel = String(label || '').trim();
      const cleanPrimitive = String(primitiveId || '').trim();
      if (!cleanLabel && !cleanPrimitive) throw new Error('movement_label_or_primitive_required');
      const duration = Math.max(1000, Math.min(MAX_DURATION_MS, number(durationMs, 5000)));
      this.frames = [];
      this.startedAt = this.now();
      this.lastAcceptedAt = null;
      this.meta = Object.freeze({
        label: cleanLabel || cleanPrimitive,
        primitiveId: cleanPrimitive || null,
        category: String(category || '').trim() || null,
        notes: String(notes || '').trim(),
        requestedDurationMs: duration,
        source: 'movenet_pose_runtime',
        schemaVersion: 1
      });
      this.state = 'RECORDING';
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.stop('duration_complete'), duration);
      this.notify();
      return this.getState();
    }

    handlePoseFrame(event) {
      const at = this.now();
      this.lastPoseAt = at;
      if (this.state !== 'RECORDING') return false;
      if (this.lastAcceptedAt != null && at - this.lastAcceptedAt < MIN_FRAME_INTERVAL_MS) return false;
      const frame = normalizePacket(event?.detail?.posePacket, this.cameraState() || {});
      if (!frame) return false;
      this.frames.push(compactFrame(frame, at - this.startedAt));
      this.lastAcceptedAt = at;
      this.notify();
      return true;
    }

    stop(reason = 'manual') {
      if (this.state !== 'RECORDING') return this.latest;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      const endedAt = this.now();
      const frames = this.frames.slice();
      const recording = Object.freeze({
        schemaVersion: 1,
        recordingId: `mvr-${endedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        source: 'PocketPT MoveNet / pose-runtime:frame',
        rawVideoStored: false,
        threeDimensionalBoneRotations: false,
        handDetail: 'wrist-only; no finger skeleton',
        startedAt: new Date(this.startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        stopReason: reason,
        meta: this.meta,
        summary: summarize(frames),
        frames
      });
      this.latest = recording;
      this.state = 'RECORDED';
      this.notify();
      return recording;
    }

    reset() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.frames = [];
      this.startedAt = null;
      this.lastAcceptedAt = null;
      this.meta = null;
      this.latest = null;
      this.state = 'IDLE';
      this.notify();
    }

    dispose() {
      if (this.timer) clearTimeout(this.timer);
      this.eventTarget?.removeEventListener?.('pose-runtime:frame', this.onPoseFrame);
      this.listeners.clear();
      this.state = 'DISPOSED';
    }
  }

  function readLocalRecordings(storage) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveLocalRecording(recording, storage) {
    if (!recording) return [];
    const list = readLocalRecordings(storage);
    list.unshift(recording);
    const bounded = list.slice(0, MAX_LOCAL_RECORDINGS);
    try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(bounded)); } catch (_) {}
    return bounded;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function installStyles(document) {
    if (document.getElementById('motionLegoRecorderStyles')) return;
    const style = document.createElement('style');
    style.id = 'motionLegoRecorderStyles';
    style.textContent = `
      .motion-lego-recorder{margin-top:14px;padding:14px;border:1px solid rgba(34,197,94,.55);border-radius:14px;background:rgba(2,6,23,.72)}
      .motion-lego-recorder h3{margin:0 0 6px}.motion-lego-recorder .mlr-muted{color:#94a3b8;font-size:.82rem}
      .mlr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.mlr-grid label{display:flex;flex-direction:column;gap:4px;font-size:.78rem;color:#cbd5e1}
      .mlr-grid input,.mlr-grid select,.mlr-grid textarea{width:100%;padding:8px;border-radius:9px;border:1px solid #334155;background:#020617;color:#f8fafc}.mlr-grid textarea{min-height:64px;resize:vertical}
      .mlr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.mlr-actions button{border-radius:10px}
      .mlr-status{margin-top:10px;padding:9px;border-radius:9px;background:#0f172a;font-size:.8rem;white-space:pre-wrap}
      .mlr-board{margin-top:14px}.mlr-section{margin-top:10px}.mlr-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;margin-top:6px}
      button.mlr-card{display:block;text-align:left;border-radius:11px;padding:9px;background:#111827;color:#f8fafc;border:1px solid #334155}.mlr-card strong{display:block;font-size:.8rem}.mlr-card small{display:block;color:#94a3b8;margin-top:3px}.mlr-card[data-status="CANDIDATE"]{border-color:#eab308}.mlr-card[data-status="STUDIED"],.mlr-card[data-status="VALIDATED"],.mlr-card[data-status="READY"]{border-color:#22c55e}
      .mlr-detail{margin-top:8px;padding:10px;border:1px solid #334155;border-radius:10px;font-size:.8rem;background:#020617}
      @media(max-width:640px){.mlr-grid{grid-template-columns:1fr}.mlr-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head?.appendChild(style);
  }

  function downloadJson(global, recording) {
    if (!recording || !global.Blob || !global.URL?.createObjectURL) return false;
    const blob = new global.Blob([JSON.stringify(recording, null, 2)], { type: 'application/json' });
    const url = global.URL.createObjectURL(blob);
    const anchor = global.document.createElement('a');
    anchor.href = url;
    anchor.download = `${recording.meta?.primitiveId || recording.meta?.label || 'movement'}-${recording.recordingId}.json`.replace(/[^a-z0-9._-]+/gi, '-');
    anchor.click();
    global.setTimeout?.(() => global.URL.revokeObjectURL(url), 0);
    return true;
  }

  async function bootstrapTrainerUI(global) {
    const document = global.document;
    const host = document?.querySelector?.('[data-coach-template-builder]');
    if (!host || document.getElementById('motionLegoRecorder')) return null;
    installStyles(document);

    let registry = { sections: [] };
    try {
      const response = await global.fetch('/motion/registry/movement-lego-scavenger.v1.json', { cache: 'no-store' });
      if (response.ok) registry = await response.json();
    } catch (_) {}

    const allCards = (registry.sections || []).flatMap((section) => (section.cards || []).map((card) => ({ ...card, sectionId: section.id, sectionLabel: section.label })));
    const wrapper = document.createElement('section');
    wrapper.id = 'motionLegoRecorder';
    wrapper.className = 'motion-lego-recorder';
    wrapper.innerHTML = `
      <h3>Movement Lego Recorder</h3>
      <p class="mlr-muted">Record your MoveNet skeleton as reusable movement evidence. No raw video is stored. Wrist movement is recorded; finger and true 3D bone rotation are not.</p>
      <div class="mlr-grid">
        <label>Target Lego block<select id="mlrPrimitive"><option value="">Choose a block…</option>${allCards.map((card) => `<option value="${escapeHtml(card.id)}" data-category="${escapeHtml(card.sectionId)}">${escapeHtml(card.sectionLabel)} · ${escapeHtml(card.label)}</option>`).join('')}</select></label>
        <label>Recording label<input id="mlrLabel" placeholder="Example: my neutral stand-to-ground"></label>
        <label>Duration<select id="mlrDuration"><option value="5000">5 seconds</option><option value="10000">10 seconds</option><option value="15000">15 seconds</option></select></label>
        <label>Notes<textarea id="mlrNotes" placeholder="What are you demonstrating?"></textarea></label>
      </div>
      <div class="mlr-actions">
        <button id="mlrStart" type="button">● Record Movement</button>
        <button id="mlrStop" type="button" class="secondary" disabled>Stop</button>
        <button id="mlrSave" type="button" class="secondary" disabled>Save Local Evidence</button>
        <button id="mlrExport" type="button" class="secondary" disabled>Export JSON</button>
      </div>
      <div id="mlrStatus" class="mlr-status">IDLE · Connect Camera and wait for MoveNet before recording.</div>
      <div class="mlr-board"><strong>Motion Lego Hunt</strong><span id="mlrProgress" class="mlr-muted"></span><div id="mlrSections"></div><div id="mlrDetail" class="mlr-detail" hidden></div></div>
    `;
    host.appendChild(wrapper);

    const recorder = new MovementRecorder({ eventTarget: global });
    const $ = (id) => document.getElementById(id);
    const status = $('mlrStatus');
    const startBtn = $('mlrStart');
    const stopBtn = $('mlrStop');
    const saveBtn = $('mlrSave');
    const exportBtn = $('mlrExport');
    const localRecordings = () => readLocalRecordings(global.localStorage);

    function evidenceCount(primitiveId) {
      return localRecordings().filter((item) => item?.meta?.primitiveId === primitiveId).length;
    }

    function renderBoard() {
      const sections = $('mlrSections');
      const recordings = localRecordings();
      const found = new Set(recordings.map((item) => item?.meta?.primitiveId).filter(Boolean));
      const repoFound = new Set(allCards.filter((card) => card.status !== 'EMPTY').map((card) => card.id));
      const covered = new Set([...found, ...repoFound]);
      $('mlrProgress').textContent = ` · ${covered.size}/${allCards.length} blocks have evidence`;
      sections.innerHTML = (registry.sections || []).map((section) => `
        <div class="mlr-section"><small>${escapeHtml(section.label)}</small><div class="mlr-card-grid">
          ${(section.cards || []).map((card) => {
            const local = evidenceCount(card.id);
            const displayStatus = local ? `LOCAL ${local} · ${card.status}` : card.status;
            return `<button class="mlr-card" type="button" data-lego-id="${escapeHtml(card.id)}" data-status="${escapeHtml(card.status)}"><strong>${escapeHtml(card.label)}</strong><small>${escapeHtml(displayStatus)}</small></button>`;
          }).join('')}
        </div></div>`).join('');
      sections.querySelectorAll('[data-lego-id]').forEach((button) => button.addEventListener('click', () => {
        const card = allCards.find((item) => item.id === button.dataset.legoId);
        if (!card) return;
        $('mlrPrimitive').value = card.id;
        const detail = $('mlrDetail');
        detail.hidden = false;
        detail.innerHTML = `<strong>${escapeHtml(card.label)}</strong><br>Status: ${escapeHtml(card.status)} · Local recordings: ${evidenceCount(card.id)}<br>Useful for: ${escapeHtml((card.usefulFor || []).join(', '))}<br>Search: ${escapeHtml((card.searchHints || []).join(', '))}`;
      }));
    }

    recorder.subscribe((snapshot) => {
      const recording = snapshot.latest;
      startBtn.disabled = snapshot.state === 'RECORDING';
      stopBtn.disabled = snapshot.state !== 'RECORDING';
      saveBtn.disabled = !recording;
      exportBtn.disabled = !recording;
      if (snapshot.state === 'RECORDING') {
        status.textContent = `RECORDING · ${snapshot.frameCount} normalized frames captured. Keep the full movement visible.`;
      } else if (recording) {
        const s = recording.summary;
        status.textContent = `RECORDED · ${s.frameCount} frames · ${Math.round(s.usableRatio * 100)}% usable · avg confidence ${s.averageConfidence.toFixed(2)} · ${Math.round(s.durationMs)} ms.`;
      }
    });

    startBtn.addEventListener('click', () => {
      try {
        if (!global.__lastPoseFrame) throw new Error('MoveNet has not produced a pose frame yet. Connect Camera and wait for tracking.');
        const select = $('mlrPrimitive');
        const selected = select.options[select.selectedIndex];
        recorder.start({
          primitiveId: select.value,
          category: selected?.dataset?.category || null,
          label: $('mlrLabel').value,
          notes: $('mlrNotes').value,
          durationMs: Number($('mlrDuration').value)
        });
      } catch (error) { status.textContent = `Recorder blocked: ${error.message || error}`; }
    });
    stopBtn.addEventListener('click', () => recorder.stop('manual'));
    saveBtn.addEventListener('click', () => {
      if (!recorder.latest) return;
      saveLocalRecording(recorder.latest, global.localStorage);
      status.textContent = `${status.textContent}\nSaved as local movement evidence. Repository status is unchanged until reviewed.`;
      renderBoard();
    });
    exportBtn.addEventListener('click', () => downloadJson(global, recorder.latest));

    renderBoard();
    global.__movementLegoRecorder = recorder;
    return recorder;
  }

  if (typeof window !== 'undefined' && window.document) {
    if (window.document.readyState === 'loading') window.document.addEventListener('DOMContentLoaded', () => bootstrapTrainerUI(window), { once: true });
    else bootstrapTrainerUI(window);
  }

  return Object.freeze({
    MovementRecorder,
    compactFrame,
    normalizePacket,
    summarize,
    readLocalRecordings,
    saveLocalRecording,
    bootstrapTrainerUI,
    STORAGE_KEY,
    MAX_LOCAL_RECORDINGS,
    MAX_DURATION_MS,
    MIN_FRAME_INTERVAL_MS,
    RECORDED_JOINTS
  });
});
