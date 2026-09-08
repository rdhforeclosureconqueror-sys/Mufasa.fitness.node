'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const guard = read('public/motion/motion-lab-pose-editor-preview-guard.js');
const index = read('motion-lab/index.html');

test('pose editor preview truth guard prevents silent multi-phase preview/export divergence', () => {
  assert.match(guard, /exportAdjustment/);
  assert.match(guard, /editedPhases\.length !== 1/);
  assert.match(guard, /select\.value === activeEditedPhase/);
  assert.match(guard, /stopImmediatePropagation\(\)/);
  assert.match(guard, /preview and export cannot disagree/);
});

test('phase guard restores the active edited phase instead of silently switching', () => {
  assert.match(guard, /select\.value = activeEditedPhase/);
  assert.match(guard, /Reset Phase\/Reset All before editing another phase/);
});

test('guard is loaded before Motion Lab bootstrap so it owns capture-phase UI truth', () => {
  const guardIndex = index.indexOf('/dev/motion-lab-assets/motion-lab-pose-editor-preview-guard.js');
  const bootstrapIndex = index.indexOf('/dev/motion-lab-bootstrap.js');
  assert.ok(guardIndex >= 0);
  assert.ok(bootstrapIndex > guardIndex);
});
