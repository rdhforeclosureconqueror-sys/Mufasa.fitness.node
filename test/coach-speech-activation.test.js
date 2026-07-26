'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../public/coach-runtime.js'), 'utf8');

function harness({ conversationTimeoutMs = 25000, conversationWarningMs, conversationWarningEnabled } = {}) {
  const events = [];
  const recognizers = [];
  let fetches = 0;
  class Recognition {
    constructor() { this.starts = 0; recognizers.push(this); }
    start() { this.starts += 1; events.push('recognition-start'); this.onstart?.({}); }
    stop() { this.onend?.({}); }
  }
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createOscillator() { return { connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    async resume() { events.push('audio-resume'); }
  }
  const player = {
    currentTime: 0,
    autoEnd: true,
    pauses: 0,
    pause() { this.pauses += 1; },
    async play() { events.push('speech-play'); if (this.autoEnd) queueMicrotask(() => this.onended?.()); }
  };
  const scope = {
    location: { search: '' },
    document: { getElementById: () => null, createElement: () => player, body: { appendChild() {} } },
    navigator: {}, SpeechRecognition: Recognition, AudioContext, AbortController, URLSearchParams,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    fetch: async () => {
      fetches += 1;
      events.push(`fetch-muted-${scope.CoachRuntime.getState().muted}`);
      return { ok: true, blob: async () => ({ size: 1 }), headers: { get: () => 'audio/mpeg' } };
    },
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    setTimeout, clearTimeout, queueMicrotask
  };
  scope.window = scope;
  scope.globalThis = scope;
  vm.runInNewContext(source, scope);
  scope.CoachRuntime.configure({ refs: { ttsPlayer: player }, deps: { voiceUrl: '/api/speak', conversationTimeoutMs, conversationWarningMs, conversationWarningEnabled, dispatchCommand: (message) => events.push(`command-${message}`) } });
  return { runtime: scope.CoachRuntime, events, recognizers, player, scope, fetches: () => fetches };
}

async function activeConversationSpeech() {
  const h = harness();
  await h.runtime.activateVoice();
  const recognizer = h.recognizers[0];
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa' }]] });
  await new Promise((resolve) => setImmediate(resolve));
  h.player.autoEnd = false;
  const speech = h.runtime.speak('This is a deliberately long conversational response.', 'llm');
  await new Promise((resolve) => setImmediate(resolve));
  return { ...h, recognizer, speech };
}

test('Voice On preserves startup mute and unmutes before its single speech prime', async () => {
  const h = harness();
  assert.equal(h.runtime.getState().muted, true);
  const result = await h.runtime.activateVoice();
  assert.equal(result.ok, true);
  assert.equal(h.runtime.getState().muted, false);
  assert.equal(h.fetches(), 1);
  assert.ok(h.events.indexOf('fetch-muted-false') < h.events.indexOf('recognition-start'));
  assert.equal(h.events.filter((event) => event === 'speech-play').length, 1);
});

test('concurrent Voice On actions share activation and never duplicate recognizers or speech', async () => {
  const h = harness();
  await Promise.all([h.runtime.activateVoice(), h.runtime.activateVoice()]);
  assert.equal(h.recognizers.length, 1);
  assert.equal(h.recognizers[0].starts, 1);
  assert.equal(h.fetches(), 1);
  await h.runtime.activateVoice();
  assert.equal(h.fetches(), 1);
  assert.equal(h.recognizers[0].starts, 1);
});

test('wake phrase dispatches intent and a normal recognition end restarts the singleton', async () => {
  const h = harness();
  await h.runtime.activateVoice();
  const recognizer = h.recognizers[0];
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa start my workout' }]] });
  assert.ok(h.events.includes('command-start my workout'));
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Pause' }]] });
  assert.ok(h.events.includes('command-Pause'));
  recognizer.onend();
  assert.equal(recognizer.starts, 2);
  assert.equal(h.recognizers.length, 1);
  assert.ok(h.runtime.getSpeechTrace().some((entry) => entry.module === 'stt' && entry.event === 'result'));
});

test('wake-only greeting opens a session and recognition resumes after its single response', async () => {
  const h = harness();
  await h.runtime.activateVoice();
  const recognizer = h.recognizers[0];
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa' }]] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.runtime.getState().conversationState, 'LISTENING');
  assert.equal(h.fetches(), 2);
  assert.equal(h.recognizers.length, 1);
  assert.equal(recognizer.starts, 1);
  assert.equal(h.events.filter((event) => event === 'speech-play').length, 2);
});

test('inactivity timeout returns the conversation to idle and requires a new wake phrase', async () => {
  const h = harness({ conversationTimeoutMs: 20 });
  await h.runtime.activateVoice();
  const recognizer = h.recognizers[0];
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa start my workout' }]] });
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(h.runtime.getState().conversationState, 'IDLE');
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Pause' }]] });
  assert.equal(h.events.filter((event) => event === 'command-Pause').length, 0);
});

test('goodbye exits the session and Voice Off exits immediately', async () => {
  const h = harness();
  await h.runtime.activateVoice();
  const recognizer = h.recognizers[0];
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa start my workout' }]] });
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'goodbye' }]] });
  assert.equal(h.runtime.getState().conversationState, 'IDLE');
  assert.equal(h.runtime.getState().listening, true);
  recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa pause' }]] });
  assert.equal(h.runtime.getState().conversationActive, true);
  h.runtime.stopListening();
  assert.equal(h.runtime.getState().conversationState, 'IDLE');
  assert.equal(h.runtime.getState().listening, false);
});

test('ordinary and false-positive speech is ignored without dispatching or cancelling active output', async () => {
  for (const phrase of ['pause', 'do not stop', "don't stop", 'keep going and don\'t stop', 'stopwatch', 'stopping', 'I stopped earlier', 'my workout stopped']) {
    const h = await activeConversationSpeech();
    const pausesBefore = h.player.pauses;
    h.recognizer.onresult({ resultIndex: 0, results: [[{ transcript: phrase }]] });
    assert.equal(h.player.pauses, pausesBefore, phrase);
    assert.equal(h.events.some((event) => event.startsWith('command-')), false, phrase);
    assert.equal(h.runtime.getState().activeSpeech.source, 'conversation');
    h.player.onended();
    await h.speech;
  }
});

test('standalone stop variants cancel only the active response, acknowledge once, and keep follow-up listening', async () => {
  for (const phrase of ['stop', 'stop.', 'stop!', 'Mufasa stop', 'Hey Mufasa stop', 'coach stop']) {
    const h = await activeConversationSpeech();
    const fetchesBefore = h.fetches();
    h.player.autoEnd = true;
    h.recognizer.onresult({ resultIndex: 0, results: [[{ transcript: phrase }]] });
    h.recognizer.onresult({ resultIndex: 0, results: [[{ transcript: `${phrase}!` }]] });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.fetches(), fetchesBefore + 1, phrase);
    assert.equal(h.runtime.getState().conversationState, 'LISTENING');
    h.recognizer.onresult({ resultIndex: 0, results: [[{ transcript: 'start the workout' }]] });
    assert.ok(h.events.includes('command-start the workout'));
    const trace = h.runtime.getSpeechTrace();
    assert.ok(trace.some((entry) => entry.event === 'speech.stop_intent_detected'));
    assert.ok(trace.some((entry) => entry.event === 'speech.response_cancelled'));
    assert.equal(JSON.stringify(trace).includes('This is a deliberately long conversational response.'), false);
  }
});

test('Voice Off outranks interruption, cancels silently, and delayed onend cannot restart recognition', async () => {
  const h = await activeConversationSpeech();
  const fetchesBefore = h.fetches();
  const startsBefore = h.recognizer.starts;
  h.runtime.setMuted(true);
  h.recognizer.onend();
  assert.equal(h.fetches(), fetchesBefore);
  assert.equal(h.recognizer.starts, startsBefore);
  assert.equal(h.runtime.getState().conversationState, 'IDLE');
  assert.equal(h.runtime.getState().listening, false);
  assert.equal(h.runtime.getState().activeSpeech, null);
});

test('exit intent during speech cancels without stop acknowledgment and ends the session', async () => {
  for (const phrase of ['stop listening', 'goodbye']) {
    const h = await activeConversationSpeech();
    const fetchesBefore = h.fetches();
    h.recognizer.onresult({ resultIndex: 0, results: [[{ transcript: phrase }]] });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.runtime.getState().conversationState, 'IDLE');
    assert.equal(h.fetches(), fetchesBefore);
  }
});

test('speech ownership rejects unrelated overlapping cues without changing workout preferences', async () => {
  const h = await activeConversationSpeech();
  const result = await h.runtime.speak('Workout cue', 'rep');
  assert.equal(result.reason, 'speech_in_progress');
  assert.equal(h.runtime.getState().activeSpeech.source, 'conversation');
  h.player.onended();
  await h.speech;
});

test('warning occurs once, does not extend inactivity, and final timeout stops recognition in IDLE', async () => {
  const h = harness({ conversationTimeoutMs: 45, conversationWarningMs: 10 });
  await h.runtime.activateVoice();
  h.recognizers[0].onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Mufasa begin' }]] });
  await new Promise((resolve) => setTimeout(resolve, 75));
  const trace = h.runtime.getSpeechTrace();
  assert.equal(trace.filter((entry) => entry.event === 'conversation.warning_started').length, 1);
  assert.equal(trace.filter((entry) => entry.event === 'conversation.timeout').length, 1);
  assert.equal(h.runtime.getState().conversationState, 'IDLE');
  assert.equal(h.runtime.getState().listening, false);
});
