'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('mirror debug center consolidates legacy phase panels without removing diagnostic producers', () => {
  const source = read('public/mirror-debug-center.js');
  assert.match(source, /mirrorMotion.*Debug\|Acceptance\|Controls/);
  assert.match(source, /data-mirror-debug-center-managed/);
  assert.match(source, /Mirror Debug Center/);
  assert.match(source, /First failing boundary/);
  assert.match(source, /purposeFor/);
  assert.match(source, /Phase 18/);
});

test('debug center has explicit close/minimize path and preserves acceptance authority', () => {
  const source = read('public/mirror-debug-center.js');
  assert.match(source, /data-close/);
  assert.match(source, /state\.open=false/);
  assert.match(source, /PocketPTMirrorMotionLiveAcceptanceControls/);
  assert.match(source, /controls\?\.record/);
  assert.match(source, /controls\?\.reset/);
});

test('runtime config loads consolidated diagnostics only after mirror diagnostics are present', () => {
  const source = read('public/runtime-config.js');
  assert.match(source, /mirrorDiagnosticsPresent/);
  assert.match(source, /mirror-debug-center\.js\?v=20260906-consolidated/);
  assert.match(source, /data-mirror-debug-center/);
  assert.match(source, /\[id\^="mirrorMotion"\]/);
});
