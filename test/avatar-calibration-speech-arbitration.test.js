const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'motion', 'live-avatar-mirror.js'), 'utf8');

test('avatar calibration uses a serialized speech arbiter', () => {
  assert.match(source, /class AvatarCalibrationSpeechArbiter/);
  assert.match(source, /queue\(text/);
  assert.match(source, /this\.tail = this\.tail\.then/);
});

test('calibration countdown is one utterance', () => {
  assert.match(source, /Taking your base position in 3\.\.\. 2\.\.\. 1\.\.\. Hold\./);
  assert.doesNotMatch(source, /this\.cue\("2\."\)/);
  assert.doesNotMatch(source, /this\.cue\("1\."\)/);
});

test('explicit mute prevents calibration auto-reactivation', () => {
  assert.match(source, /coach_runtime_muted/);
  assert.match(source, /runtime\.getState\?\.\(\)\.muted/);
});

test('429 or rate-limit response enters cooldown', () => {
  assert.match(source, /rate_limited/i);
  assert.match(source, /cooldownUntil/);
});
