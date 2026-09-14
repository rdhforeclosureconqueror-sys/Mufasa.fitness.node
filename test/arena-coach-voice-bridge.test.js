'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createWorldBridge} = require('../src/world/worldBridge');
const {createArenaCoachVoiceBridge} = require('../src/world/arenaCoachVoiceBridge');

function responseHarness() {
  return {
    statusCode:200, jsonBody:null, sentBody:null, headers:{},
    set(name, value) { if (typeof name === 'object') Object.assign(this.headers, name); else this.headers[name] = value; return this; },
    vary() { return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.jsonBody = value; return this; },
    send(value) { this.sentBody = value; return this; }
  };
}

function sessionCookie(world) {
  const created = world.createTicket({userId:'member_voice', name:'Member Voice'});
  const exchanged = world.exchangeTicket(created.ticket);
  return `PocketPTArenaSession=${encodeURIComponent(exchanged.credential)}`;
}

test('arena voice bridge refuses speech without a current arena session', async () => {
  let providerCalls = 0;
  const world = createWorldBridge({secureCookie:false});
  const voice = createArenaCoachVoiceBridge({worldBridge:world, fetchImpl:async () => {providerCalls++;}});
  const req = {body:{text:'Step back'}, get:() => ''};
  const res = responseHarness();
  await voice.speak(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(providerCalls, 0);
});

test('arena voice bridge uses the arena cookie and configured coach persona', async () => {
  const calls = [];
  const world = createWorldBridge({secureCookie:false});
  const cookie = sessionCookie(world);
  const voice = createArenaCoachVoiceBridge({
    worldBridge:world,
    env:{AIVOICE_URL:'https://voice.example.test', COACH_TTS_VOICE:'verse', SKILL_WORLD_TTS_TOKEN:'internal'},
    fetchImpl:async (url, init) => {
      calls.push({url, init, body:JSON.parse(init.body)});
      const bytes = Buffer.from('audio-bytes');
      return {ok:true, status:200, headers:{get:()=>'audio/mpeg'}, arrayBuffer:async()=>bytes};
    }
  });
  const req = {body:{text:'Step back so I can see your full body.', voice:'alloy', format:'mp3'}, get:name => name === 'cookie' ? cookie : ''};
  const res = responseHarness();
  await voice.speak(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(String(res.sentBody), 'audio-bytes');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://voice.example.test/speak');
  assert.equal(calls[0].body.voice, 'verse');
  assert.equal(calls[0].init.headers['x-internal-token'], 'internal');
});
