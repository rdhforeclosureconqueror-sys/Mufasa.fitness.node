(function initMotionLabPoseEditorPreviewGuard(root, document) {
  'use strict';

  const VERSION = '1.0.0-single-phase-preview-truth';

  function pendingEdits() {
    const payload = root.PocketPTMotionLabPoseEditor?.exportAdjustment?.();
    return Array.isArray(payload?.edits) ? payload.edits : [];
  }

  function setStatus(message) {
    const node = document.getElementById('poseEditorStatus');
    if (node) {
      node.textContent = message;
      node.dataset.status = 'failed';
    }
  }

  function guardPhaseSwitch(event) {
    const select = document.getElementById('poseEditorPhase');
    const edits = pendingEdits();
    if (!select || !edits.length) return;

    const editedPhases = [...new Set(edits.map(edit => edit?.phaseId).filter(Boolean))];
    if (editedPhases.length !== 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setStatus('Preview truth guard: pending edits span multiple phases. Reset All before continuing so preview and export cannot disagree.');
      return;
    }

    const activeEditedPhase = editedPhases[0];
    if (select.value === activeEditedPhase) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    select.value = activeEditedPhase;
    setStatus(`Preview truth guard: phase “${activeEditedPhase}” has pending edits. Play/copy them or Reset Phase/Reset All before editing another phase.`);
  }

  function install() {
    const button = document.getElementById('poseEditorLoadPhase');
    if (!button) return false;
    if (button.dataset.previewTruthGuard === 'true') return true;
    button.dataset.previewTruthGuard = 'true';
    button.addEventListener('click', guardPhaseSwitch, true);
    return true;
  }

  root.PocketPTMotionLabPoseEditorPreviewGuard = Object.freeze({
    VERSION,
    install,
    pendingEdits
  });

  install();
})(window, document);
