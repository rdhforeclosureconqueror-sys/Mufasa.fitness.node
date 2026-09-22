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
  assert.match(ui, /motionState\.calibrationReady \|\| motionState\.requireRestBase === false/);
  assert.match(live, /requireRestBase = true/);
  assert.match(live, /PUSHUP_DIRECT_CALIBRATION/);
  assert.match(live, /onRestReady\(\)/);
});


test('arena recognizes explicit manual TOP and BOTTOM capture commands with spoken success or failure', () => {
  const ui = read('public/arena-phone-ui.js');
  const coach = read('public/arena-coach-runtime.js');
  assert.match(ui, /manualCapture\?\.\(latestPoseFrame/);
  assert.match(ui, /Capture top successful/);
  assert.match(ui, /Capture top failed/);
  assert.match(ui, /Capture bottom successful/);
  assert.match(ui, /Capture bottom failed/);
  assert.match(coach, /capture top\|top capture\|capture bottom\|bottom capture/);
});


test('arena owns setup speech so generic full-body pose announcements cannot starve capture commands', () => {
  const ui = read('public/arena-phone-ui.js');
  const pose = read('public/pose-runtime.js');
  assert.match(ui, /__POCKETPT_ARENA_EXERCISE_VOICE__ = true/);
  assert.match(ui, /__POCKETPT_ARENA_EXERCISE_VOICE__ = false/);
  assert.match(pose, /ARENA_EXERCISE_VOICE_OWNER/);
});


test('arena serializes calibration speech instead of dropping cues during active speech', () => {
  const ui = read('public/arena-phone-ui.js');
  assert.match(ui, /function queueArenaSpeech/);
  assert.match(ui, /while \(runtime\.getState\?\.\(\)\.activeSpeech\)/);
  assert.match(ui, /queueArenaSpeech\(cue, 'arena-calibration'/);
  assert.match(ui, /ARENA_SPEECH_DRAIN_TIMEOUT/);
  assert.match(ui, /ARENA_SPEECH_\$\{String\(result\.reason/);
  assert.doesNotMatch(ui, /if \(cue\) root\.CoachRuntime\?\.speak/);
});


test('reset recovery restarts calibration before speech and restores listening', () => {
  const ui = read('public/arena-phone-ui.js');
  const coach = read('public/arena-coach-runtime.js');
  assert.match(ui, /RESET_COMMAND_MATCHED_/);
  assert.match(ui, /restartPoseCapture\(\{restartCamera:false, source:'voice'\}\)/);
  assert.match(ui, /CALIBRATION_STARTED_/);
  assert.match(ui, /WAITING_FOR_FRESH_POSE/);
  assert.match(ui, /FRESH_POSE_REACQUIRED/);
  assert.match(ui, /ensureArenaListening\('post_reset_speech'\)/);
  assert.match(ui, /startResult\?\.ok !== false/);
  assert.match(ui, /!after\.lastMicError/);
  assert.match(ui, /LISTENER_FAILED_/);
  const resetBranch = ui.slice(ui.indexOf("if (['reset','restart','start over','restart everything']"));
  assert.ok(resetBranch.indexOf('restartPoseCapture') < resetBranch.indexOf("queueArenaSpeech('Reset complete"));
  assert.match(coach, /__POCKETPT_ARENA_LAST_RESET_TRANSCRIPT__/);
});


test('athlete READY gates every three-second calibration capture', () => {
  const ui = read('public/arena-phone-ui.js');
  const calibration = read('public/arena-pose-calibration.js');
  assert.match(calibration, /WAIT_TOP_READY/);
  assert.match(calibration, /WAIT_BOTTOM_READY/);
  assert.match(calibration, /WAIT_TOP_CONFIRM_READY/);
  assert.match(calibration, /function beginReadyCapture/);
  assert.match(ui, /Capturing position\. Three\. Two\. One\./);
  assert.match(ui, /calibration\.beginReadyCapture/);
  assert.match(ui, /Get into your top push-up position\. Say ready when you are ready\./);
  assert.match(ui, /Top position captured\. Lower into your bottom position\. Say ready when you are ready\./);
  assert.match(ui, /Bottom position captured\. Return to your top position\. Say ready when you are ready\./);
});


test('READY changes calibration state before coach TTS and restores listening after speech', () => {
  const ui = read('public/arena-phone-ui.js');
  const coach = read('public/arena-coach-runtime.js');
  const ready = ui.slice(ui.indexOf("if (['ready','i am ready','im ready']"), ui.indexOf("if (['capture','capture top'"));
  assert.ok(ready.indexOf('calibration.beginReadyCapture') < ready.indexOf("queueArenaSpeech('Capturing position"));
  assert.match(ready, /READY_COMMAND_ACCEPTED_/);
  assert.match(ready, /post_ready_speech/);
  assert.match(coach, /__POCKETPT_ARENA_LAST_READY_TRANSCRIPT__/);
});
