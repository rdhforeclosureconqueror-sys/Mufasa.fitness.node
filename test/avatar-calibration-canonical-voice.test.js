const test = require('node:test');
const assert = require('node:assert/strict');

function freshMirrorModule() {
  const path = require.resolve('../public/motion/live-avatar-mirror');
  delete require.cache[path];
  return require(path);
}

test('avatar calibration routes speech through canonical CoachRuntime when available', async () => {
  const calls = [];
  global.CoachRuntime = {
    speak(text, source) {
      calls.push({ text, source });
      return Promise.resolve({ ok: true, backend: true });
    },
    activateVoice() {
      calls.push({ activate: true });
      return Promise.resolve({ ok: true, listening: true });
    }
  };
  const { canonicalCoachSpeak, activateCanonicalCoachVoice } = freshMirrorModule();
  assert.equal(canonicalCoachSpeak('Step back so I can see your full body.'), true);
  const activation = await activateCanonicalCoachVoice();
  await Promise.resolve();
  assert.deepEqual(calls[0], { text: 'Step back so I can see your full body.', source: 'avatar-calibration' });
  assert.deepEqual(calls[1], { activate: true });
  assert.equal(activation.ok, true);
  delete global.CoachRuntime;
});

test('canonical voice activation reports unavailable runtime without throwing', async () => {
  delete global.CoachRuntime;
  const { activateCanonicalCoachVoice } = freshMirrorModule();
  const result = await activateCanonicalCoachVoice();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'coach_runtime_unavailable');
});
