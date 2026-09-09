(function initMotionLabLocalPlaybackControls(root, document) {
  'use strict';

  const VERSION = '1.0.1-local-viewer-single-playback-authority';
  const STEP_SECONDS = 0.10;
  let installed = false;
  let raf = null;
  let lastAdjustedSignature = null;

  function el(id) { return document.getElementById(id); }
  function activeSession() { return root.PocketPTMotionLabPoseEditor?.getActiveSession?.() || null; }
  function pendingEdits() {
    const payload = root.PocketPTMotionLabPoseEditor?.exportAdjustment?.();
    return Array.isArray(payload?.edits) ? payload.edits : [];
  }
  function adjustedSignature() { return JSON.stringify(pendingEdits()); }
  function isAdjustedPreview(session) { return String(session?.sessionClip?.name || '').includes('[POSE EDIT PREVIEW]'); }
  function duration(session) {
    const clipDuration = Number(session?.sessionClip?.duration);
    const specDuration = Number(session?.motionSpec?.durationSeconds);
    return Number.isFinite(clipDuration) && clipDuration > 0 ? clipDuration : Number.isFinite(specDuration) && specDuration > 0 ? specDuration : 0;
  }
  function currentTime(session) {
    const value = Number(session?.action?.time || 0);
    return Number.isFinite(value) ? value : 0;
  }
  function formatTime(value) {
    const safe = Math.max(0, Number(value) || 0);
    return `${safe.toFixed(2)}s`;
  }

  function injectStyle() {
    if (el('motionLabLocalPlaybackStyle')) return;
    const style = document.createElement('style');
    style.id = 'motionLabLocalPlaybackStyle';
    style.textContent = `
      #motionLabLocalPlaybackControls{display:grid;gap:8px;padding:10px;background:#0c1c17;border-top:1px solid #f2d46b}
      #motionLabLocalPlaybackControls .local-playback-buttons{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
      #motionLabLocalPlaybackControls button{min-height:42px;padding:8px 11px}
      #motionLabLocalPlaybackControls .local-playback-timeline{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}
      #motionLabLocalPlaybackControls input[type="range"]{width:100%;min-width:0;accent-color:#43c98d}
      #motionLabLocalPlaybackControls .local-playback-time{font-variant-numeric:tabular-nums;color:#fff7d1;font-size:.82rem;white-space:nowrap}
      #motionLabLocalPlaybackControls .local-playback-state{color:#a8c9ba;font-size:.78rem}
      @media(max-width:760px){
        #motionLabLocalPlaybackControls{position:sticky;bottom:0;z-index:22;padding:8px}
        #motionLabLocalPlaybackControls .local-playback-buttons{display:grid;grid-template-columns:repeat(3,1fr)}
        #motionLabLocalPlaybackControls button{padding:7px 6px;min-width:0;font-size:.82rem}
      }
    `;
    document.head.appendChild(style);
  }

  function button(id, label, title) {
    const node = document.createElement('button');
    node.id = id;
    node.type = 'button';
    node.textContent = label;
    node.title = title || label;
    node.disabled = true;
    return node;
  }

  function build() {
    const host = el('poseEditorLiveViewer');
    if (!host) return null;
    const existing = el('motionLabLocalPlaybackControls');
    if (existing) return existing;
    injectStyle();

    const bar = document.createElement('div');
    bar.id = 'motionLabLocalPlaybackControls';
    bar.setAttribute('aria-label', 'Local avatar playback controls');

    const buttons = document.createElement('div');
    buttons.className = 'local-playback-buttons';
    buttons.append(
      button('localPlaybackBack', '◀ 0.10s', 'Step backward 0.10 seconds and pause'),
      button('localPlaybackPlay', '▶ Play', 'Play or resume the current avatar motion'),
      button('localPlaybackPause', '⏸ Pause', 'Pause the current avatar motion'),
      button('localPlaybackStop', '■ Stop', 'Stop and return to the beginning'),
      button('localPlaybackRestart', '↺ Restart', 'Restart the current avatar motion from the beginning'),
      button('localPlaybackForward', '0.10s ▶', 'Step forward 0.10 seconds and pause')
    );

    const timeline = document.createElement('div');
    timeline.className = 'local-playback-timeline';
    const current = document.createElement('span');
    current.id = 'localPlaybackCurrentTime';
    current.className = 'local-playback-time';
    current.textContent = '0.00s';
    const scrubber = document.createElement('input');
    scrubber.id = 'localPlaybackScrubber';
    scrubber.type = 'range';
    scrubber.min = '0';
    scrubber.max = '0';
    scrubber.step = '0.01';
    scrubber.value = '0';
    scrubber.disabled = true;
    scrubber.setAttribute('aria-label', 'Avatar motion timeline');
    const total = document.createElement('span');
    total.id = 'localPlaybackDuration';
    total.className = 'local-playback-time';
    total.textContent = '0.00s';
    timeline.append(current, scrubber, total);

    const state = document.createElement('div');
    state.id = 'localPlaybackState';
    state.className = 'local-playback-state';
    state.textContent = 'Load a motion to enable local playback.';

    bar.append(buttons, timeline, state);
    host.appendChild(bar);
    return bar;
  }

  function seek(seconds) {
    const session = activeSession();
    if (!session?.action || !session?.mixer) return { status: 'failed', code: 'animation_required' };
    const max = duration(session);
    const time = Math.max(0, Math.min(max || Infinity, Number(seconds) || 0));
    session.action.enabled = true;
    session.action.play?.();
    session.action.paused = true;
    session.mixer.setTime?.(time);
    session.avatar?.updateMatrixWorld?.(true);
    refresh();
    return { status: 'paused', time };
  }

  function play() {
    const session = activeSession();
    if (!session?.action) return { status: 'failed', code: 'animation_required' };
    if (pendingEdits().length) {
      const signature = adjustedSignature();
      if (isAdjustedPreview(session) && signature === lastAdjustedSignature) {
        return session.play?.() || { status: 'failed', code: 'playback_unavailable' };
      }
      const out = root.PocketPTMotionLabPoseEditor?.playAdjustedPreview?.() || { status: 'failed', code: 'adjusted_preview_unavailable' };
      if (out?.status === 'ready') lastAdjustedSignature = signature;
      return out;
    }
    lastAdjustedSignature = null;
    return session.play?.() || { status: 'failed', code: 'playback_unavailable' };
  }

  function pause() {
    const session = activeSession();
    return session?.pause?.() || { status: 'failed', code: 'animation_required' };
  }

  function stop() {
    const session = activeSession();
    const out = session?.stop?.() || { status: 'failed', code: 'animation_required' };
    refresh();
    return out;
  }

  function restart() {
    const session = activeSession();
    if (!session?.action) return { status: 'failed', code: 'animation_required' };
    if (pendingEdits().length) {
      const signature = adjustedSignature();
      const out = root.PocketPTMotionLabPoseEditor?.playAdjustedPreview?.() || { status: 'failed', code: 'adjusted_preview_unavailable' };
      if (out?.status === 'ready') lastAdjustedSignature = signature;
      return out;
    }
    lastAdjustedSignature = null;
    return session.restart?.() || { status: 'failed', code: 'restart_unavailable' };
  }

  function step(delta) {
    const session = activeSession();
    if (!session?.action) return { status: 'failed', code: 'animation_required' };
    return seek(currentTime(session) + Number(delta || 0));
  }

  function refresh() {
    const bar = build();
    if (!bar) return;
    const session = activeSession();
    const ready = Boolean(session?.action);
    const max = duration(session);
    const now = Math.max(0, Math.min(max || Infinity, currentTime(session)));
    const playback = session?.playbackDiagnostics?.() || {};

    ['localPlaybackBack','localPlaybackPlay','localPlaybackPause','localPlaybackStop','localPlaybackRestart','localPlaybackForward'].forEach(id => {
      const node = el(id); if (node) node.disabled = !ready;
    });
    const scrubber = el('localPlaybackScrubber');
    if (scrubber) {
      scrubber.disabled = !ready || max <= 0;
      scrubber.max = String(max || 0);
      if (!scrubber.matches?.(':active')) scrubber.value = String(now);
    }
    if (el('localPlaybackCurrentTime')) el('localPlaybackCurrentTime').textContent = formatTime(now);
    if (el('localPlaybackDuration')) el('localPlaybackDuration').textContent = formatTime(max);
    if (el('localPlaybackState')) {
      const edited = pendingEdits().length;
      el('localPlaybackState').textContent = ready
        ? `${String(playback.state || 'ready').toUpperCase()}${edited ? ` • ${edited} pending edit(s): Play uses adjusted preview` : ' • canonical/current preview'}`
        : 'Load a motion to enable local playback.';
    }
  }

  function wire() {
    build();
    if (el('motionLabLocalPlaybackControls')?.dataset.wired === '1') return true;
    const bar = el('motionLabLocalPlaybackControls');
    if (!bar) return false;
    bar.dataset.wired = '1';
    el('localPlaybackBack')?.addEventListener('click', () => step(-STEP_SECONDS));
    el('localPlaybackPlay')?.addEventListener('click', () => { play(); refresh(); });
    el('localPlaybackPause')?.addEventListener('click', () => { pause(); refresh(); });
    el('localPlaybackStop')?.addEventListener('click', () => { stop(); refresh(); });
    el('localPlaybackRestart')?.addEventListener('click', () => { restart(); refresh(); });
    el('localPlaybackForward')?.addEventListener('click', () => step(STEP_SECONDS));
    el('localPlaybackScrubber')?.addEventListener('input', event => seek(Number(event.target.value)));
    return true;
  }

  function loop() {
    refresh();
    raf = root.requestAnimationFrame?.(loop) || null;
  }

  function install() {
    wire();
    if (installed) return root.PocketPTMotionLabLocalPlaybackControls;
    installed = true;
    root.addEventListener?.('pagehide', () => { if (raf != null) root.cancelAnimationFrame?.(raf); raf = null; }, { once: true });
    loop();
    return root.PocketPTMotionLabLocalPlaybackControls;
  }

  root.PocketPTMotionLabLocalPlaybackControls = Object.freeze({
    VERSION, STEP_SECONDS, install, wire, refresh, seek, step, play, pause, stop, restart,
    getActiveSession: activeSession
  });
  install();
})(window, document);