(function initMotionLabIntelligenceDebug(root, factory) {
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.PocketPTMotionLabIntelligenceDebug = api; api.install(); }
})(typeof window !== 'undefined' ? window : globalThis, function motionLabIntelligenceDebugFactory(globalScope) {
  'use strict';

  const state = {
    installed: false,
    compilerWrapped: false,
    attempts: 0,
    lastStatus: 'NOT_RUN',
    lastCode: null,
    motionId: null,
    exerciseId: null,
    adapterLoaded: false,
    adapterVersion: null,
    contactMappingStatus: 'NOT_RUN',
    anchorStatus: 'NOT_RUN',
    anchorPhaseId: null,
    rootCorrectionStatus: 'NOT_RUN',
    correctionMagnitudeWorldUnits: null,
    maxResidualWorldUnits: null,
    kinematicValidationStatus: 'NOT_RUN',
    firstFailingBoundary: 'NONE',
    failingPhaseId: null,
    phaseDiagnostics: []
  };

  let originalCompile = null;

  function finite(value) { return Number.isFinite(Number(value)); }
  function fixed(value, digits) { return finite(value) ? Number(value).toFixed(digits == null ? 4 : digits) : '—'; }
  function boundaryText(boundary) {
    if (!boundary) return 'NONE';
    if (typeof boundary === 'string') return boundary;
    const type = boundary.type || 'UNKNOWN';
    const id = boundary.id || boundary.contact || boundary.contacts?.join(',') || '';
    return id ? `${type}:${id}` : type;
  }

  function resetAttempt(spec) {
    state.attempts += 1;
    state.lastStatus = 'RUNNING';
    state.lastCode = null;
    state.motionId = spec?.motionId || null;
    state.exerciseId = spec?.exerciseId || null;
    state.adapterLoaded = Boolean(globalScope.PocketPTMotionLabIntelligenceAdapter?.solvePhaseContacts);
    state.adapterVersion = globalScope.PocketPTMotionLabIntelligenceAdapter?.VERSION || null;
    state.contactMappingStatus = 'CHECKING';
    state.anchorStatus = 'CHECKING';
    state.anchorPhaseId = spec?.groundingPolicy?.anchorPhaseId || null;
    state.rootCorrectionStatus = 'NOT_RUN';
    state.correctionMagnitudeWorldUnits = null;
    state.maxResidualWorldUnits = null;
    state.kinematicValidationStatus = 'NOT_RUN';
    state.firstFailingBoundary = 'NONE';
    state.failingPhaseId = null;
    state.phaseDiagnostics = [];
    render();
  }

  function consumeResult(result) {
    const diagnostics = result?.diagnostics || {};
    state.lastStatus = result?.status === 'ready' ? 'PASS' : 'FAIL';
    state.lastCode = result?.code || null;
    state.adapterVersion = diagnostics.intelligenceAdapterVersion || state.adapterVersion;
    state.adapterLoaded = Boolean(state.adapterVersion || globalScope.PocketPTMotionLabIntelligenceAdapter?.solvePhaseContacts);
    state.anchorPhaseId = diagnostics.contactAnchorPhaseId || diagnostics.anchorPhaseId || state.anchorPhaseId;
    state.phaseDiagnostics = Array.isArray(diagnostics.phaseConstraintDiagnostics) ? diagnostics.phaseConstraintDiagnostics : [];
    state.maxResidualWorldUnits = finite(diagnostics.maxContactResidualWorldUnits) ? Number(diagnostics.maxContactResidualWorldUnits) : null;

    const failure = diagnostics.firstFailingBoundary || diagnostics.adapterDiagnostics?.firstFailure || null;
    state.firstFailingBoundary = boundaryText(failure);
    state.failingPhaseId = diagnostics.phaseId || null;

    if (result?.code === 'motion_contact_mapping_missing') state.contactMappingStatus = 'FAIL';
    else if (result?.code === 'motion_contact_anchor_unresolved') { state.contactMappingStatus = 'PASS'; state.anchorStatus = 'FAIL'; }
    else if (result?.code === 'motion_phase_contact_unresolved') { state.contactMappingStatus = 'FAIL'; state.anchorStatus = 'FAIL'; }
    else if (state.lastStatus === 'PASS' || diagnostics.kinematicValidationApplied) {
      state.contactMappingStatus = 'PASS';
      state.anchorStatus = diagnostics.contactLockApplied === false ? 'NOT_REQUIRED' : 'PASS';
    }

    if (state.phaseDiagnostics.length) {
      const last = state.phaseDiagnostics[state.phaseDiagnostics.length - 1] || {};
      state.rootCorrectionStatus = last.correctionStatus || 'COMPLETE';
      state.correctionMagnitudeWorldUnits = finite(last.correctionMagnitudeWorldUnits) ? Number(last.correctionMagnitudeWorldUnits) : null;
      const phaseResidual = state.phaseDiagnostics.reduce((max, item) => Math.max(max, finite(item.maxResidualWorldUnits) ? Number(item.maxResidualWorldUnits) : 0), 0);
      if (phaseResidual || state.maxResidualWorldUnits == null) state.maxResidualWorldUnits = phaseResidual;
      const failed = state.phaseDiagnostics.find(item => item.firstFailure);
      if (failed) {
        state.kinematicValidationStatus = 'FAIL';
        state.firstFailingBoundary = boundaryText(failed.firstFailure);
        state.failingPhaseId = failed.phaseId || state.failingPhaseId;
      } else state.kinematicValidationStatus = state.lastStatus === 'PASS' ? 'PASS' : 'FAIL';
    } else if (result?.code === 'motion_kinematic_validation_failed' || result?.code === 'motion_contact_dimension_mismatch') {
      state.kinematicValidationStatus = 'FAIL';
      state.rootCorrectionStatus = diagnostics.adapterDiagnostics?.correctionStatus || 'FAILED';
      state.correctionMagnitudeWorldUnits = finite(diagnostics.adapterDiagnostics?.correctionMagnitudeWorldUnits) ? Number(diagnostics.adapterDiagnostics.correctionMagnitudeWorldUnits) : null;
      state.maxResidualWorldUnits = finite(diagnostics.adapterDiagnostics?.maxResidualWorldUnits) ? Number(diagnostics.adapterDiagnostics.maxResidualWorldUnits) : state.maxResidualWorldUnits;
    } else if (state.lastStatus === 'PASS') {
      state.kinematicValidationStatus = diagnostics.kinematicValidationApplied ? 'PASS' : 'NOT_REQUIRED';
      state.rootCorrectionStatus = diagnostics.contactLockApplied ? 'COMPLETE' : 'NOT_REQUIRED';
    }
    render();
  }

  function diagnosticsText() {
    const phases = state.phaseDiagnostics.length
      ? state.phaseDiagnostics.map(item => `${item.phaseId || '?'}: correction=${item.correctionStatus || '—'} magnitude=${fixed(item.correctionMagnitudeWorldUnits)} residual=${fixed(item.maxResidualWorldUnits)} first=${boundaryText(item.firstFailure)}`).join('\n')
      : 'none';
    return [
      'MOTION LAB — SHARED MOTION INTELLIGENCE',
      `Compile attempts: ${state.attempts}`,
      `Compile status: ${state.lastStatus}${state.lastCode ? ` (${state.lastCode})` : ''}`,
      `Motion ID: ${state.motionId || '—'}`,
      `Exercise ID: ${state.exerciseId || '—'}`,
      `Adapter loaded: ${state.adapterLoaded ? 'YES' : 'NO'}`,
      `Adapter version: ${state.adapterVersion || '—'}`,
      `Contact mappings: ${state.contactMappingStatus}`,
      `Contact anchors: ${state.anchorStatus}`,
      `Anchor phase: ${state.anchorPhaseId || '—'}`,
      `Root/contact correction: ${state.rootCorrectionStatus}`,
      `Correction magnitude: ${fixed(state.correctionMagnitudeWorldUnits)} world units`,
      `Max contact residual: ${fixed(state.maxResidualWorldUnits)} world units`,
      `Kinematic validation: ${state.kinematicValidationStatus}`,
      `First failing boundary: ${state.firstFailingBoundary}`,
      `Failing phase: ${state.failingPhaseId || '—'}`,
      'Per-phase diagnostics:',
      phases
    ].join('\n');
  }

  function ensurePanel() {
    const doc = globalScope.document;
    if (!doc?.body) return null;
    let panel = doc.getElementById('motionLabIntelligenceDebug');
    if (panel) return panel;
    panel = doc.createElement('details');
    panel.id = 'motionLabIntelligenceDebug';
    panel.open = true;
    panel.style.cssText = 'margin-top:12px;border:1px solid #64748b;border-radius:10px;padding:10px;background:rgba(15,23,42,.72)';
    const summary = doc.createElement('summary');
    summary.textContent = 'Shared Motion Intelligence — Phase 2 / Phase 3 Debug';
    summary.style.cssText = 'cursor:pointer;font-weight:700';
    const pre = doc.createElement('pre');
    pre.dataset.motionIntelligenceDiagnostics = 'true';
    pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0 0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace';
    panel.append(summary, pre);
    const stages = doc.getElementById('stages');
    const host = stages?.closest('div') || doc.querySelector('main') || doc.body;
    host.appendChild(panel);
    return panel;
  }

  function render() {
    const pre = ensurePanel()?.querySelector?.('[data-motion-intelligence-diagnostics]');
    if (pre) pre.textContent = diagnosticsText();
  }

  function wrapCompiler() {
    const compiler = globalScope.PocketPTMotionSpecClip;
    if (!compiler?.compile || compiler.__motionIntelligenceDebugWrapped) return false;
    originalCompile = compiler.compile.bind(compiler);
    const wrapped = Object.freeze({
      ...compiler,
      compile(THREE, spec, avatar) {
        resetAttempt(spec);
        try {
          const result = originalCompile(THREE, spec, avatar);
          consumeResult(result);
          return result;
        } catch (error) {
          state.lastStatus = 'FAIL';
          state.lastCode = 'motion_compile_throw';
          state.firstFailingBoundary = 'COMPILER_THROW';
          render();
          throw error;
        }
      },
      __motionIntelligenceDebugWrapped: true
    });
    globalScope.PocketPTMotionSpecClip = wrapped;
    state.compilerWrapped = true;
    render();
    return true;
  }

  function install() {
    if (state.installed) return api;
    state.installed = true;
    ensurePanel();
    wrapCompiler();
    render();
    return api;
  }

  const api = Object.freeze({
    VERSION: '1.0.0-phase3-debug',
    install,
    render,
    diagnosticsText,
    snapshot: () => Object.freeze({ ...state, phaseDiagnostics: Object.freeze(state.phaseDiagnostics.slice()) })
  });
  return api;
});
