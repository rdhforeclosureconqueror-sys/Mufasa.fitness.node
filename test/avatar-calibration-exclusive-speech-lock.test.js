'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const mirrorPath = path.resolve(__dirname, '../public/motion/live-avatar-mirror.js');

describe('avatar calibration exclusive speech lock', () => {
  beforeEach(() => {
    delete require.cache[mirrorPath];
    delete global.CoachRuntime;
    delete global.__POCKETPT_CALIBRATION_SPEECH_LOCK__;
    delete global.__POCKETPT_EXPLICIT_VOICE_MUTE__;
  });

  it('waits for the body-found sentence to finish before settling starts', async () => {
    const { AvatarMirrorCalibration } = require(mirrorPath);
    let now = 1000;
    let resolveSpeech;
    const spoken = [];
    const speak = (text) => {
      spoken.push(text);
      return new Promise((resolve) => { resolveSpeech = resolve; });
    };
    const calibration = new AvatarMirrorCalibration({ now: () => now, speak, stableFrames: 1, settleMs: 1500, baseHoldMs: 1500 });
    const frame = {
      timestamp: now,
      confidence: { bodyDetected: true },
      landmarks: { bodyHeightNormalized: 0.8 },
      joints: {
        left_shoulder: { confidence: 1 }, right_shoulder: { confidence: 1 },
        left_hip: { confidence: 1 }, right_hip: { confidence: 1 },
        left_ankle: { confidence: 1 }, right_ankle: { confidence: 1 }
      }
    };

    calibration.observe(frame, now);
    assert.equal(calibration.diagnostics().calibrationState, 'BODY_FOUND');
    assert.equal(calibration.diagnostics().calibrationSpeechPending, true);
    now += 5000;
    frame.timestamp = now;
    calibration.observe(frame, now);
    assert.equal(calibration.diagnostics().calibrationState, 'BODY_FOUND');

    resolveSpeech({ ok: true });
    await Promise.resolve(); await Promise.resolve();
    assert.equal(calibration.diagnostics().calibrationState, 'SETTLING');
    assert.deepEqual(spoken, ['I can see you. Get into your base position and hold still.']);
  });

  it('does not begin base capture until the full countdown utterance finishes', async () => {
    const { AvatarMirrorCalibration } = require(mirrorPath);
    let now = 0;
    const resolvers = [];
    const spoken = [];
    const calibration = new AvatarMirrorCalibration({
      now: () => now,
      speak: (text) => { spoken.push(text); return new Promise((resolve) => resolvers.push(resolve)); },
      stableFrames: 1,
      settleMs: 10,
      baseHoldMs: 20
    });
    const frame = {
      timestamp: 0,
      confidence: { bodyDetected: true },
      landmarks: { bodyHeightNormalized: 0.8 },
      joints: {
        left_shoulder: { confidence: 1 }, right_shoulder: { confidence: 1 },
        left_hip: { confidence: 1 }, right_hip: { confidence: 1 },
        left_ankle: { confidence: 1 }, right_ankle: { confidence: 1 }
      }
    };

    calibration.observe(frame, now);
    resolvers.shift()({ ok: true });
    await Promise.resolve(); await Promise.resolve();
    now = 20; frame.timestamp = now;
    calibration.observe(frame, now);
    assert.equal(calibration.diagnostics().calibrationState, 'COUNTDOWN_SPEAKING');
    assert.equal(calibration.captureEnabled(), false);
    assert.equal(spoken.at(-1), 'Taking your base position in 3... 2... 1... Hold.');

    now = 5000; frame.timestamp = now;
    calibration.observe(frame, now);
    assert.equal(calibration.captureEnabled(), false);

    resolvers.shift()({ ok: true });
    await Promise.resolve(); await Promise.resolve();
    assert.equal(calibration.diagnostics().calibrationState, 'CAPTURING_BASE');
    assert.equal(calibration.captureEnabled(), true);
  });

  it('activates coach audio/listening without the competing activateVoice announcement', async () => {
    const calls = [];
    global.CoachRuntime = {
      getState: () => ({ muted: true }),
      setMuted: (value) => calls.push(['setMuted', value]),
      unlockAudioOnce: async () => { calls.push(['unlock']); return true; },
      startListening: () => { calls.push(['startListening']); return { ok: true }; },
      activateVoice: () => { throw new Error('activateVoice must not be used during calibration'); }
    };
    const { activateCanonicalCoachVoice } = require(mirrorPath);
    const result = await activateCanonicalCoachVoice();
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [['setMuted', false], ['unlock'], ['startListening']]);
  });

  it('uses conversation-owned calibration speech so existing Mufasa stop recognition can interrupt it', async () => {
    const calls = [];
    global.CoachRuntime = {
      getState: () => ({ muted: false }),
      speak: async (text, source, options) => {
        calls.push({ text, source, options });
        return { ok: true };
      }
    };
    const { AvatarCalibrationSpeechArbiter } = require(mirrorPath);
    const arbiter = new AvatarCalibrationSpeechArbiter();
    const result = await arbiter.queue('Hold still.');
    assert.equal(result.ok, true);
    assert.equal(calls[0].source, 'conversation-avatar-calibration');
    assert.equal(calls[0].options.owner, 'avatar_calibration');
    assert.equal(calls[0].options.interruptible, true);
  });

  it('treats a cancelled coach response as Mufasa stop and prevents queued speech from continuing', async () => {
    const stopped = [];
    global.CoachRuntime = {
      getState: () => ({ muted: false }),
      speak: async () => ({ cancelled: true }),
      stopAllSpeech: (reason) => stopped.push(reason)
    };
    const { AvatarCalibrationSpeechArbiter } = require(mirrorPath);
    const arbiter = new AvatarCalibrationSpeechArbiter();
    const result = await arbiter.queue('Taking your base position now.');
    assert.equal(result.reason, 'mufasa_stop');
    assert.deepEqual(stopped, ['mufasa_stop']);
    const later = await arbiter.queue('This must not play.');
    assert.equal(later.reason, 'calibration_speech_stopped');
  });

  it('supports an explicit calibration stop that clears speech and releases the lock', () => {
    const calls = [];
    global.CoachRuntime = {
      getState: () => ({ muted: false }),
      stopAllSpeech: (reason) => calls.push(reason)
    };
    const { AvatarCalibrationSpeechArbiter } = require(mirrorPath);
    const arbiter = new AvatarCalibrationSpeechArbiter();
    global.__POCKETPT_CALIBRATION_SPEECH_LOCK__ = true;
    const result = arbiter.stop('mufasa_stop');
    assert.equal(result.ok, true);
    assert.deepEqual(calls, ['mufasa_stop']);
    assert.equal(global.__POCKETPT_CALIBRATION_SPEECH_LOCK__, false);
  });
});
