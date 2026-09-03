'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const diagnostics = require('../public/arena-diagnostics');

const bootstrap = () => ({protocolVersion: 1, session: {id: 'private-session', expiresAt: '2030-01-01T00:10:00Z'},
  member: {id: 'private-member', displayName: 'Private Name'}, experience: {type: 'PUSH_UP_ARENA', challengeId: 'push_up'},
  avatar: {avatarId: 'a'.repeat(32), profileVersion: 'b'.repeat(32), format: 'glb', assetUrl: `/api/game/avatar/asset?version=${'b'.repeat(32)}`},
  avatarState: {status: 'AVAILABLE', fallback: 'DEFAULT_AVATAR'}});
const CLOCK = Date.parse('2030-01-01T00:00:00Z');
const row = (model, id) => model.snapshot().find(item => item.id === id);

function connected() {
  const model = diagnostics.create({now: () => CLOCK});
  for (const id of ['ARENA_SHELL', 'CONFIG', 'TICKET_PRESENT', 'SESSION_EXCHANGE', 'FRAGMENT_SCRUB', 'BOOTSTRAP', 'IDENTITY', 'CHALLENGE_CONTEXT', 'SESSION_LIFETIME', 'BUILD_PROBE', 'IFRAME_LOAD', 'GODOT_HANDSHAKE', 'AVATAR_DESCRIPTOR']) model.mark(id, 'PASS', 'REQUEST_STARTED');
  model.resetGame('launch-a');
  return model;
}
function evidence(stage, status = 'PASS', extra = {}) {
  return {type: 'POCKETPT_GODOT_BRIDGE', event: 'DIAGNOSTIC', protocolVersion: 1, diagnosticVersion: 1, requestId: 'launch-a', sequence: 1, stage, status, ...extra};
}

test('successful bridge and descriptor never imply avatar, walking, camera or challenge success', () => {
  const model = connected();
  assert.equal(model.summary().firstFailure, null);
  assert.equal(model.summary().next.id, 'GODOT_REPORTER');
  for (const id of ['AVATAR_DOWNLOAD', 'AVATAR_IMPORT', 'AVATAR_MOUNT', 'LOCOMOTION', 'BODY_DETECTOR', 'READY_GESTURE', 'REP_DETECTOR', 'TIMER', 'SCORE_PERSISTENCE', 'GHOST_PLAYBACK']) assert.notEqual(row(model, id).status, 'PASS');
});

test('earliest upstream failure takes priority and downstream checks become blocked', () => {
  const model = connected();
  model.mark('GODOT_HANDSHAKE', 'FAIL', 'HANDSHAKE_TIMEOUT');
  model.mark('BOOTSTRAP', 'FAIL', 'HTTP_401');
  assert.equal(model.summary().firstFailure.id, 'BOOTSTRAP');
  assert.equal(row(model, 'GODOT_HANDSHAKE').status, 'BLOCKED');
  assert.equal(row(model, 'IDENTITY').status, 'BLOCKED');
  assert.equal(row(model, 'BODY_DETECTOR').status, 'BLOCKED');
});

test('a real avatar failure remains visible without inventing prerequisite passes', () => {
  const model = connected();
  assert.equal(model.acceptRuntime(evidence('AVATAR_IMPORT', 'FAIL')), true);
  assert.equal(model.summary().firstFailure.id, 'AVATAR_IMPORT');
  assert.equal(row(model, 'AVATAR_DOWNLOAD').status, 'NOT_CONNECTED');
  assert.equal(row(model, 'AVATAR_MOUNT').status, 'BLOCKED');
});

test('out-of-order mount success waits for separately reported download and import', () => {
  const model = connected();
  model.acceptRuntime(evidence('AVATAR_MOUNT'));
  assert.equal(row(model, 'AVATAR_MOUNT').status, 'BLOCKED');
  model.acceptRuntime(evidence('AVATAR_DOWNLOAD', 'PASS', {sequence: 2}));
  assert.equal(row(model, 'AVATAR_MOUNT').status, 'BLOCKED');
  model.acceptRuntime(evidence('AVATAR_IMPORT', 'PASS', {sequence: 3}));
  assert.equal(row(model, 'AVATAR_MOUNT').status, 'PASS');
  assert.notEqual(row(model, 'LOCOMOTION').status, 'PASS');
});

test('a retry invalidates previous dependent success instead of reviving stale green rows', () => {
  const model = connected();
  ['AVATAR_DOWNLOAD', 'AVATAR_IMPORT', 'AVATAR_MOUNT', 'LOCOMOTION'].forEach((id, index) => model.acceptRuntime(evidence(id, 'PASS', {sequence: index + 1})));
  assert.equal(row(model, 'LOCOMOTION').status, 'PASS');
  model.acceptRuntime(evidence('AVATAR_DOWNLOAD', 'RUNNING', {sequence: 5}));
  model.acceptRuntime(evidence('AVATAR_DOWNLOAD', 'PASS', {sequence: 6}));
  assert.equal(row(model, 'AVATAR_IMPORT').status, 'NOT_CONNECTED');
  assert.notEqual(row(model, 'AVATAR_MOUNT').status, 'PASS');
  assert.notEqual(row(model, 'LOCOMOTION').status, 'PASS');
});

test('runtime reports require exact launch correlation, ordered sequence, version and stage ownership', () => {
  const model = connected();
  for (const extra of [{requestId: 'old-launch'}, {protocolVersion: '1'}, {diagnosticVersion: 2}, {sequence: 0}, {sequence: 1.5}, {sequence: Infinity}, {stage: 'IDENTITY'}, {stage: 'TIMER'}, {stage: 'SCORE_PERSISTENCE'}, {stage: 'BODY_DETECTOR'}, {status: 'GREEN'}, {event: 'READY'}]) assert.equal(model.acceptRuntime(evidence('AVATAR_DOWNLOAD', 'PASS', extra)), false);
  assert.equal(model.acceptRuntime(evidence('AVATAR_DOWNLOAD')), true);
  assert.equal(model.acceptRuntime(evidence('AVATAR_IMPORT')), false, 'duplicate sequence');
  model.resetGame('launch-b');
  assert.equal(model.acceptRuntime(evidence('AVATAR_IMPORT', 'PASS', {sequence: 2})), false);
  assert.equal(row(model, 'GODOT_REPORTER').status, 'NOT_CONNECTED');
});

test('failed or expired sessions and exit reject late runtime reports', () => {
  for (const stage of ['GODOT_HANDSHAKE', 'SESSION_LIFETIME']) {
    const model = connected();
    model.mark(stage, 'FAIL', 'HTTP_401');
    assert.equal(model.acceptRuntime(evidence('AVATAR_DOWNLOAD')), false);
  }
  const closed = connected();
  closed.close();
  assert.equal(closed.acceptRuntime(evidence('AVATAR_DOWNLOAD')), false);
});

test('fallback is explicit and never reports a personal mount as successful', () => {
  const model = connected();
  model.setFallback(true);
  model.mark('AVATAR_DESCRIPTOR', 'SKIP', 'FALLBACK_EXPECTED');
  assert.equal(model.acceptRuntime(evidence('AVATAR_MOUNT')), false);
  assert.equal(model.acceptRuntime(evidence('AVATAR_FALLBACK')), true);
  assert.equal(row(model, 'AVATAR_MOUNT').status, 'SKIP');
  assert.equal(row(model, 'AVATAR_FALLBACK').status, 'PASS');
  assert.equal(model.acceptRuntime(evidence('AVATAR_IMPORT', 'SKIP', {sequence: 2})), false);
});

test('origin, exact iframe source and protocol are all required', () => {
  const contentWindow = {};
  const frame = {contentWindow};
  const event = {origin: 'https://arena.example', source: contentWindow, data: {type: 'POCKETPT_GODOT_BRIDGE', event: 'READY', protocolVersion: 1}};
  assert.equal(diagnostics.isGameMessage(event, frame, event.origin), true);
  assert.equal(diagnostics.isGameMessage({...event, source: {}}, frame, event.origin), false);
  assert.equal(diagnostics.isGameMessage({...event, origin: 'https://other.example'}, frame, event.origin), false);
  assert.equal(diagnostics.isGameMessage({...event, data: {...event.data, protocolVersion: 2}}, frame, event.origin), false);
});

test('copied reports contain only allowlisted details, never arbitrary runtime payloads', () => {
  const model = connected();
  const privateText = 'Bearer secret-token ticket=private-ticket private.person@example.com private-member private-session';
  assert.equal(model.mark('BOOTSTRAP', 'FAIL', privateText), false);
  assert.equal(model.acceptRuntime(evidence('AVATAR_IMPORT', 'FAIL', {message: privateText, cookie: privateText, keypoints: [{x: 0.314159}]})), true);
  const report = model.report();
  for (const value of ['secret-token', 'private-ticket', 'private.person', 'private-member', 'private-session', '0.314159']) assert.equal(report.includes(value), false);
  assert.match(report, /AVATAR_IMPORT/);
  assert.match(report, /FIRST FAILURE/);
});

function panel(navigator) {
  const nodes = [];
  const document = {createElement(tag) {
    const node = {tag, children: [], events: {}, attributes: {}, dataset: {}, textContent: '', hidden: false,
      append(...children) {this.children.push(...children);}, replaceChildren() {this.children = [];},
      setAttribute(name, value) {this.attributes[name] = value;}, addEventListener(name, callback) {this.events[name] = callback;},
      focus() {this.focused = true;}, select() {this.selected = true;}};
    nodes.push(node);
    return node;
  }};
  const model = connected();
  const board = document.createElement('aside');
  board.hidden = true;
  const toggle = document.createElement('button');
  const view = diagnostics.mount({model, board, toggle, document, navigator, reload() {}});
  return {model, board, toggle, view, nodes, button: text => nodes.find(node => node.tag === 'button' && node.textContent === text)};
}

test('copy fallback exposes a selectable report when clipboard access is absent or denied', async () => {
  for (const navigator of [{}, {clipboard: {writeText: async () => {throw new Error('denied');}}}]) {
    const ui = panel(navigator);
    await ui.button('Copy Debug Report').events.click();
    const textarea = ui.nodes.find(node => node.tag === 'textarea');
    assert.equal(textarea.hidden, false);
    assert.equal(textarea.readOnly, true);
    assert.equal(textarea.focused, true);
    assert.equal(textarea.selected, true);
    assert.equal(textarea.value, ui.model.report());
    assert.equal(ui.nodes.some(node => node.textContent === 'Report copied.'), false);
  }
});

test('successful copy and keyboard close have distinct, truthful UI feedback', async () => {
  let copied;
  const ui = panel({clipboard: {writeText: async text => {copied = text;}}});
  ui.toggle.events.click();
  assert.equal(ui.board.hidden, false);
  assert.equal(ui.toggle.attributes['aria-expanded'], 'true');
  await ui.button('Copy Debug Report').events.click();
  assert.equal(copied, ui.model.report());
  assert.equal(ui.nodes.some(node => node.textContent === 'Report copied.'), true);
  ui.board.events.keydown({key: 'Escape', preventDefault() {}});
  assert.equal(ui.board.hidden, true);
  assert.equal(ui.toggle.attributes['aria-expanded'], 'false');
  assert.equal(ui.toggle.focused, true);
});

test('bootstrap validation distinguishes identity, experience, expiry and avatar descriptor failures', () => {
  const data = bootstrap();
  assert.deepEqual(diagnostics.inspectBootstrap(data, CLOCK), {expiresAt: CLOCK + 600000, fallback: false});
  assert.equal(diagnostics.inspectBootstrap({...data, protocolVersion: 2}, CLOCK).failure, 'BOOTSTRAP');
  assert.equal(diagnostics.inspectBootstrap({...data, member: {}}, CLOCK).failure, 'IDENTITY');
  assert.equal(diagnostics.inspectBootstrap({...data, experience: {type: 'OTHER'}}, CLOCK).failure, 'CHALLENGE_CONTEXT');
  assert.equal(diagnostics.inspectBootstrap({...data, session: {expiresAt: 'invalid'}}, CLOCK).failure, 'SESSION_LIFETIME');
  assert.equal(diagnostics.inspectBootstrap(data, CLOCK + 600000).failure, 'SESSION_LIFETIME');
  for (const assetUrl of ['https://other.example/avatar.glb', data.avatar.assetUrl + '&token=secret', '/api/game/avatar/asset?version=' + 'c'.repeat(32)]) {
    assert.equal(diagnostics.inspectBootstrap({...data, avatar: {...data.avatar, assetUrl}}, CLOCK).failure, 'AVATAR_DESCRIPTOR');
  }
  assert.deepEqual(diagnostics.inspectBootstrap({...data, avatar: null, avatarState: {status: 'FALLBACK', fallback: 'DEFAULT_AVATAR'}}, CLOCK), {expiresAt: CLOCK + 600000, fallback: true});
});

// Run the actual arena launcher against controlled HTTP responses and browser
// lifecycle events. No production account, webcam, GLB or result store is used.
async function launch(options = {}) {
  const events = new Map();
  const documentEvents = new Map();
  const nodes = new Map(['status', 'message', 'game', 'exitArena', 'bridgeDebugBoard', 'bridgeDebugToggle'].map(id => [id, {id, style: {}, textContent: ''}]));
  const game = nodes.get('game');
  const outgoing = [];
  game.contentWindow = {postMessage: (data, origin) => outgoing.push({data, origin})};
  game.contentDocument = {};
  const calls = [];
  const timerCallbacks = new Map();
  let timerId = 0;
  let model;
  let open = false;
  let clock = CLOCK;
  const location = {origin: 'https://arena.example', pathname: '/arena/push-up', search: '', hash: options.hash || '', assign: value => {location.assigned = value;}, reload: () => {location.reloaded = true;}};
  const context = {
    document: {getElementById: id => nodes.get(id), title: 'Arena', hidden: false, addEventListener: (name, cb) => documentEvents.set(name, cb)},
    location, history: {replaceState: () => {location.hash = ''; calls.push({url: 'fragment-cleared'});}}, navigator: {},
    URL, URLSearchParams, AbortController,
    Date: class extends Date { static now() { return clock; } },
    setTimeout: (cb, ms) => {timerCallbacks.set(++timerId, {cb, ms}); return timerId;}, clearTimeout: id => timerCallbacks.delete(id),
    fetch: async (url, init) => {
      calls.push({url, init});
      if (options.hangUrl === url) return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('request_aborted'))));
      let data;
      if (url === '/api/game/config') data = {protocolVersion: 1, returnUrl: 'https://pocket.example/push-up-challenge.html'};
      if (url === '/api/game/session-exchange') data = {ready: true};
      if (url === '/api/game/bootstrap') data = options.bootstrap || bootstrap();
      if (url === '/api/game/build') data = {protocolVersion: 1, available: true, entryPath: '/game/push-up-arena/index.html'};
      if (url === '/api/game/session') data = {ended: true};
      const status = options.failUrl === url ? (options.failStatus || 401) : 200;
      return {ok: status === 200, status, json: async () => options.invalidUrl === url ? {ok: true} : {ok: status === 200, data, error: {message: 'Bearer do-not-copy private.person@example.com'}}};
    }
  };
  let uuid = 0;
  context.window = {crypto: {randomUUID: () => `launch-${++uuid}`}, addEventListener: (name, cb) => events.set(name, cb),
    PocketPTArenaDiagnostics: {...diagnostics, create: settings => {model = diagnostics.create({...settings, now: () => clock}); return model;},
      mount: () => ({render() {}, setOpen(value) {open = value;}})}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/arena-push-up.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return {model, calls, outgoing, nodes, game, location, timers: timerCallbacks, open: () => open,
    message: (data, source = game.contentWindow, origin = location.origin) => events.get('message')({data, source, origin}),
    pageEvent: (name, event) => events.get(name)?.(event),
    advance(ms) {clock += ms; documentEvents.get('visibilitychange')?.();},
    async exit() {documentEvents.get('click')({target: {closest: () => nodes.get('exitArena')}, preventDefault() {}}); await new Promise(resolve => setImmediate(resolve));}
  };
}
const ready = {type: 'POCKETPT_GODOT_BRIDGE', event: 'READY', protocolVersion: 1};

test('actual launcher preserves ticket exchange ordering, no-store cookie auth and the existing game URL', async () => {
  const app = await launch({hash: '#ticket=one-use-private'});
  assert.deepEqual(app.calls.map(call => call.url), ['/api/game/config', '/api/game/session-exchange', 'fragment-cleared', '/api/game/bootstrap', '/api/game/build']);
  assert.equal(app.location.hash, '');
  assert.equal(app.game.src, '/game/push-up-arena/index.html');
  for (const call of app.calls.filter(call => call.init)) {
    assert.equal(call.init.credentials, 'same-origin');
    assert.equal(call.init.cache, 'no-store');
    assert.equal(call.init.headers.Authorization, undefined);
  }
  assert.equal(app.model.report().includes('one-use-private'), false);
});

test('actual launcher retains early READY after iframe load and rejects another same-origin window', async () => {
  const app = await launch();
  app.message(ready, {});
  assert.notEqual(row(app.model, 'GODOT_HANDSHAKE').status, 'PASS');
  app.message(ready);
  app.game.onload();
  assert.equal(row(app.model, 'GODOT_HANDSHAKE').status, 'PASS');
  assert.equal(app.outgoing.length, 1);
  assert.equal(app.outgoing[0].origin, 'https://arena.example');
  assert.equal(app.outgoing[0].data.event, 'DIAGNOSTICS_REQUEST');
  assert.equal(row(app.model, 'GODOT_REPORTER').status, 'NOT_CONNECTED');
});

test('actual launcher reports failed bootstrap as first failure and never starts the game', async () => {
  const app = await launch({failUrl: '/api/game/bootstrap'});
  assert.equal(app.model.summary().firstFailure.id, 'BOOTSTRAP');
  assert.equal(app.game.src, undefined);
  assert.equal(app.open(), true);
  assert.equal(app.model.report().includes('do-not-copy'), false);
});

test('failed ticket exchange still clears the launch fragment', async () => {
  const app = await launch({hash: '#ticket=secret', failUrl: '/api/game/session-exchange'});
  assert.equal(app.model.summary().firstFailure.id, 'SESSION_EXCHANGE');
  assert.equal(app.location.hash, '');
  assert.equal(app.game.src, undefined);
});

test('malformed build response fails at the build boundary rather than showing a blank game', async () => {
  const app = await launch({invalidUrl: '/api/game/build'});
  assert.equal(app.model.summary().firstFailure.id, 'BUILD_PROBE');
  assert.equal(app.game.src, undefined);
});

test('a stalled bootstrap request has a bounded timeout and never launches the game', async () => {
  const app = await launch({hangUrl: '/api/game/bootstrap'});
  const timeout = [...app.timers.values()].find(item => item.ms === 20000);
  assert.ok(timeout);
  timeout.cb();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.model.summary().firstFailure.id, 'BOOTSTRAP');
  assert.equal(row(app.model, 'BOOTSTRAP').code, 'REQUEST_TIMEOUT');
  assert.equal(app.game.src, undefined);
});

test('bounded missing READY is diagnosed and a genuine late READY can recover', async () => {
  const app = await launch();
  app.game.onload();
  const wait = [...app.timers.values()].find(item => item.ms === 120000);
  assert.ok(wait);
  wait.cb();
  assert.equal(app.model.summary().firstFailure.id, 'GODOT_HANDSHAKE');
  app.message(ready);
  assert.equal(row(app.model, 'GODOT_HANDSHAKE').status, 'PASS');
});

test('expiry and browser back-cache restore invalidate previous live success', async () => {
  const app = await launch();
  app.game.onload();
  app.message(ready);
  app.advance(600000);
  assert.equal(app.model.summary().firstFailure.id, 'SESSION_LIFETIME');
  assert.equal(row(app.model, 'GODOT_HANDSHAKE').status, 'BLOCKED');
  assert.equal(row(app.model, 'IDENTITY').status, 'BLOCKED');
  assert.equal(row(app.model, 'BODY_DETECTOR').status, 'BLOCKED');
  const restored = await launch();
  restored.game.onload();
  restored.message(ready);
  restored.pageEvent('pagehide', {});
  restored.pageEvent('pageshow', {persisted: true});
  assert.equal(restored.model.summary().firstFailure.id, 'BOOTSTRAP');
  assert.equal(row(restored.model, 'IDENTITY').status, 'BLOCKED');
});

test('iframe replacement clears old runtime evidence and keeps READY-before-load for the new document', async () => {
  const app = await launch();
  app.game.onload();
  app.message(ready);
  const oldId = app.outgoing.at(-1).data.requestId;
  app.message(evidence('AVATAR_DOWNLOAD', 'PASS', {requestId: oldId}));
  assert.equal(row(app.model, 'AVATAR_DOWNLOAD').status, 'PASS');
  app.game.contentDocument = {};
  app.message(ready);
  app.game.onload();
  assert.equal(row(app.model, 'GODOT_HANDSHAKE').status, 'PASS');
  assert.notEqual(row(app.model, 'AVATAR_DOWNLOAD').status, 'PASS');
  assert.equal(row(app.model, 'GODOT_REPORTER').status, 'NOT_CONNECTED');
  assert.notEqual(app.outgoing.at(-1).data.requestId, oldId);
  app.message(evidence('AVATAR_DOWNLOAD', 'PASS', {requestId: oldId, sequence: 2}));
  assert.notEqual(row(app.model, 'AVATAR_DOWNLOAD').status, 'PASS');
});

test('exit uses canonical cookie-scoped revocation and blocks late game messages', async () => {
  const app = await launch();
  app.game.onload();
  app.message(ready);
  await app.exit();
  const request = app.calls.find(call => call.url === '/api/game/session');
  assert.equal(request.init.method, 'DELETE');
  assert.equal(request.init.keepalive, true);
  assert.equal(request.init.credentials, 'same-origin');
  assert.equal(app.location.assigned, 'https://pocket.example/push-up-challenge.html');
  assert.equal(row(app.model, 'EXIT_REVOKE').status, 'PASS');
  app.message(ready);
  assert.notEqual(row(app.model, 'GODOT_HANDSHAKE').status, 'PASS');
});
