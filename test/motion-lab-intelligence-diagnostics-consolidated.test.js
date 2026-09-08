'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const diagnostics = read('public/motion/motion-lab-intelligence-diagnostics.js');
const bootstrap = read('motion-lab/motion-lab-bootstrap.js');

test('diagnostics remain NOT RUN until an actual Motion Spec compile', () => {
  assert.match(diagnostics, /compileStatus:\s*NOT_RUN/);
  assert.match(diagnostics, /sharedIntelligenceCore:\s*NOT_RUN/);
  assert.match(diagnostics, /intelligenceAdapter:\s*NOT_RUN/);
  assert.match(diagnostics, /wrapCompiler\(compiler = root\.PocketPTMotionSpecClip\)/);
  assert.match(diagnostics, /const result = originalCompile\(THREE, spec, avatar\)/);
});

test('compiler-level truth owns Motion Intelligence observability', () => {
  assert.match(diagnostics, /const adapterDiagnostics = diagnostics\.adapterDiagnostics/);
  assert.match(diagnostics, /const adapterExecuted = phases\.length > 0 \|\| Boolean\(adapterDiagnostics\)/);
  assert.match(diagnostics, /sharedIntelligenceCore: adapterExecuted \? 'PASS' : 'NOT REACHED'/);
  assert.match(diagnostics, /intelligenceAdapter: adapterExecuted \? 'PASS' : 'NOT REACHED'/);
  assert.doesNotMatch(diagnostics, /adapterEvidence = Boolean\(diagnostics\.intelligenceAdapterVersion/);
  assert.doesNotMatch(diagnostics, /MotionLabRuntime\.loadMotionSpec/);
});

test('failed adapter execution stays reached and preserves failing phase evidence', () => {
  assert.match(diagnostics, /adapterDiagnostics && diagnostics\.phaseId/);
  assert.match(diagnostics, /observedPhases\.push\(Object\.freeze\(\{ phaseId: diagnostics\.phaseId, \.\.\.adapterDiagnostics \}\)\)/);
  assert.match(diagnostics, /kinematicValidation: adapterExecuted \? \(compileReady \? 'PASS' : 'FAIL'\)/);
  assert.match(diagnostics, /contactLock: adapterExecuted \? \(compileReady \? 'ACTIVE' : 'FAILED'\)/);
  assert.match(diagnostics, /rootContactCorrection: adapterExecuted \? \(correctionApplied \? 'APPLIED' : \(compileReady \? 'NOT NEEDED' : 'FAILED'\)\)/);
  assert.match(diagnostics, /maxResidualWorldUnits/);
  assert.match(diagnostics, /firstFailingPhase: diagnostics\.phaseId/);
});

test('version availability alone cannot claim adapter execution', () => {
  assert.match(diagnostics, /adapterVersion: diagnostics\.intelligenceAdapterVersion \|\| null/);
  assert.match(diagnostics, /const adapterExecuted = phases\.length > 0 \|\| Boolean\(adapterDiagnostics\)/);
  assert.doesNotMatch(diagnostics, /adapterExecuted = Boolean\(diagnostics\.intelligenceAdapterVersion/);
});

test('numeric summaries do not convert missing values into fake zero measurements', () => {
  assert.match(diagnostics, /values\.filter\(value => value != null && Number\.isFinite\(Number\(value\)\)\)\.map\(Number\)/);
});

test('consolidated surface exposes first failure, correction, residual, coverage and per-phase evidence', () => {
  for (const token of [
    'First failing boundary',
    'First failing phase',
    'Root contact correction',
    'Max root correction',
    'Max contact residual',
    'Contact phases validated',
    'Per-phase diagnostics',
    'correctionMagnitudeWorldUnits',
    'maxResidualWorldUnits'
  ]) assert.match(diagnostics, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('one copy control exports the consolidated debug block', () => {
  assert.match(diagnostics, /Copy Motion Intelligence Debug/);
  assert.match(diagnostics, /copyMotionIntelligenceDiagnostics/);
  assert.match(diagnostics, /diagnosticsText/);
  assert.match(diagnostics, /navigator\?\.clipboard\?\.writeText/);
});

test('diagnostics live under Loaded motion instead of creating a competing section', () => {
  assert.match(diagnostics, /motionIntelligenceDiagnosticsHeading/);
  assert.match(diagnostics, /Motion Intelligence — Consolidated Debug/);
  assert.match(diagnostics, /document\.getElementById\('motionDiagnostics'\)/);
  assert.doesNotMatch(diagnostics, /createElement\('section'\)/);
});

test('bootstrap loads diagnostic compiler wrapper after compiler and before session consumers', () => {
  const compiler = bootstrap.indexOf('motion_spec_clip');
  const bridge = bootstrap.indexOf('motion_intelligence_diagnostics');
  const session = bootstrap.indexOf('disposable_motion_session');
  assert.ok(compiler >= 0);
  assert.ok(bridge > compiler);
  assert.ok(session > bridge);
  assert.match(bootstrap, /motion-lab-intelligence-diagnostics\.js/);
});
