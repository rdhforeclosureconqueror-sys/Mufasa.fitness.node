'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const debugSource = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-intelligence-debug.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');

test('Phase 3 debug panel exposes first-failure and shared constraint evidence', () => {
  assert.match(debugSource, /First failing boundary:/);
  assert.match(debugSource, /phaseConstraintDiagnostics/);
  assert.match(debugSource, /correctionMagnitudeWorldUnits/);
  assert.match(debugSource, /maxResidualWorldUnits/);
  assert.match(debugSource, /missingContacts/);
  assert.match(debugSource, /Kinematic validation applied:/);
  assert.match(debugSource, /Contact lock applied:/);
});

test('Phase 3 debug panel has one copyable consolidated text surface', () => {
  assert.match(debugSource, /motionIntelligenceDebugPanel/);
  assert.match(debugSource, /motionIntelligenceDebugText/);
  assert.match(debugSource, /Copy Motion Intelligence Debug/);
  assert.match(debugSource, /navigator\.clipboard/);
});

test('debug integration wraps rather than mutates frozen MotionLabRuntime', () => {
  assert.match(debugSource, /Object\.freeze\(\{/);
  assert.match(debugSource, /\.\.\.runtime/);
  assert.match(debugSource, /loadMotionSpec: async function debugObservedLoadMotionSpec/);
  assert.doesNotMatch(debugSource, /runtime\.loadMotionSpec\s*=/);
});

test('bootstrap installs Phase 3 debug wrapper after runtime and before lunge preview', () => {
  const runtimeIndex = bootstrapSource.indexOf('/dev/motion-lab-runtime.js');
  const debugIndex = bootstrapSource.indexOf('/dev/motion-lab-assets/motion-lab-intelligence-debug.js');
  const lungeIndex = bootstrapSource.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js');
  assert.ok(runtimeIndex >= 0);
  assert.ok(debugIndex > runtimeIndex);
  assert.ok(lungeIndex > debugIndex);
  assert.match(bootstrapSource, /motion_intelligence_debug_install/);
  assert.match(bootstrapSource, /__motionIntelligenceDebugInstalled/);
  assert.match(bootstrapSource, /window\.MotionLabRuntime=debugRuntime/);
});
