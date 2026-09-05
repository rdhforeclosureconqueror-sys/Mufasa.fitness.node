const test = require('node:test');
const assert = require('node:assert/strict');

function freshMirrorModule() {
  const path = require.resolve('../public/motion/live-avatar-mirror');
  delete require.cache[path];
  return require(path);
}

test('avatar calibration routes speech through canonical CoachRuntime without starting recognition', async () => {
  const calls = [];
  global.__POCKETPT_EXPLICIT_VOICE_MUTE__ = false;
  global.CoachRuntime = {
    getState() { return { muted: false, listening: true }; },
    speak(text, source) {
      calls.push({ type: 'speak', text, source });
      return Promise.resolve({ ok: true, backend: true });
    },
    stopAllSpeech(reason) { calls.push({ type: 'stopAllSpeech', reason }); },
    stopListening() { calls.push({ type: 'stopListening' }); },
    setMuted(value) { calls.push({ type: 'setMuted', value }); },
    unlockAudioOnce() { calls.push({ type: 'unlockAudioOnce' }); return Promise.resolve(true); },
    startListening() { calls.push({ type: 'startListening' }); return { ok: true }; }
  };
  const { canonicalCoachSpeak, activateCanonicalCoachVoice } = freshMirrorModule();
  const speech = await canonicalCoachSpeak('Step back so I can see your full body.');
  assert.equal(speech.ok, true);
  const activation = await activateCanonicalCoachVoice();
  assert.equal(activation.ok, true);
  assert.equal(activation.calibrationExclusive, true);
  assert.deepEqual(calls.find((call) => call.type === 'speak'), {
    type: 'speak',
    text: 'Step back so I can see your full body.',
    source: 'avatar-calibration'
  });
  assert.ok(calls.some((call) => call.type === 'stopListening'));
  assert.equal(calls.some((call) => call.type === 'startListening'), false);
  delete global.CoachRuntime;
  delete global.__POCKETPT_EXPLICIT_VOICE_MUTE__;
});

test('canonical voice resume starts recognition only after explicit post-calibration handoff', async () => {
  let listening = false;
  let starts = 0;
  global.__POCKETPT_EXPLICIT_VOICE_MUTE__ = false;
  global.CoachRuntime = {
    getState() { return { muted: false, listening }; },
    startListening() { starts += 1; listening = true; return { ok: true }; }
  };
  const { resumeCanonicalCoachVoice } = freshMirrorModule();
  const first = await resumeCanonicalCoachVoice();
  const second = await resumeCanonicalCoachVoice();
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.alreadyListening, true);
  assert.equal(starts, 1);
  delete global.CoachRuntime;
  delete global.__POCKETPT_EXPLICIT_VOICE_MUTE__;
});

test('canonical calibration voice helpers report unavailable runtime without throwing', async () => {
  delete global.CoachRuntime;
  const { activateCanonicalCoachVoice, resumeCanonicalCoachVoice } = freshMirrorModule();
  const activation = await activateCanonicalCoachVoice();
  const resume = await resumeCanonicalCoachVoice();
  assert.equal(activation.ok, false);
  assert.equal(activation.reason, 'coach_runtime_unavailable');
  assert.equal(resume.ok, false);
  assert.equal(resume.reason, 'coach_runtime_unavailable');
});
