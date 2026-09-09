'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const controls = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-local-playback-controls.js'), 'utf8');
const guard = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-pose-editor-preview-guard.js'), 'utf8');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

test('local playback controls load through the protected Motion Lab asset route', () => {
  assert.match(guard, /\/dev\/motion-lab-assets\/motion-lab-local-playback-controls\.js/);
  assert.match(server, /app\.get\("\/dev\/motion-lab-assets\/:filename"/);
  assert.match(server, /\^\[a-z0-9-\]\+\\\.js\$/);
});

test('viewer-local bar provides requested transport controls plus timeline scrubbing', () => {
  for (const id of [
    'localPlaybackBack', 'localPlaybackPlay', 'localPlaybackPause',
    'localPlaybackStop', 'localPlaybackRestart', 'localPlaybackForward',
    'localPlaybackScrubber'
  ]) assert.match(controls, new RegExp(id));
  assert.match(controls, /STEP_SECONDS = 0\.10/);
  assert.match(controls, /session\.mixer\.setTime\?\.\(time\)/);
  assert.match(controls, /host\.appendChild\(bar\)/);
});

test('local bar reuses the Pose Editor active session instead of creating a second playback authority', () => {
  assert.match(controls, /PocketPTMotionLabPoseEditor\?\.getActiveSession/);
  assert.doesNotMatch(controls, /new\s+.*AnimationMixer/);
  assert.doesNotMatch(controls, /createMotionSession\s*\(/);
  assert.doesNotMatch(controls, /clipAction\s*\(/);
});

test('Play builds adjusted preview when needed but resumes a matching paused adjusted preview', () => {
  assert.match(controls, /const signature = adjustedSignature\(\)/);
  assert.match(controls, /isAdjustedPreview\(session\) && signature === lastAdjustedSignature/);
  assert.match(controls, /return session\.play\?\.\(\)/);
  assert.match(controls, /PocketPTMotionLabPoseEditor\?\.playAdjustedPreview/);
  assert.match(controls, /lastAdjustedSignature = signature/);
});

test('Restart with pending edits intentionally rebuilds adjusted preview from the beginning', () => {
  assert.match(controls, /function restart\(\)/);
  assert.match(controls, /const out = root\.PocketPTMotionLabPoseEditor\?\.playAdjustedPreview/);
});

test('camera inspection remains independent from local playback transport', () => {
  assert.doesNotMatch(controls, /camera\.position|camera\.rotation|setFront|setBack|setLeft|setRight/);
});