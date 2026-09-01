'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard trainer navigation injects an admin-only Movement Capture Studio entry', () => {
  const source = read('public/trainer-navigation.js');
  assert.match(source, /ADMIN_ROLES = new Set\(\["admin", "super_admin"\]\)/);
  assert.match(source, /movementCaptureStudioDashboardLink/);
  assert.match(source, /\/workout\.html\?movementCaptureStudio=1/);
  assert.match(source, /developmentLaunchCard/);
});

test('movement capture focus mode reveals the existing builder without creating a second camera', () => {
  const source = read('public/boot-core.js');
  assert.match(source, /movementCaptureStudio/);
  assert.match(source, /exerciseTemplateBuilderPanel/);
  assert.match(source, /movement-capture-studio-mode/);
  assert.match(source, /isMovementCaptureAdmin/);
  assert.match(source, /roles\.has\('admin'\) \|\| roles\.has\('super_admin'\)/);
  assert.doesNotMatch(source, /getUserMedia/);
  assert.doesNotMatch(source, /createDetector/);
});

test('focused studio preserves the canonical movement recorder -> roadmap -> studio -> debug chain', () => {
  const source = read('public/boot-core.js');
  const recorder = source.indexOf('loadTrainerMovementRecorder');
  const roadmap = source.indexOf('loadTrainerMovementRoadmap');
  const studio = source.indexOf('loadMovementCaptureStudio');
  const debug = source.indexOf('loadMovementCaptureDebug');
  assert.ok(recorder >= 0 && roadmap >= 0 && studio >= 0 && debug >= 0);
  assert.match(source, /movement-recorder\.js/);
  assert.match(source, /movement-recording-roadmap\.js/);
  assert.match(source, /movement-capture-studio\.js/);
  assert.match(source, /movement-capture-debug\.js/);
});
