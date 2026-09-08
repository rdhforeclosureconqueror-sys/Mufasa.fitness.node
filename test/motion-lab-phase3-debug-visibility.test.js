'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const debug = require('../public/motion/motion-lab-intelligence-debug');
const bootstrap = fs.readFileSync(path.join(__dirname, '../motion-lab/motion-lab-bootstrap.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../public/motion/motion-lab-intelligence-debug.js'), 'utf8');

test('Phase 3 debug surface exposes the shared motion-intelligence first-failure pipeline', () => {
  assert.match(debug.VERSION, /phase3-debug/);
  assert.equal(typeof debug.snapshot, 'function');
  assert.equal(typeof debug.diagnosticsText, 'function');
  const text = debug.diagnosticsText();
  for (const label of [
    'Adapter loaded',
    'Contact mappings',
    'Contact anchors',
    'Root/contact correction',
    'Correction magnitude',
    'Max contact residual',
    'Kinematic validation',
    'First failing boundary',
    'Failing phase',
    'Per-phase diagnostics'
  ]) assert.match(text, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('debug wrapper captures both successful and failed Motion Spec compile results', () => {
  assert.match(source, /resetAttempt\(spec\)/);
  assert.match(source, /consumeResult\(result\)/);
  assert.match(source, /motion_contact_mapping_missing/);
  assert.match(source, /motion_contact_anchor_unresolved/);
  assert.match(source, /motion_phase_contact_unresolved/);
  assert.match(source, /motion_kinematic_validation_failed/);
  assert.match(source, /COMPILER_THROW/);
});

test('Motion Lab loads debug instrumentation after compiler and before runtime', () => {
  const compiler = bootstrap.indexOf('motion_spec_clip');
  const debugIndex = bootstrap.indexOf('motion_intelligence_debug');
  const runtime = bootstrap.indexOf('motion_lab_runtime');
  assert.ok(compiler >= 0);
  assert.ok(debugIndex > compiler);
  assert.ok(runtime > debugIndex);
});

test('debug panel is consolidated into the existing Diagnostics area', () => {
  assert.match(source, /motionLabIntelligenceDebug/);
  assert.match(source, /document\.getElementById\('stages'\)/);
  assert.match(source, /Shared Motion Intelligence — Phase 2 \/ Phase 3 Debug/);
});
