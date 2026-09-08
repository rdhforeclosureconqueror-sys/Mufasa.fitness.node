'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const source = read('public/motion/motion-lab-adjusted-preview-persistence.js');
const bootstrap = read('motion-lab/motion-lab-bootstrap.js');

function loadModule() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.PocketPTMotionLabAdjustedPreviewPersistence;
}

function quaternionTrack(name, values) {
  return { name, times: new Float32Array([0, 0.5, 1]), values: new Float32Array(values) };
}

function positionTrack(name, values) {
  return { name, times: new Float32Array([0, 0.5, 1]), values: new Float32Array(values) };
}

test('adjusted preview persistence is installed after Pose Editor and before Motion Lab runtime', () => {
  const editor = bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-pose-editor.js');
  const persistence = bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-adjusted-preview-persistence.js');
  const runtime = bootstrap.indexOf('/dev/motion-lab-runtime.js');
  assert.ok(editor >= 0 && persistence > editor && runtime > persistence);
  assert.match(bootstrap, /adjusted_preview_persistence_install/);
  assert.match(bootstrap, /motion_lab_adjusted_preview_persistence_install_failed/);
});

test('position correction is converted from one edited keyframe into a persistent clip delta', () => {
  const persistence = loadModule();
  const canonical = {
    tracks: [positionTrack('mixamorig:LeftFoot.position', [
      0, 0, 0,
      1, 0, 0,
      2, 0, 0
    ])]
  };
  const preview = {
    name: 'lunge [POSE EDIT PREVIEW]',
    tracks: [positionTrack('mixamorig:LeftFoot.position', [
      0, 0, 0,
      1, 0.25, 0,
      2, 0, 0
    ])]
  };

  const out = persistence.composePersistentPreview(canonical, preview);
  assert.equal(out.status, 'ready');
  assert.equal(out.changedTracks, 1);
  assert.deepEqual(Array.from(preview.tracks[0].values), [
    0, 0.25, 0,
    1, 0.25, 0,
    2, 0.25, 0
  ]);
  assert.equal(persistence.snapshot().lastWriter, 'adjusted_preview_persistence');
});

test('quaternion correction is composed onto every animation sample instead of only the nearest keyframe', () => {
  const persistence = loadModule();
  const identity = [0, 0, 0, 1];
  const ninetyZ = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
  const canonical = {
    tracks: [quaternionTrack('mixamorig:LeftLeg.quaternion', [
      ...identity,
      ...identity,
      ...identity
    ])]
  };
  const preview = {
    name: 'lunge [POSE EDIT PREVIEW]',
    tracks: [quaternionTrack('mixamorig:LeftLeg.quaternion', [
      ...identity,
      ...ninetyZ,
      ...identity
    ])]
  };

  const out = persistence.composePersistentPreview(canonical, preview);
  assert.equal(out.status, 'ready');
  assert.equal(out.changedTracks, 1);
  const values = Array.from(preview.tracks[0].values);
  for (let sample = 0; sample < 3; sample += 1) {
    const offset = sample * 4;
    assert.ok(Math.abs(values[offset + 2] - Math.SQRT1_2) < 1e-5);
    assert.ok(Math.abs(values[offset + 3] - Math.SQRT1_2) < 1e-5);
  }
});

test('persistence diagnostics expose first-failure boundary and final skeleton-writer identity', () => {
  const persistence = loadModule();
  const failed = persistence.composePersistentPreview(null, null);
  assert.equal(failed.status, 'failed');
  assert.equal(persistence.snapshot().firstFailingBoundary, 'preview_tracks_available');
  assert.equal(persistence.snapshot().lastWriter, null);
});