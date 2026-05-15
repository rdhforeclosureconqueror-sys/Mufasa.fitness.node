const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createSessionWriteClient } = require('../public/session-write.js');

const repoRoot = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

test('Phase 14 Start Workout session write uses backend origin and bearer auth', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options, body: JSON.parse(options.body || '{}') });
    return { ok: true, status: 201, json: async () => ({ ok: true, data: { sessionId: 'sess_phase14' } }) };
  };
  try {
    const client = createSessionWriteClient({
      baseUrl: 'https://mufasa-fitness-node.onrender.com',
      commandUrl: 'https://mufasa-fitness-node.onrender.com/command',
      getUserId: () => 'pilot_user',
      getAuthToken: () => 'maat-token'
    });
    const result = await client.startSession({ exerciseId: 'bodyweight_squat' });
    assert.equal(result.sessionId, 'sess_phase14');
    assert.equal(calls[0].url, 'https://mufasa-fitness-node.onrender.com/api/sessions');
    assert.equal(calls[0].options.headers.authorization, 'Bearer maat-token');
  } finally {
    global.fetch = originalFetch;
  }
});

test('Phase 14 Start Workout fallback keeps Bodyweight Squat available without assigned program', () => {
  const source = read('public/workout-progression-runtime.js');
  assert.match(source, /function createDefaultLiveWorkoutSelection\(\)/);
  assert.match(source, /source: 'live-workout-default'/);
  assert.match(source, /exerciseId: 'bodyweight_squat'/);
  assert.match(source, /name: 'Bodyweight Squat'/);
  assert.match(source, /hydrateActiveWorkoutPlan\(\{ allowDefault: true \}\)/);
});

test('Phase 14 Expand Camera surfaces connect-camera-first instead of silently doing nothing', () => {
  const source = read('public/runtime-orchestrator.js');
  assert.match(source, /Connect camera first\./);
  assert.match(source, /fullscreenCameraBtn\) refs\.fullscreenCameraBtn\.onclick/);
  assert.match(source, /global\.WorkoutRuntime\?\.getState\?\.\(\)\.cameraActive/);
});

test('Phase 14 OHSA and Start Workout normalize missing pose runtime to a visible detector error', () => {
  const source = read('public/index.html');
  assert.match(source, /async function ensureLivePoseDetectorReady\(\)/);
  assert.match(source, /Pose detection unavailable\. Check model\/runtime load\./);
  assert.match(source, /ensureDetectorReady: ensureLivePoseDetectorReady/);
  assert.match(source, /window\.AssessmentRuntime\?\.configure\?\.\(/);
});

test('Phase 14 live guidance prompts step back at most three times, then waits silently', () => {
  const source = read('public/index.html');
  assert.match(source, /Step back so I can see your full body\./);
  assert.match(source, /Waiting for full body in frame\./);
  assert.match(source, /stepBackPromptCount < 3/);
  assert.match(source, /fullBodyWaitingShown/);
  assert.match(source, /Full body in frame\. Tracking started\./);
});

test('Phase 14 pose frames feed rep analysis and Bodyweight Squat has a rep path', () => {
  const index = read('public/index.html');
  const repAnalysis = read('public/rep-analysis-runtime.js');
  assert.match(index, /RepAnalysisRuntime\.processPoseFrame\(\{ pose, posePacket \}\)/);
  assert.match(repAnalysis, /exerciseId:[\s\S]*'bodyweight_squat'/);
  assert.match(repAnalysis, /DOWN_DEPTH_THRESHOLD/);
  assert.match(repAnalysis, /state\.repCount \+= 1/);
});

test('Phase 14 wake-word support detects unsupported Safari/iPhone browsers clearly', () => {
  const source = read('public/coach-runtime.js') + read('public/index.html');
  assert.match(source, /SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  assert.match(source, /hey coach/);
  assert.match(source, /mufasa/);
  assert.match(source, /On iPhone\/Safari, Web Speech API dictation may be unavailable\./);
});

test('Phase 14 chat payload matches Node proxy shape and keeps 422 trace visible', () => {
  const source = read('public/coach-runtime.js');
  assert.match(source, /session_id: sessionId/);
  assert.match(source, /context: contextPayload/);
  assert.match(source, /mode,/);
  assert.match(source, /\[COACH_BACKEND_TRACE\] \/ask validation error/);
});
