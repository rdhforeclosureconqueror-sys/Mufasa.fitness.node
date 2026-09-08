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
  assert.match(diagnostics, /const adapterEvidence = Boolean\(diagnostics\.intelligenceAdapterVersion \|\| phases\.length\)/);
  assert.match(diagnostics, /kinematicValidationApplied/);
  assert.match(diagnostics, /phaseConstraintDiagnostics/);
  assert.match(diagnostics, /contactLockApplied/);
  assert.doesNotMatch(diagnostics, /MotionLabRuntime\.loadMotionSpec/);
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
