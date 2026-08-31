const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'workout-presentation-state.js'), 'utf8');

test('WorkoutPresentationState is the single visible presentation authority', () => {
  assert.match(source, /SINGLE PRESENTATION AUTHORITY/);
  assert.match(source, /modes:\s*Object\.freeze\(\['camera', 'avatar_overlay', 'avatar_only'\]\)/);
  assert.match(source, /data.*avatarPresentationOwner|avatarPresentationOwner/);
  assert.match(source, /WorkoutPresentationState/);
  assert.match(source, /setPresentationMode/);
  assert.match(source, /MutationObserver/);
});

test('camera, avatar overlay, and avatar only project distinct visible layers', () => {
  assert.match(source, /next === 'avatar_only' \? 'hidden' : 'visible'/);
  assert.match(source, /next === 'camera' \? 'none' : 'block'/);
  assert.match(source, /next === 'camera' \? 'hidden' : 'visible'/);
});

test('avatar-only background is centralized and can be overridden intentionally', () => {
  assert.match(source, /avatar_only:\s*'linear-gradient/);
  assert.match(source, /function setBackground\(/);
  assert.match(source, /backgroundOverride/);
  assert.match(source, /getConfig/);
});

test('presentation mode choice persists under one dedicated storage key', () => {
  assert.match(source, /pocketpt\.avatarPresentationMode\.v2/);
  assert.match(source, /persistMode/);
  assert.match(source, /storedMode/);
});
