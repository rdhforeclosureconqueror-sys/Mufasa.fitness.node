(function initMotionLabIntelligenceDiagnostics(root) {
  'use strict';

  const NOT_RUN = 'NOT RUN';
  let snapshot = Object.freeze({
    compileStatus: NOT_RUN,
    sharedIntelligenceCore: NOT_RUN,
    intelligenceAdapter: NOT_RUN,
    coreVersion: null,
    adapterVersion: null,
    motionId: null,
    exerciseId: null,
    kinematicValidation: NOT_RUN,
    contactLock: NOT_RUN,
    declaredGroundingContacts: null,
    contactPhasesDeclared: null,
    contactPhasesValidated: null,
    rootContactCorrection: NOT_RUN,
    maxRootCorrectionWorldUnits: null,
    maxContactResidualWorldUnits: null,
    firstFailingPhase: null,
    firstFailingBoundary: null,
    code: null,
    updatedAt: null
  });

  function numericMax(values) {
    const finite = values.map(Number).filter(Number.isFinite);
    return finite.length ? Math.max(...finite) : null;
  }

  function boundaryName(value, fallback) {
    if (!value) return fallback || null;
    if (typeof value === 'string') return value;
    return value.type || value.code || fallback || null;
  }

  function contactPhaseCount(spec) {
    return Array.isArray(spec?.phases) ? spec.phases.filter(phase => Array.isArray(phase.contacts) && phase.contacts.length).length : 0;
  }

  function summarize(spec, result) {
    const diagnostics = result?.diagnostics || {};
    const phases = Array.isArray(diagnostics.phaseConstraintDiagnostics) ? diagnostics.phaseConstraintDiagnostics : [];
    const declaredContacts = Array.isArray(spec?.groundingPolicy?.contacts) ? spec.groundingPolicy.contacts.length : 0;
    const declaredContactPhases = contactPhaseCount(spec);
    const adapterEvidence = Boolean(diagnostics.intelligenceAdapterVersion || phases.length);
    const contactValidationAttempted = diagnostics.kinematicValidationApplied === true || phases.length > 0;
    const compileReady = result?.status === 'ready';
    const correctionMagnitudes = phases.map(phase => phase.correctionMagnitudeWorldUnits);
    const correctionApplied = phases.some(phase => phase.correctionStatus === 'CORRECTION_REQUIRED');
    const phaseFailure = phases.find(phase => phase.firstFailure);
    const firstBoundary = boundaryName(
      diagnostics.firstFailingBoundary || diagnostics.adapterDiagnostics?.firstFailure || phaseFailure?.firstFailure,
      compileReady ? null : result?.code || 'motion_compile_failed'
    );

    return Object.freeze({
      compileStatus: compileReady ? 'PASS' : 'FAIL',
      // These PASS values require an actual compiler result. Module presence alone never marks PASS.
      sharedIntelligenceCore: adapterEvidence ? 'PASS' : (compileReady ? 'NOT REACHED' : 'NOT REACHED'),
      intelligenceAdapter: adapterEvidence ? 'PASS' : 'NOT REACHED',
      coreVersion: adapterEvidence ? root.PocketPTAvatarMotionIntelligenceCore?.VERSION || null : null,
      adapterVersion: diagnostics.intelligenceAdapterVersion || null,
      motionId: diagnostics.motionId || spec?.motionId || null,
      exerciseId: diagnostics.exerciseId || spec?.exerciseId || null,
      kinematicValidation: contactValidationAttempted ? (compileReady ? 'PASS' : 'FAIL') : (compileReady ? 'NOT APPLICABLE' : 'NOT REACHED'),
      contactLock: diagnostics.contactLockApplied === true ? 'ACTIVE' : (compileReady ? 'INACTIVE' : 'NOT REACHED'),
      declaredGroundingContacts: declaredContacts,
      contactPhasesDeclared: declaredContactPhases,
      contactPhasesValidated: phases.length,
      rootContactCorrection: contactValidationAttempted ? (correctionApplied ? 'APPLIED' : 'NOT NEEDED') : (compileReady ? 'NOT APPLICABLE' : 'NOT REACHED'),
      maxRootCorrectionWorldUnits: numericMax(correctionMagnitudes),
      maxContactResidualWorldUnits: Number.isFinite(Number(diagnostics.maxContactResidualWorldUnits)) ? Number(diagnostics.maxContactResidualWorldUnits) : numericMax(phases.map(phase => phase.maxResidualWorldUnits)),
      firstFailingPhase: diagnostics.phaseId || phaseFailure?.phaseId || null,
      firstFailingBoundary: firstBoundary,
      code: result?.code || null,
      updatedAt: new Date().toISOString()
    });
  }

  function ensureHost() {
    const document = root.document;
    if (!document) return null;
    let host = document.getElementById('motionIntelligenceDiagnostics');
    if (host) return host;
    const motion = document.getElementById('motionDiagnostics');
    if (!motion?.parentElement) return null;
    const heading = document.createElement('h3');
    heading.id = 'motionIntelligenceDiagnosticsHeading';
    heading.textContent = 'Motion Intelligence — Phase 2';
    host = document.createElement('dl');
    host.id = 'motionIntelligenceDiagnostics';
    motion.insertAdjacentElement('afterend', heading);
    heading.insertAdjacentElement('afterend', host);
    return host;
  }

  function formatNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(4) : '—';
  }

  function render() {
    const host = ensureHost();
    if (!host) return;
    host.replaceChildren();
    const rows = [
      ['Compile status', snapshot.compileStatus],
      ['Shared intelligence core', snapshot.sharedIntelligenceCore],
      ['Intelligence adapter', snapshot.intelligenceAdapter],
      ['Core version', snapshot.coreVersion || '—'],
      ['Adapter version', snapshot.adapterVersion || '—'],
      ['Motion ID', snapshot.motionId || '—'],
      ['Exercise ID', snapshot.exerciseId || '—'],
      ['Kinematic validation', snapshot.kinematicValidation],
      ['Contact lock', snapshot.contactLock],
      ['Declared grounding contacts', snapshot.declaredGroundingContacts == null ? '—' : snapshot.declaredGroundingContacts],
      ['Contact phases validated', snapshot.contactPhasesDeclared == null ? '—' : `${snapshot.contactPhasesValidated} / ${snapshot.contactPhasesDeclared}`],
      ['Root contact correction', snapshot.rootContactCorrection],
      ['Max root correction', formatNumber(snapshot.maxRootCorrectionWorldUnits)],
      ['Max contact residual', formatNumber(snapshot.maxContactResidualWorldUnits)],
      ['First failing phase', snapshot.firstFailingPhase || 'NONE'],
      ['First failing boundary', snapshot.firstFailingBoundary || 'NONE'],
      ['Compile code', snapshot.code || '—']
    ];
    for (const [name, value] of rows) {
      const dt = root.document.createElement('dt');
      const dd = root.document.createElement('dd');
      dt.textContent = name;
      dd.textContent = String(value);
      host.append(dt, dd);
    }
  }

  function publish(next) {
    snapshot = Object.freeze({ ...next });
    render();
    try { root.dispatchEvent?.(new CustomEvent('pocketpt:motion-intelligence-diagnostics', { detail: snapshot })); } catch (_) {}
    return snapshot;
  }

  function wrapCompiler(compiler = root.PocketPTMotionSpecClip) {
    if (!compiler?.compile) return null;
    if (compiler.__motionIntelligenceDiagnosticsWrapped === true) return compiler;
    const originalCompile = compiler.compile.bind(compiler);
    const wrapped = Object.freeze({
      ...compiler,
      compile(THREE, spec, avatar) {
        publish({ ...snapshot, compileStatus: 'RUNNING', motionId: spec?.motionId || null, exerciseId: spec?.exerciseId || null, declaredGroundingContacts: Array.isArray(spec?.groundingPolicy?.contacts) ? spec.groundingPolicy.contacts.length : 0, contactPhasesDeclared: contactPhaseCount(spec), contactPhasesValidated: 0, firstFailingPhase: null, firstFailingBoundary: null, code: null, updatedAt: new Date().toISOString() });
        try {
          const result = originalCompile(THREE, spec, avatar);
          publish(summarize(spec, result));
          return result;
        } catch (error) {
          publish(Object.freeze({ ...snapshot, compileStatus: 'FAIL', sharedIntelligenceCore: 'NOT REACHED', intelligenceAdapter: 'NOT REACHED', kinematicValidation: 'NOT REACHED', contactLock: 'NOT REACHED', rootContactCorrection: 'NOT REACHED', firstFailingBoundary: error?.code || 'compiler_exception', code: error?.code || 'compiler_exception', updatedAt: new Date().toISOString() }));
          throw error;
        }
      },
      __motionIntelligenceDiagnosticsWrapped: true
    });
    root.PocketPTMotionSpecClip = wrapped;
    return wrapped;
  }

  const api = Object.freeze({
    VERSION: '1.0.0-phase2-observability',
    snapshot: () => Object.freeze({ ...snapshot }),
    summarize,
    render,
    wrapCompiler
  });
  root.PocketPTMotionIntelligenceDiagnostics = api;
  wrapCompiler();
  render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
