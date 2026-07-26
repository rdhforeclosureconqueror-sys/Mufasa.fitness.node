'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../public/coach-runtime.js'), 'utf8');

function harness({ conversationTimeoutMs = 25000 } = {}) {
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
    pause() {},
    async play() { events.push('speech-play'); queueMicrotask(() => this.onended?.()); }
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
  scope.CoachRuntime.configure({ refs: { ttsPlayer: player }, deps: { voiceUrl: '/api/speak', conversationTimeoutMs, dispatchCommand: (message) => events.push(`command-${message}`) } });
  return { runtime: scope.CoachRuntime, events, recognizers, fetches: () => fetches };
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
  assert.equal(recognizer.starts, 2);
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
