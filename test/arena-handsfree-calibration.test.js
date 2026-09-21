const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('arena hands-free setup exposes reset ready start commands and side-view flow', () => {
  const ui = read('public/arena-phone-ui.js');
  const flow = read('public/arena-phone-flow.js');
  assert.match(ui, /\['reset','restart','start over','restart everything'\]/);
  assert.match(ui, /\['ready','i am ready','im ready'\]/);
  assert.match(ui, /\['start','go','begin'\].*challengeArmed/s);
  assert.match(ui, /Three\. Two\. One\. Go\./);
  assert.match(ui, /pocketpt:pushup-start-requested/);
  assert.match(flow, /Turn sideways to the camera/);
  assert.match(flow, /shoulder, elbow, wrist, hip and ankle visible/);
});

test('active coach speech ignores non-stop recognition regardless of conversation state', () => {
  const source = read('public/coach-runtime.js');
  assert.match(source, /if \(activeSpeech\) \{/);
  assert.doesNotMatch(source, /if \(activeSpeech && state\.conversationActive\)/);
  assert.match(source, /speech\.transcript_ignored_during_response/);
  assert.match(source, /cancelActiveSpeech\("member-stop"/);
});

test('calibration remains a single-side chain and uses a short setup hold', () => {
  const source = read('public/arena-pose-calibration.js');
  assert.match(source, /const NAMES = \['shoulder', 'elbow', 'wrist', 'hip', 'ankle'\]/);
  assert.match(source, /const STABLE_MS = 700/);
  assert.match(source, /bodyLine/);
  assert.match(source, /elbowDepth/);
});


test('push-up arena bypasses standing rest-base calibration and keeps recognition live', () => {
  const ui = read('public/arena-phone-ui.js');
  const live = read('public/arena-live-motion-adapter.js');
  assert.match(ui, /requireRestBase:false/);
  assert.match(ui, /CoachRuntime\?\.startListening/);
  assert.match(live, /requireRestBase = true/);
  assert.match(live, /PUSHUP_DIRECT_CALIBRATION/);
  assert.match(live, /onRestReady\(\)/);
});
