(function initMotionLabIntelligenceDebug(window, document) {
  'use strict';

  var state = {
    installed: false,
    loadAttempts: 0,
    lastMotionId: null,
    lastExerciseId: null,
    status: 'NOT_RUN',
    code: null,
    adapterVersion: null,
    coreVersion: null,
    kinematicValidationApplied: false,
    contactLockApplied: false,
    anchorPhaseId: null,
    firstFailingBoundary: null,
    missingContacts: [],
    maxContactResidualWorldUnits: null,
    phaseConstraintDiagnostics: [],
    updatedAt: null
  };

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return String(value); }
  }

  function boundaryText(boundary) {
    if (!boundary) return 'NONE';
    if (typeof boundary === 'string') return boundary;
    var type = boundary.type || boundary.code || 'UNKNOWN';
    var id = boundary.id ? ':' + boundary.id : '';
    var contacts = Array.isArray(boundary.contacts) && boundary.contacts.length ? ' [' + boundary.contacts.join(', ') + ']' : '';
    return type + id + contacts;
  }

  function phaseLine(item) {
    var first = boundaryText(item?.firstFailure);
    var correction = item?.correctionStatus || '—';
    var magnitude = Number.isFinite(Number(item?.correctionMagnitudeWorldUnits)) ? Number(item.correctionMagnitudeWorldUnits).toFixed(5) : '—';
    var residual = Number.isFinite(Number(item?.maxResidualWorldUnits)) ? Number(item.maxResidualWorldUnits).toFixed(5) : '—';
    var contacts = item?.contactCount == null ? '—' : item.contactCount;
    return (item?.phaseId || 'unknown') + ': contacts=' + contacts + ' correction=' + correction + ' magnitude=' + magnitude + ' residual=' + residual + ' firstFailure=' + first;
  }

  function snapshot() {
    return Object.freeze({
      ...state,
      missingContacts: Object.freeze(state.missingContacts.slice()),
      phaseConstraintDiagnostics: Object.freeze(state.phaseConstraintDiagnostics.map(function (item) { return Object.freeze({ ...item }); }))
    });
  }

  function diagnosticsText() {
    var bootstrap = window.PocketPTMotionLabBootstrapDiagnostics?.snapshot?.() || null;
    var lines = [
      'MOTION LAB — AVATAR MOTION INTELLIGENCE — PHASE 3 OBSERVABILITY',
      'Status: ' + state.status,
      'Code: ' + (state.code || 'NONE'),
      'First failing boundary: ' + boundaryText(state.firstFailingBoundary),
      'Motion ID: ' + (state.lastMotionId || 'none'),
      'Exercise ID: ' + (state.lastExerciseId || 'none'),
      'Load attempts: ' + state.loadAttempts,
      'Core version: ' + (state.coreVersion || 'unavailable'),
      'Adapter version: ' + (state.adapterVersion || 'unavailable'),
      'Kinematic validation applied: ' + (state.kinematicValidationApplied ? 'YES' : 'NO'),
      'Contact lock applied: ' + (state.contactLockApplied ? 'YES' : 'NO'),
      'Anchor phase: ' + (state.anchorPhaseId || 'none'),
      'Missing contacts: ' + (state.missingContacts.length ? state.missingContacts.join(', ') : 'none'),
      'Max contact residual: ' + (Number.isFinite(Number(state.maxContactResidualWorldUnits)) ? Number(state.maxContactResidualWorldUnits).toFixed(5) : '—'),
      'Phase diagnostics: ' + (state.phaseConstraintDiagnostics.length ? state.phaseConstraintDiagnostics.length : 0)
    ];
    state.phaseConstraintDiagnostics.forEach(function (item) { lines.push('  ' + phaseLine(item)); });
    if (bootstrap) {
      lines.push('Bootstrap: ' + (bootstrap.status || 'unknown') + ' / ' + (bootstrap.stage || 'unknown') + (bootstrap.code ? ' / ' + bootstrap.code : ''));
    }
    lines.push('Updated: ' + (state.updatedAt || 'never'));
    return lines.join('\n');
  }

  function ensurePanel() {
    if (!document?.body) return null;
    var panel = document.getElementById('motionIntelligenceDebugPanel');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'motionIntelligenceDebugPanel';
    panel.dataset.diagnosticPanel = 'motion-intelligence-phase3';

    var title = document.createElement('h2');
    title.textContent = 'Motion Intelligence Debug — Phase 3';
    var note = document.createElement('p');
    note.className = 'measurement';
    note.textContent = 'Shows the shared biomechanics/contact pipeline used by generated Motion Specs. First failure has priority over downstream symptoms.';
    var controls = document.createElement('div');
    controls.className = 'controls';
    var copy = document.createElement('button');
    copy.id = 'copyMotionIntelligenceDebug';
    copy.type = 'button';
    copy.textContent = 'Copy Motion Intelligence Debug';
    copy.addEventListener('click', async function () {
      var text = diagnosticsText();
      try {
        await navigator.clipboard?.writeText?.(text);
        copy.textContent = 'Copied';
      } catch (_) {
        var pre = document.getElementById('motionIntelligenceDebugText');
        if (pre) {
          var range = document.createRange();
          range.selectNodeContents(pre);
          var selection = window.getSelection?.();
          selection?.removeAllRanges?.();
          selection?.addRange?.(range);
        }
        copy.textContent = 'Select / Copy';
      }
      window.setTimeout(function () { copy.textContent = 'Copy Motion Intelligence Debug'; }, 1500);
    });
    controls.appendChild(copy);
    var pre = document.createElement('pre');
    pre.id = 'motionIntelligenceDebugText';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.overflowWrap = 'anywhere';
    pre.textContent = diagnosticsText();
    panel.append(title, note, controls, pre);

    var viewer = document.getElementById('viewer')?.closest?.('section');
    var main = document.querySelector('main');
    if (viewer?.parentNode) viewer.parentNode.insertBefore(panel, viewer);
    else main?.appendChild(panel);
    return panel;
  }

  function render() {
    var panel = ensurePanel();
    var pre = panel?.querySelector?.('#motionIntelligenceDebugText');
    if (pre) pre.textContent = diagnosticsText();
  }

  function capture(contract, result) {
    var spec = contract?.spec || {};
    var diagnostics = result?.diagnostics || {};
    var adapterDiagnostics = diagnostics.adapterDiagnostics || {};
    var firstFailure = diagnostics.firstFailingBoundary || adapterDiagnostics.firstFailure || diagnostics.firstFailure || null;
    var missing = diagnostics.missingContacts || adapterDiagnostics.missingContacts || [];
    var phases = diagnostics.phaseConstraintDiagnostics || [];

    state.loadAttempts += 1;
    state.lastMotionId = spec.motionId || diagnostics.motionId || null;
    state.lastExerciseId = spec.exerciseId || diagnostics.exerciseId || null;
    state.status = result?.status === 'ready' ? 'READY' : 'FAILED';
    state.code = result?.code || null;
    state.adapterVersion = diagnostics.intelligenceAdapterVersion || window.PocketPTMotionLabIntelligenceAdapter?.VERSION || null;
    state.coreVersion = window.PocketPTAvatarMotionIntelligenceCore?.VERSION || null;
    state.kinematicValidationApplied = diagnostics.kinematicValidationApplied === true;
    state.contactLockApplied = diagnostics.contactLockApplied === true || Boolean(spec.groundingPolicy?.enforceContactAnchors);
    state.anchorPhaseId = diagnostics.contactAnchorPhaseId || spec.groundingPolicy?.anchorPhaseId || null;
    state.firstFailingBoundary = clone(firstFailure);
    state.missingContacts = Array.isArray(missing) ? missing.slice() : [];
    state.maxContactResidualWorldUnits = Number.isFinite(Number(diagnostics.maxContactResidualWorldUnits)) ? Number(diagnostics.maxContactResidualWorldUnits) : null;
    state.phaseConstraintDiagnostics = Array.isArray(phases) ? phases.map(clone) : [];
    state.updatedAt = new Date().toISOString();
    render();
  }

  function install(runtime) {
    if (!runtime?.loadMotionSpec) {
      state.status = 'UNAVAILABLE';
      state.code = 'motion_lab_runtime_unavailable';
      state.updatedAt = new Date().toISOString();
      render();
      return runtime;
    }
    if (runtime.__motionIntelligenceDebugInstalled === true) {
      state.installed = true;
      render();
      return runtime;
    }
    var originalLoadMotionSpec = runtime.loadMotionSpec.bind(runtime);
    var wrapped = Object.freeze({
      ...runtime,
      loadMotionSpec: async function debugObservedLoadMotionSpec(contract) {
        try {
          var result = await originalLoadMotionSpec(contract);
          capture(contract, result);
          return result;
        } catch (error) {
          capture(contract, { status: 'failed', code: error?.code || 'motion_compile_threw', diagnostics: { firstFailingBoundary: { type: 'MOTION_COMPILE_THROW', message: String(error?.message || error) } } });
          throw error;
        }
      },
      motionIntelligenceDiagnostics: snapshot,
      motionIntelligenceDiagnosticsText: diagnosticsText,
      __motionIntelligenceDebugInstalled: true
    });
    state.installed = true;
    state.status = 'READY_FOR_MOTION';
    state.coreVersion = window.PocketPTAvatarMotionIntelligenceCore?.VERSION || null;
    state.adapterVersion = window.PocketPTMotionLabIntelligenceAdapter?.VERSION || null;
    state.updatedAt = new Date().toISOString();
    render();
    return wrapped;
  }

  window.PocketPTMotionLabIntelligenceDebug = Object.freeze({ install: install, diagnostics: snapshot, diagnosticsText: diagnosticsText, render: render });
  ensurePanel();
  render();
})(window, document);
