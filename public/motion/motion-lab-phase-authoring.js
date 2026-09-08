(function initMotionLabPhaseAuthoring(root, document) {
  'use strict';

  const VERSION = '1.0.0-exact-phase-authoring';
  let installed = false;
  let lastSample = Object.freeze({ status: 'idle', phaseId: null, time: null, firstFailingBoundary: null });

  function setStatus(message, kind = 'ready') {
    const node = document.getElementById('poseEditorStatus');
    if (node) {
      node.textContent = message;
      node.dataset.status = kind;
    }
  }

  function exactEvaluate(session, time) {
    if (!session?.action || !session?.mixer) return false;
    const action = session.action;
    action.enabled = true;
    action.play?.();
    action.paused = false;
    action.time = time;
    session.mixer.update?.(0);
    action.paused = true;
    session.avatar?.updateMatrixWorld?.(true);
    return true;
  }

  function samplePhase(phaseId) {
    const editor = root.PocketPTMotionLabPoseEditor;
    const session = editor?.getActiveSession?.();
    const phase = session?.motionSpec?.phases?.find(item => item.id === phaseId);
    if (!editor?.samplePhase || !session?.action || !session?.mixer || !phase) {
      lastSample = Object.freeze({ status: 'failed', phaseId: phaseId || null, time: null, firstFailingBoundary: 'PHASE_AUTHORING_DEPENDENCY' });
      setStatus('Phase authoring failed: load a generated Motion Spec and choose a valid phase.', 'failed');
      return lastSample;
    }

    session.pause?.();
    const time = phase.normalizedTime * session.motionSpec.durationSeconds;
    const mixer = session.mixer;
    const originalSetTime = typeof mixer.setTime === 'function' ? mixer.setTime.bind(mixer) : null;

    mixer.setTime = function exactPhaseSetTime(requestedTime) {
      exactEvaluate(session, requestedTime);
    };

    let out;
    try {
      exactEvaluate(session, time);
      out = editor.samplePhase(phaseId);
      exactEvaluate(session, time);
    } finally {
      if (originalSetTime) mixer.setTime = originalSetTime;
      else delete mixer.setTime;
    }

    if (out?.status !== 'ready') {
      lastSample = Object.freeze({ status: 'failed', phaseId, time, firstFailingBoundary: out?.code || 'PHASE_SAMPLE' });
      return out;
    }

    lastSample = Object.freeze({ status: 'ready', phaseId, time, firstFailingBoundary: null });
    setStatus(`Editing exact phase “${phaseId}”. Adjustments now start from this frozen animation position.`);
    return out;
  }

  function replaceLoadButton() {
    const oldButton = document.getElementById('poseEditorLoadPhase');
    if (!oldButton) return false;
    if (oldButton.dataset.exactPhaseAuthoring === 'true') return true;

    const button = oldButton.cloneNode(true);
    button.dataset.exactPhaseAuthoring = 'true';
    oldButton.replaceWith(button);
    button.addEventListener('click', function () {
      const phaseId = document.getElementById('poseEditorPhase')?.value;
      samplePhase(phaseId);
    });
    return true;
  }

  function install() {
    if (installed) {
      replaceLoadButton();
      return root.PocketPTMotionLabPhaseAuthoring;
    }
    if (!root.PocketPTMotionLabPoseEditor?.samplePhase) return null;
    if (!replaceLoadButton()) return null;
    installed = true;
    return root.PocketPTMotionLabPhaseAuthoring;
  }

  function snapshot() { return lastSample; }

  root.PocketPTMotionLabPhaseAuthoring = Object.freeze({ VERSION, install, samplePhase, snapshot, exactEvaluate });
})(window, document);
