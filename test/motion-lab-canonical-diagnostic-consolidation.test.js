'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const consolidator = read('public/motion/motion-lab-diagnostic-consolidator.js');
const bootstrap = read('motion-lab/motion-lab-bootstrap.js');

test('canonical diagnostic copy combines legacy stages and Motion Intelligence truth', () => {
  assert.match(consolidator, /MOTION LAB DIAGNOSTIC — CONSOLIDATED/);
  assert.match(consolidator, /legacyDiagnosticsText\(\)/);
  assert.match(consolidator, /PocketPTMotionIntelligenceDiagnostics\?\.diagnosticsText/);
  assert.match(consolidator, /BOOTSTRAP DELIVERY/);
  assert.match(consolidator, /First failing boundary: MOTION_INTELLIGENCE_DIAGNOSTICS_UNAVAILABLE/);
});

test('existing Copy Diagnostic Summary button becomes the one canonical copy control', () => {
  assert.match(consolidator, /getElementById\?\.\('copySummary'\)/);
  assert.match(consolidator, /Copy Full Diagnostic Summary/);
  assert.match(consolidator, /stopImmediatePropagation\(\)/);
  assert.match(consolidator, /addEventListener\('click',[\s\S]*true\)/);
  assert.match(consolidator, /copyMotionIntelligenceDiagnostics/);
  assert.match(consolidator, /oldCopy\.remove\(\)/);
});

test('Motion Intelligence is moved into the existing Diagnostics column', () => {
  assert.match(consolidator, /getElementById\?\.\('stages'\)/);
  assert.match(consolidator, /closest\?\.\('table'\)\?\.parentElement/);
  assert.match(consolidator, /motionIntelligenceDiagnosticsHeading/);
  assert.match(consolidator, /canonicalMotionLabDiagnosticText/);
  assert.match(consolidator, /Diagnostic UI build:/);
});

test('bootstrap loads and installs the consolidator after Motion Lab runtime', () => {
  const runtime = bootstrap.indexOf('/dev/motion-lab-runtime.js');
  const consolidatorIndex = bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-diagnostic-consolidator.js');
  const lunge = bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js');
  assert.ok(runtime >= 0);
  assert.ok(consolidatorIndex > runtime);
  assert.ok(lunge > consolidatorIndex);
  assert.match(bootstrap, /diagnostic_consolidator_install/);
  assert.match(bootstrap, /motion_lab_diagnostic_consolidator_install_failed/);
  assert.match(bootstrap, /PocketPTMotionLabDiagnosticConsolidator\?\.refresh/);
});
