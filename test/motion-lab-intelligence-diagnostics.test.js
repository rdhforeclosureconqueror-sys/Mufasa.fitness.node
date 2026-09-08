'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const diagnostics = read('public/motion/motion-lab-intelligence-diagnostics.js');
const bootstrap = read('motion-lab/motion-lab-bootstrap.js');

test('Motion Intelligence diagnostics remain NOT RUN until an actual Motion Spec compile', () => {
  assert.match(diagnostics, /compileStatus:\s*NOT_RUN/);
  assert.match(diagnostics, /sharedIntelligenceCore:\s*NOT_RUN/);
  assert.match(diagnostics, /intelligenceAdapter:\s*NOT_RUN/);
  assert.match(diagnostics, /wrapCompiler\(compiler = root\.PocketPTMotionSpecClip\)/);
  assert.match(diagnostics, /const result = originalCompile\(THREE, spec, avatar\)/);
});

test('Phase 2 PASS evidence comes from compiler diagnostics rather than module presence alone', () => {
  assert.match(diagnostics, /const adapterEvidence = Boolean\(diagnostics\.intelligenceAdapterVersion \|\| phases\.length\)/);
  assert.match(diagnostics, /sharedIntelligenceCore: adapterEvidence \? 'PASS'/);
  assert.match(diagnostics, /intelligenceAdapter: adapterEvidence \? 'PASS'/);
  assert.match(diagnostics, /kinematicValidationApplied/);
  assert.match(diagnostics, /phaseConstraintDiagnostics/);
  assert.match(diagnostics, /contactLockApplied/);
});

test('Motion Intelligence exposes correction, residual, coverage, and first-failure truth', () => {
  assert.match(diagnostics, /correctionMagnitudeWorldUnits/);
  assert.match(diagnostics, /maxContactResidualWorldUnits/);
  assert.match(diagnostics, /contactPhasesValidated/);
  assert.match(diagnostics, /firstFailingPhase/);
  assert.match(diagnostics, /firstFailingBoundary/);
  assert.match(diagnostics, /adapterDiagnostics\?\.firstFailure/);
  assert.match(diagnostics, /phaseId/);
});

test('no-contact generated motions are not mislabeled as kinematic PASS', () => {
  assert.match(diagnostics, /'NOT APPLICABLE'/);
  assert.match(diagnostics, /contactLock: diagnostics\.contactLockApplied === true \? 'ACTIVE'/);
  assert.match(diagnostics, /rootContactCorrection: contactValidationAttempted/);
});

test('Phase 2 evidence is consolidated under Loaded motion instead of creating another debug panel', () => {
  assert.match(diagnostics, /motionIntelligenceDiagnosticsHeading/);
  assert.match(diagnostics, /Motion Intelligence — Phase 2/);
  assert.match(diagnostics, /document\.getElementById\('motionDiagnostics'\)/);
  assert.match(diagnostics, /motion\.insertAdjacentElement\('afterend', heading\)/);
  assert.doesNotMatch(diagnostics, /createElement\('section'\)/);
});

test('bootstrap loads the diagnostic bridge after the compiler and before session consumers', () => {
  const compiler = bootstrap.indexOf('motion_spec_clip');
  const bridge = bootstrap.indexOf('motion_intelligence_diagnostics');
  const session = bootstrap.indexOf('disposable_motion_session');
  assert.ok(compiler >= 0, 'Motion Spec compiler load missing');
  assert.ok(bridge > compiler, 'diagnostic bridge must wrap the loaded compiler');
  assert.ok(session > bridge, 'session must consume the wrapped compiler path');
  assert.match(bootstrap, /motion-lab-intelligence-diagnostics\.js/);
});
