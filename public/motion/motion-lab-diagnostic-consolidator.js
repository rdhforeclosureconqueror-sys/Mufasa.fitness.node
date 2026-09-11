(function initMotionLabDiagnosticConsolidator(root) {
  'use strict';

  const BUILD = '2026-09-08-canonical-diagnostic-v2-pose-editor';
  let installed = false;
  let observer = null;

  function slug(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function legacyDiagnosticsText() {
    const rows = Array.from(root.document?.querySelectorAll?.('#stages tr') || []);
    const lines = ['Motion Lab Diagnostic'];
    rows.forEach(row => {
      const cells = Array.from(row.cells || []);
      if (cells.length < 2) return;
      const key = slug(cells[0].textContent);
      const status = String(cells[1].textContent || '').trim() || 'NOT RUN';
      const detail = cells[3] ? String(cells[3].textContent || '').trim() : '';
      lines.push(`${key}: ${status}${detail && detail !== '—' ? ` (${detail})` : ''}`);
    });
    return lines.join('\n');
  }

  function bootstrapText() {
    const value = root.PocketPTMotionLabBootstrapDiagnostics?.snapshot?.();
    if (!value) return 'bootstrap_status: unavailable';
    return [
      `bootstrap_status: ${value.status || 'unknown'}`,
      `bootstrap_stage: ${value.stage || 'unknown'}`,
      `bootstrap_code: ${value.code || 'NONE'}`,
      `bootstrap_source: ${value.source || 'NONE'}`
    ].join('\n');
  }

  function intelligenceText() {
    return root.PocketPTMotionIntelligenceDiagnostics?.diagnosticsText?.()
      || 'MOTION LAB — MOTION INTELLIGENCE DIAGNOSTICS\nStatus: UNAVAILABLE\nFirst failing boundary: MOTION_INTELLIGENCE_DIAGNOSTICS_UNAVAILABLE';
  }

  function poseEditorText() {
    const editor = root.PocketPTMotionLabPoseEditor;
    const session = editor?.getActiveSession?.();
    const adjustment = editor?.exportAdjustment?.();
    const statusNode = root.document?.getElementById?.('poseEditorStatus');
    const phase = root.document?.getElementById?.('poseEditorPhase')?.value || session?.currentMotionPhase?.() || null;
    const target = root.document?.getElementById?.('poseEditorTarget')?.value || null;
    const mode = root.document?.getElementById?.('poseEditorMode')?.value || null;
    const axis = root.document?.getElementById?.('poseEditorAxis')?.value || null;
    const clipName = session?.sessionClip?.name || null;
    return [
      'MOTION LAB — POSE EDITOR DIAGNOSTICS',
      `Editor status: ${editor ? 'READY' : 'UNAVAILABLE'}`,
      `Editor version: ${editor?.VERSION || '—'}`,
      `Active session: ${session ? 'YES' : 'NO'}`,
      `Motion ID: ${adjustment?.motionId || session?.motionSpec?.motionId || '—'}`,
      `Phase: ${phase || '—'}`,
      `Selected target: ${target || '—'}`,
      `Mode / axis: ${mode || '—'} / ${axis || '—'}`,
      `Pending edits: ${Array.isArray(adjustment?.edits) ? adjustment.edits.length : 0}`,
      `Adjusted preview clip: ${clipName && /POSE EDIT PREVIEW/.test(clipName) ? 'YES' : 'NO'}`,
      `Editor message: ${statusNode?.textContent?.trim() || '—'}`
    ].join('\n');
  }

  function thrillerText() {
    const motion = root.MotionLabRuntime?.snapshot?.().motion;
    const crash = root.PocketPTRetargetMotionCompatibility?.readCrashBreadcrumb?.();
    const prep = motion?.retargetNormalization || {};
    if (!motion?.motionId?.startsWith?.('thriller-part-')) return `THRILLER MOTION\nSelected Thriller part: NONE\nFIRST FAILURE: ${crash?.boundary || 'NONE'}`;
    return [
      'THRILLER MOTION',
      `Selected Thriller part: ${motion.selectedPart || '—'}`,
      `Stable motion ID: ${motion.motionId}`,
      `Source FBX: ${motion.sourceFbx || '—'}`,
      `Derived runtime asset: ${motion.runtimeAsset || '—'}`,
      `Source skeleton/profile: ${motion.sourceSkeletonProfile || '—'}`,
      `Target avatar profile: ${motion.targetAvatarProfile || '—'}`,
      `Target skeleton profile: ${motion.targetSkeletonProfile || '—'}`,
      `Clip name: ${motion.clipName || '—'}`,
      `Clip duration: ${motion.clipDuration ?? '—'}`,
      `Track count: ${motion.trackCount ?? '—'}`,
      `Intended / bound / unbound tracks: ${motion.intendedTrackCount ?? '—'} / ${motion.boundTrackCount ?? '—'} / ${motion.unboundTrackCount ?? '—'}`,
      `Unbound track names: ${motion.unboundTracks?.join?.(', ') || 'none'}`,
      `Binding/retarget mode: ${motion.bindingMode || '—'} / ${motion.retargetProfile || '—'}`,
      `Mixer root: ${motion.mixerRootName || '—'} / ${motion.mixerRootUuid || '—'}`,
      `Personalized avatar root: ${motion.personalizedAvatarRootName || '—'} / ${motion.personalizedAvatarRootUuid || '—'}`,
      `Runtime GLB scene root: ${motion.runtimeSceneRootName || '—'} / ${motion.runtimeSceneRootUuid || '—'}`,
      `Mixer root === mounted avatar root: ${motion.mixerRootIsVisibleAvatar === true ? 'YES' : 'NO'}`,
      `Changed representative bones: ${motion.changedRepresentativeBones?.join?.(', ') || 'none'}`,
      `Boundaries: ${motion.boundaries?.map?.(stage => stage.boundary + '=' + stage.status)?.join?.(' -> ') || 'none'}`,
      `Playback state: ${root.MotionLabRuntime?.snapshot?.().playback || motion.playbackState || 'stopped'}`,
      `Persistent incomplete boundary: ${crash?.boundary || 'NONE'}`,
      `Retarget preparation start / end / duration: ${prep.preparationStartedAt ?? '—'} / ${prep.preparationEndedAt ?? '—'} / ${prep.preparationDurationMs ?? '—'} ms`,
      `Quaternion tracks / canonical joints: ${prep.quaternionTrackCount ?? '—'} / ${prep.canonicalJointsRetargeted ?? '—'}`,
      `Source keyframes / batches / largest batch: ${prep.sourceKeyframesProcessed ?? '—'} / ${prep.batchCount ?? '—'} / ${prep.largestBatchDurationMs ?? '—'} ms`,
      `Yields / full-frame cache retained: ${prep.yieldCount ?? '—'} / ${prep.fullFrameCacheRetained === true ? 'YES' : prep.fullFrameCacheRetained === false ? 'NO' : '—'}`,
      `Validation cadence: ${motion.validationCadenceMs ?? '—'} ms`,
      `First failed bone / property: ${motion.anatomyFailure?.bone || 'NONE'} / ${motion.anatomyFailure?.property || 'NONE'}`,
      `FIRST FAILURE: ${motion.firstFailingBoundary || 'NONE'}`
    ].join('\n');
  }

  function combinedDiagnosticsText() {
    return [
      `MOTION LAB DIAGNOSTIC — CONSOLIDATED\nDiagnostic UI build: ${BUILD}`,
      legacyDiagnosticsText(),
      intelligenceText(),
      poseEditorText(),
      thrillerText(),
      'BOOTSTRAP DELIVERY',
      bootstrapText()
    ].join('\n\n');
  }

  function diagnosticsColumn() {
    const stages = root.document?.getElementById?.('stages');
    return stages?.closest?.('table')?.parentElement || null;
  }

  function moveIntelligenceIntoCanonicalDiagnostics() {
    const column = diagnosticsColumn();
    if (!column) return;
    let marker = root.document.getElementById('motionDiagnosticUiBuild');
    if (!marker) { marker = root.document.createElement('p'); marker.id = 'motionDiagnosticUiBuild'; marker.className = 'measurement'; }
    marker.textContent = `Diagnostic UI build: ${BUILD}`;
    const table = root.document.getElementById('stages')?.closest?.('table');
    if (table && marker.parentElement !== column) table.insertAdjacentElement('afterend', marker);

    const heading = root.document.getElementById('motionIntelligenceDiagnosticsHeading');
    const host = root.document.getElementById('motionIntelligenceDiagnostics');
    const pre = root.document.getElementById('motionIntelligenceDiagnosticsText');
    const oldCopy = root.document.getElementById('copyMotionIntelligenceDiagnostics');
    const oldControls = oldCopy?.parentElement;
    if (oldCopy) oldCopy.remove();
    if (oldControls && oldControls.childElementCount === 0) oldControls.remove();
    if (heading && heading.parentElement !== column) column.appendChild(heading);
    if (host && host.parentElement !== column) column.appendChild(host);
    if (pre && pre.parentElement !== column) column.appendChild(pre);

    let combined = root.document.getElementById('canonicalMotionLabDiagnosticText');
    if (!combined) {
      const title = root.document.createElement('h3');
      title.id = 'canonicalMotionLabDiagnosticHeading';
      title.textContent = 'Canonical Copyable Diagnostic';
      combined = root.document.createElement('pre');
      combined.id = 'canonicalMotionLabDiagnosticText';
      combined.style.whiteSpace = 'pre-wrap';
      combined.style.overflowWrap = 'anywhere';
      column.append(title, combined);
    }
    combined.textContent = combinedDiagnosticsText();
  }

  async function copyCombined(button) {
    const text = combinedDiagnosticsText();
    const pre = root.document?.getElementById?.('canonicalMotionLabDiagnosticText');
    if (pre) pre.textContent = text;
    try {
      if (!root.navigator?.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await root.navigator.clipboard.writeText(text);
      button.textContent = 'Copied Full Diagnostic';
    } catch (_) {
      if (pre) {
        const range = root.document.createRange(); range.selectNodeContents(pre);
        const selection = root.getSelection?.(); selection?.removeAllRanges?.(); selection?.addRange?.(range);
      }
      button.textContent = 'Select / Copy Full Diagnostic';
    }
    root.setTimeout?.(() => { button.textContent = 'Copy Full Diagnostic Summary'; }, 1600);
  }

  function wireCanonicalCopy() {
    const button = root.document?.getElementById?.('copySummary');
    if (!button) return false;
    button.textContent = 'Copy Full Diagnostic Summary';
    if (button.dataset.motionDiagnosticConsolidated === 'true') return true;
    button.dataset.motionDiagnosticConsolidated = 'true';
    button.addEventListener('click', function canonicalDiagnosticCopy(event) {
      event.preventDefault(); event.stopImmediatePropagation(); copyCombined(button);
    }, true);
    return true;
  }

  function refresh() {
    moveIntelligenceIntoCanonicalDiagnostics();
    wireCanonicalCopy();
    const pre = root.document?.getElementById?.('canonicalMotionLabDiagnosticText');
    if (pre) pre.textContent = combinedDiagnosticsText();
  }

  function install() {
    if (installed) { refresh(); return api; }
    installed = true; refresh();
    root.addEventListener?.('pocketpt:motion-intelligence-diagnostics', refresh);
    const stages = root.document?.getElementById?.('stages');
    if (stages && typeof root.MutationObserver === 'function') {
      observer = new root.MutationObserver(refresh);
      observer.observe(stages, { childList: true, subtree: true, characterData: true });
    }
    return api;
  }

  const api = Object.freeze({
    VERSION: '1.1.0-canonical-diagnostic-pose-editor',
    BUILD,
    install,
    refresh,
    legacyDiagnosticsText,
    poseEditorText,
    thrillerText,
    combinedDiagnosticsText
  });

  root.PocketPTMotionLabDiagnosticConsolidator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
