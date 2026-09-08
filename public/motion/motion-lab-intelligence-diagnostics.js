(function initMotionLabIntelligenceDiagnostics(root) {
  'use strict';
  const NOT_RUN = 'NOT RUN';
  let snapshot = Object.freeze({
    compileStatus: NOT_RUN, sharedIntelligenceCore: NOT_RUN, intelligenceAdapter: NOT_RUN,
    coreVersion: null, adapterVersion: null, motionId: null, exerciseId: null,
    kinematicValidation: NOT_RUN, contactLock: NOT_RUN, generatedIK: NOT_RUN,
    generatedIKChainCount: null, postSolveTracksCaptured: null,
    declaredGroundingContacts: null, contactPhasesDeclared: null, contactPhasesValidated: null,
    rootContactCorrection: NOT_RUN, maxRootCorrectionWorldUnits: null, maxContactResidualWorldUnits: null,
    maxChainResidualWorldUnits: null, firstFailingPhase: null, firstFailingBoundary: null,
    code: null, phaseConstraintDiagnostics: Object.freeze([]), updatedAt: null
  });

  function numericMax(values) {
    const finite = values.filter(value => value != null && Number.isFinite(Number(value))).map(Number);
    return finite.length ? Math.max(...finite) : null;
  }
  function boundaryName(value, fallback) {
    if (!value) return fallback || null;
    if (typeof value === 'string') return value;
    const type = value.type || value.code || fallback || null;
    const id = value.id || value.contact || (Array.isArray(value.contacts) ? value.contacts.join(',') : null);
    return type && id ? `${type}:${id}` : type;
  }
  function contactPhaseCount(spec) {
    return Array.isArray(spec?.phases) ? spec.phases.filter(phase => Array.isArray(phase.contacts) && phase.contacts.length).length : 0;
  }
  function allChainDiagnostics(phases) {
    return phases.flatMap(phase => Array.isArray(phase.chainDiagnostics) ? phase.chainDiagnostics.map(chain => ({ phaseId: phase.phaseId, ...chain })) : []);
  }

  function summarize(spec, result) {
    const diagnostics = result?.diagnostics || {};
    const phases = Array.isArray(diagnostics.phaseConstraintDiagnostics) ? diagnostics.phaseConstraintDiagnostics : [];
    const adapterDiagnostics = diagnostics.adapterDiagnostics && typeof diagnostics.adapterDiagnostics === 'object' ? diagnostics.adapterDiagnostics : null;
    const declaredContacts = Array.isArray(spec?.groundingPolicy?.contacts) ? spec.groundingPolicy.contacts.length : 0;
    const declaredContactPhases = contactPhaseCount(spec);
    const adapterExecuted = phases.length > 0 || Boolean(adapterDiagnostics);
    const compileReady = result?.status === 'ready';
    const observedPhases = phases.map(phase => Object.freeze({ ...phase }));
    if (adapterDiagnostics && diagnostics.phaseId && !observedPhases.some(phase => phase.phaseId === diagnostics.phaseId)) observedPhases.push(Object.freeze({ phaseId: diagnostics.phaseId, ...adapterDiagnostics }));
    const chains = allChainDiagnostics(observedPhases);
    const correctionMagnitudes = observedPhases.map(phase => phase.correctionMagnitudeWorldUnits);
    const correctionApplied = observedPhases.some(phase => phase.correctionStatus === 'CORRECTION_REQUIRED');
    const phaseFailure = observedPhases.find(phase => phase.firstFailure);
    const chainFailure = chains.find(chain => chain.firstFailure);
    const firstBoundary = boundaryName(diagnostics.firstFailingBoundary || adapterDiagnostics?.firstFailure || chainFailure?.firstFailure || phaseFailure?.firstFailure, compileReady ? null : result?.code || 'motion_compile_failed');
    const validatedPhaseCount = observedPhases.filter(phase => !phase.firstFailure).length;
    const requestedIK = Boolean(spec?.groundingPolicy?.enforceGeneratedIK);
    const ikExecuted = requestedIK && (diagnostics.generatedIKApplied === true || chains.length > 0);

    return Object.freeze({
      compileStatus: compileReady ? 'PASS' : 'FAIL',
      sharedIntelligenceCore: adapterExecuted ? 'PASS' : 'NOT REACHED',
      intelligenceAdapter: adapterExecuted ? 'PASS' : 'NOT REACHED',
      coreVersion: adapterExecuted ? root.PocketPTAvatarMotionIntelligenceCore?.VERSION || null : null,
      adapterVersion: diagnostics.intelligenceAdapterVersion || null,
      motionId: diagnostics.motionId || spec?.motionId || null,
      exerciseId: diagnostics.exerciseId || spec?.exerciseId || null,
      kinematicValidation: adapterExecuted ? (compileReady ? 'PASS' : 'FAIL') : (compileReady ? 'NOT APPLICABLE' : 'NOT REACHED'),
      contactLock: adapterExecuted ? (compileReady ? 'ACTIVE' : 'FAILED') : (compileReady ? 'INACTIVE' : 'NOT REACHED'),
      generatedIK: requestedIK ? (ikExecuted ? (compileReady ? 'PASS' : 'FAIL') : 'NOT REACHED') : 'NOT APPLICABLE',
      generatedIKChainCount: Number.isFinite(Number(diagnostics.generatedIKChainCount)) ? Number(diagnostics.generatedIKChainCount) : (requestedIK ? spec?.groundingPolicy?.kinematicChains?.length || 0 : 0),
      postSolveTracksCaptured: diagnostics.postSolveTracksCaptured === true,
      declaredGroundingContacts: declaredContacts,
      contactPhasesDeclared: declaredContactPhases,
      contactPhasesValidated: validatedPhaseCount,
      rootContactCorrection: adapterExecuted ? (correctionApplied ? 'APPLIED' : (compileReady ? 'NOT NEEDED' : 'FAILED')) : (compileReady ? 'NOT APPLICABLE' : 'NOT REACHED'),
      maxRootCorrectionWorldUnits: numericMax(correctionMagnitudes),
      maxContactResidualWorldUnits: Number.isFinite(Number(diagnostics.maxContactResidualWorldUnits)) ? Number(diagnostics.maxContactResidualWorldUnits) : numericMax(observedPhases.map(phase => phase.maxResidualWorldUnits)),
      maxChainResidualWorldUnits: Number.isFinite(Number(diagnostics.maxChainResidualWorldUnits)) ? Number(diagnostics.maxChainResidualWorldUnits) : numericMax(chains.map(chain => chain.chainResidualWorldUnits)),
      firstFailingPhase: diagnostics.phaseId || chainFailure?.phaseId || phaseFailure?.phaseId || null,
      firstFailingBoundary: firstBoundary,
      code: result?.code || null,
      phaseConstraintDiagnostics: Object.freeze(observedPhases),
      updatedAt: new Date().toISOString()
    });
  }

  function formatNumber(value) { return Number.isFinite(Number(value)) ? Number(value).toFixed(5) : '—'; }
  function diagnosticsText() {
    const lines = [
      'MOTION LAB — MOTION INTELLIGENCE DIAGNOSTICS',
      `Compile status: ${snapshot.compileStatus}`,
      `First failing boundary: ${snapshot.firstFailingBoundary || 'NONE'}`,
      `First failing phase: ${snapshot.firstFailingPhase || 'NONE'}`,
      `Compile code: ${snapshot.code || 'NONE'}`,
      `Motion ID: ${snapshot.motionId || '—'}`,
      `Exercise ID: ${snapshot.exerciseId || '—'}`,
      `Shared intelligence core: ${snapshot.sharedIntelligenceCore}`,
      `Core version: ${snapshot.coreVersion || '—'}`,
      `Intelligence adapter: ${snapshot.intelligenceAdapter}`,
      `Adapter version: ${snapshot.adapterVersion || '—'}`,
      `Kinematic validation: ${snapshot.kinematicValidation}`,
      `Contact lock: ${snapshot.contactLock}`,
      `Generated IK: ${snapshot.generatedIK}`,
      `Generated IK chains: ${snapshot.generatedIKChainCount == null ? '—' : snapshot.generatedIKChainCount}`,
      `Post-solve tracks captured: ${snapshot.postSolveTracksCaptured ? 'YES' : 'NO'}`,
      `Declared grounding contacts: ${snapshot.declaredGroundingContacts == null ? '—' : snapshot.declaredGroundingContacts}`,
      `Contact phases validated: ${snapshot.contactPhasesDeclared == null ? '—' : `${snapshot.contactPhasesValidated} / ${snapshot.contactPhasesDeclared}`}`,
      `Root contact correction: ${snapshot.rootContactCorrection}`,
      `Max root correction: ${formatNumber(snapshot.maxRootCorrectionWorldUnits)}`,
      `Max contact residual: ${formatNumber(snapshot.maxContactResidualWorldUnits)}`,
      `Max chain residual: ${formatNumber(snapshot.maxChainResidualWorldUnits)}`,
      'Per-phase diagnostics:'
    ];
    if (!snapshot.phaseConstraintDiagnostics.length) lines.push('  none');
    snapshot.phaseConstraintDiagnostics.forEach(phase => {
      lines.push(`  ${phase.phaseId || '?'}: contacts=${phase.contactCount ?? '—'} correction=${phase.correctionStatus || '—'} magnitude=${formatNumber(phase.correctionMagnitudeWorldUnits)} residual=${formatNumber(phase.maxResidualWorldUnits)} chains=${phase.chainCount ?? 0} firstFailure=${boundaryName(phase.firstFailure, 'NONE') || 'NONE'}`);
      (phase.chainDiagnostics || []).forEach(chain => lines.push(`    chain ${chain.chainId || '?'}: contact=${chain.contactId || '—'} solve=${chain.solveStatus || '—'} l1=${formatNumber(chain.length1)} l2=${formatNumber(chain.length2)} chainResidual=${formatNumber(chain.chainResidualWorldUnits)} contactResidual=${formatNumber(chain.contactResidualWorldUnits)} firstFailure=${boundaryName(chain.firstFailure, 'NONE') || 'NONE'}`));
    });
    lines.push(`Updated: ${snapshot.updatedAt || 'never'}`);
    return lines.join('\n');
  }

  function ensureHost() {
    const document = root.document;
    if (!document) return null;
    let host = document.getElementById('motionIntelligenceDiagnostics');
    if (host) return host;
    const motion = document.getElementById('motionDiagnostics');
    if (!motion?.parentElement) return null;
    const heading = document.createElement('h3'); heading.id = 'motionIntelligenceDiagnosticsHeading'; heading.textContent = 'Motion Intelligence — Consolidated Debug';
    const controls = document.createElement('div'); controls.className = 'controls';
    const copy = document.createElement('button'); copy.id = 'copyMotionIntelligenceDiagnostics'; copy.type = 'button'; copy.textContent = 'Copy Motion Intelligence Debug';
    copy.addEventListener('click', async function () {
      const text = diagnosticsText();
      try { await root.navigator?.clipboard?.writeText?.(text); copy.textContent = 'Copied'; }
      catch (_) {
        const pre = document.getElementById('motionIntelligenceDiagnosticsText');
        if (pre) { const range = document.createRange(); range.selectNodeContents(pre); const selection = root.getSelection?.(); selection?.removeAllRanges?.(); selection?.addRange?.(range); }
        copy.textContent = 'Select / Copy';
      }
      root.setTimeout?.(() => { copy.textContent = 'Copy Motion Intelligence Debug'; }, 1500);
    });
    controls.appendChild(copy);
    host = document.createElement('dl'); host.id = 'motionIntelligenceDiagnostics';
    const pre = document.createElement('pre'); pre.id = 'motionIntelligenceDiagnosticsText'; pre.style.whiteSpace = 'pre-wrap'; pre.style.overflowWrap = 'anywhere';
    motion.insertAdjacentElement('afterend', heading); heading.insertAdjacentElement('afterend', controls); controls.insertAdjacentElement('afterend', host); host.insertAdjacentElement('afterend', pre);
    return host;
  }

  function render() {
    const host = ensureHost(); if (!host) return;
    host.replaceChildren();
    const rows = [
      ['Compile status', snapshot.compileStatus], ['Shared intelligence core', snapshot.sharedIntelligenceCore], ['Intelligence adapter', snapshot.intelligenceAdapter],
      ['Core version', snapshot.coreVersion || '—'], ['Adapter version', snapshot.adapterVersion || '—'], ['Motion ID', snapshot.motionId || '—'], ['Exercise ID', snapshot.exerciseId || '—'],
      ['Kinematic validation', snapshot.kinematicValidation], ['Contact lock', snapshot.contactLock], ['Generated IK', snapshot.generatedIK], ['Generated IK chains', snapshot.generatedIKChainCount == null ? '—' : snapshot.generatedIKChainCount],
      ['Post-solve tracks captured', snapshot.postSolveTracksCaptured ? 'YES' : 'NO'], ['Declared grounding contacts', snapshot.declaredGroundingContacts == null ? '—' : snapshot.declaredGroundingContacts],
      ['Contact phases validated', snapshot.contactPhasesDeclared == null ? '—' : `${snapshot.contactPhasesValidated} / ${snapshot.contactPhasesDeclared}`], ['Root contact correction', snapshot.rootContactCorrection],
      ['Max root correction', formatNumber(snapshot.maxRootCorrectionWorldUnits)], ['Max contact residual', formatNumber(snapshot.maxContactResidualWorldUnits)], ['Max chain residual', formatNumber(snapshot.maxChainResidualWorldUnits)],
      ['First failing phase', snapshot.firstFailingPhase || 'NONE'], ['First failing boundary', snapshot.firstFailingBoundary || 'NONE'], ['Compile code', snapshot.code || '—']
    ];
    for (const [name, value] of rows) { const dt = root.document.createElement('dt'); const dd = root.document.createElement('dd'); dt.textContent = name; dd.textContent = String(value); host.append(dt, dd); }
    const pre = root.document.getElementById('motionIntelligenceDiagnosticsText'); if (pre) pre.textContent = diagnosticsText();
  }

  function publish(next) {
    snapshot = Object.freeze({ ...next }); render();
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
        publish({ ...snapshot, compileStatus: 'RUNNING', motionId: spec?.motionId || null, exerciseId: spec?.exerciseId || null, generatedIK: spec?.groundingPolicy?.enforceGeneratedIK ? 'RUNNING' : 'NOT APPLICABLE', generatedIKChainCount: spec?.groundingPolicy?.kinematicChains?.length || 0, postSolveTracksCaptured: false, declaredGroundingContacts: Array.isArray(spec?.groundingPolicy?.contacts) ? spec.groundingPolicy.contacts.length : 0, contactPhasesDeclared: contactPhaseCount(spec), contactPhasesValidated: 0, firstFailingPhase: null, firstFailingBoundary: null, code: null, phaseConstraintDiagnostics: Object.freeze([]), updatedAt: new Date().toISOString() });
        try { const result = originalCompile(THREE, spec, avatar); publish(summarize(spec, result)); return result; }
        catch (error) {
          publish(Object.freeze({ ...snapshot, compileStatus: 'FAIL', sharedIntelligenceCore: 'NOT REACHED', intelligenceAdapter: 'NOT REACHED', kinematicValidation: 'NOT REACHED', contactLock: 'NOT REACHED', generatedIK: spec?.groundingPolicy?.enforceGeneratedIK ? 'NOT REACHED' : 'NOT APPLICABLE', rootContactCorrection: 'NOT REACHED', firstFailingBoundary: error?.code || 'compiler_exception', code: error?.code || 'compiler_exception', updatedAt: new Date().toISOString() }));
          throw error;
        }
      },
      __motionIntelligenceDiagnosticsWrapped: true
    });
    root.PocketPTMotionSpecClip = wrapped; return wrapped;
  }

  const api = Object.freeze({ VERSION: '1.1.0-phase4-generated-ik-observability', snapshot: () => Object.freeze({ ...snapshot }), summarize, diagnosticsText, render, wrapCompiler });
  root.PocketPTMotionIntelligenceDiagnostics = api; wrapCompiler(); render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
