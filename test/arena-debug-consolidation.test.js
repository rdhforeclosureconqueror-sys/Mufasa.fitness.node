const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('arena debug adapter preserves legacy producer while enforcing one visible authority', () => {
  const source = read('public/arena-debug-consolidation.js');
  assert.match(source, /bridgeDebugBoard/);
  assert.match(source, /bridgeDebugToggle/);
  assert.match(source, /Arena Debug Center/);
  assert.match(source, /Copy All/);
  assert.match(source, /FIRST FAILURE/);
  assert.match(source, /MutationObserver/);
});

test('arena consolidation loader points at the adapter', () => {
  const source = read('public/arena-debug-consolidation-loader.js');
  assert.match(source, /arena-debug-consolidation\.js/);
  assert.match(source, /data-arena-debug-consolidation|arenaDebugConsolidation/);
});

test('arena camera implementation remains intact and explicit-start', () => {
  const camera = read('public/arena-camera.js');
  const ui = read('public/arena-phone-ui.js');
  assert.match(camera, /getUserMedia/);
  assert.match(camera, /CAMERA_PERMISSION/);
  assert.match(camera, /CAMERA_STREAM/);
  assert.match(camera, /BODY_DETECTOR/);
  assert.match(camera, /initMoveNetDetector/);
  assert.match(ui, /arenaEnableCamera/);
  assert.match(ui, /camera\.start/);
});
