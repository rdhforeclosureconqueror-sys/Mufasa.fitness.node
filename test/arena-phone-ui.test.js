'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Flow = require('../public/arena-phone-flow');
const Calibration = require('../public/arena-pose-calibration');

function fixture(t) {
  const nodes = new Map(), events = new Map(), sent = [], marks = [], timers = new Map(); let starts = 0, stops = 0, cameraOptions, time = 0, timerId = 0;
  function advance(ms) {time += ms; for (const [id, timer] of [...timers]) if (timer.at <= time) {timers.delete(id); timer.fn();}}
  const doc = {activeElement: null, createElement: () => node('option'), getElementById: id => nodes.get(id)};
  function node(id) {
    const result = {id, style: {}, dataset: {}, hidden: false, disabled: false, events: {},
      addEventListener(name, fn) {(this.events[name] ||= []).push(fn);},
      fire(name, data = {}) {return Promise.all((this.events[name] || []).map(fn => fn(data)));},
      replaceChildren() {}, focus() {doc.activeElement = this;}, contains: value => [...nodes.values()].includes(value),
      setPointerCapture(id) {this.pointerId = id;}, hasPointerCapture(id) {return this.pointerId === id;}, releasePointerCapture() {this.pointerId = null;}
    }; nodes.set(id, result); return result;
  }
  const html = fs.readFileSync(path.join(__dirname, '../public/arena-push-up.html'), 'utf8');
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) node(id);
  const buttons = ['MOVE_LEFT', 'MOVE_RIGHT', 'MOVE_FORWARD', 'MOVE_BACKWARD'].map(action => {const button = node(action); button.dataset.arenaMove = action; return button;});
  nodes.get('arenaPhonePanel').querySelectorAll = () => buttons;
  const root = {document: doc, crypto: {randomUUID: () => 'phone-scope'}, PocketPTArenaPhoneFlow: Flow,
    PocketPTArenaPoseCalibration: {create: options => Calibration.create({...options, now: () => time,
      setTimer(fn, ms) {timers.set(++timerId, {fn, at: time + ms}); return timerId;}, clearTimer: id => timers.delete(id)})},
    addEventListener: (name, fn) => events.set(name, fn),
    PocketPTArenaCamera: {create(options) {cameraOptions = options; return {async start() {starts++;}, stop() {stops++; options.onVisibility(false);}, resetTracking() {options.onVisibility(false);}};}}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/arena-phone-ui.js'), 'utf8'), {window: root});
  const ui = root.PocketPTArenaPhoneUI.mount({game: nodes.get('game'), mark: (...args) => marks.push(args), send: packet => sent.push(packet)});
  t.after(() => ui.close());
  ui.connect(); let sequence = 0;
  const packet = data => ({type: 'POCKETPT_GODOT_BRIDGE', protocolVersion: 1, flowVersion: 1, requestId: 'phone-scope', sequence: ++sequence, ...data});
  ui.accept(packet({event: 'ARENA_FLOW_CAPABILITIES', capabilities: {contextLock: true, touchNavigation: true, matApproach: true, pushUpTransition: true}}));
  function hold(kind) {
    const points = kind === 'BOTTOM' ? {shoulder:[.2,.3],elbow:[.1,.4],wrist:[.2,.45],hip:[.4,.3],ankle:[.7,.3]}
      : {shoulder:[.2,.2],elbow:[.2,.3],wrist:[.2,.4],hip:[.4,.2],ankle:[.7,.2]};
    for (let i=0;i<40;i++) {advance(33); cameraOptions.onVisibility(true); cameraOptions.onPose({timestamp:time,sourceWidth:640,sourceHeight:480,side:'left',analysisUsable:true,trackingState:'LOCKED',sequenceLandmarks:Object.fromEntries(Object.entries(points).map(([name,[x,y]])=>[name,{x,y,confidence:.95}]))},.75);}
  }
  return {ui, nodes, doc, events, sent, packet, marks, timers, advance, hold, cameraOptions: () => cameraOptions, stats: () => ({starts, stops})};
}

async function startCalibration(f) {
  await f.nodes.get('arenaGoToMat').fire('click');
  f.ui.accept(f.packet({event:'ARENA_FLOW_EVENT',result:'AT_MAT',replyTo:f.sent.at(-1).sequence}));
  await f.nodes.get('arenaSetupCamera').fire('click');
  await f.nodes.get('arenaEnableCamera').fire('click');
}

test('real coordinator rotates from captured references to retry, and explicit restart clears all gates', async t => {
  const f=fixture(t);await startCalibration(f);f.hold('TOP');f.hold('BOTTOM');f.hold('TOP');
  assert.match(f.nodes.get('arenaBodyStatus').textContent,/reference cycle observed/);
  assert.equal(f.timers.size,0);f.events.get('orientationchange')();
  assert.equal(f.nodes.get('arenaRestartCalibration').hidden,false);assert.match(f.nodes.get('arenaBodyStatus').textContent,/Capture paused/);
  assert.equal(f.nodes.get('arenaBodyStatus').dataset.visible,'false');
  await f.nodes.get('arenaRestartCalibration').fire('click');
  assert.equal(f.doc.activeElement.id,'arenaReturnToGym');f.hold('TOP');
  assert.match(f.nodes.get('arenaBodyStatus').textContent,/hold BOTTOM/);
  assert.equal(f.marks.filter(x=>x[0]==='POSE_BOTTOM_CALIBRATION').at(-1)[1],'RUNNING');
  assert.equal(f.marks.some(([id,status])=>['START_POSITION','REP_DETECTOR','TIMER'].includes(id)&&status==='PASS'),false);
});

test('coordinator deadlines show retry and camera switching starts fresh capture', async t => {
  const f=fixture(t);await startCalibration(f);f.hold('TOP');f.advance(30001);
  assert.match(f.nodes.get('arenaBodyStatus').textContent,/Capture paused/);
  assert.deepEqual(f.marks.filter(x=>x[0]==='POSE_BOTTOM_CALIBRATION').at(-1),['POSE_BOTTOM_CALIBRATION','FAIL','CALIBRATION_TIMEOUT']);
  f.nodes.get('arenaCameraSelect').value='different-device';await f.nodes.get('arenaCameraSelect').fire('change');
  f.cameraOptions().onVisibility(true);assert.match(f.nodes.get('arenaBodyStatus').textContent,/Hold TOP/);
  assert.equal(f.stats().starts,2);
});

test('suspend, reset, exit and return erase references and pending capture timers', async t => {
  for (const action of ['suspend','reset','close','return']) {
    const f=fixture(t);await startCalibration(f);f.hold('TOP');
    assert.equal(f.timers.size,1);
    if(action==='return')await f.nodes.get('arenaReturnToGym').fire('click');else f.ui[action]();
    assert.equal(f.timers.size,0,action);f.advance(60000);
    assert.notEqual(f.marks.filter(x=>x[0]==='POSE_TOP_CALIBRATION').at(-1)[1],'PASS',action);
  }
});

test('camera check outside mat setup cannot collect references or expose restart', async t => {
  const f=fixture(t);await f.nodes.get('arenaSetupCamera').fire('click');await f.nodes.get('arenaEnableCamera').fire('click');
  f.hold('TOP');f.hold('BOTTOM');f.hold('TOP');
  assert.equal(f.nodes.get('arenaRestartCalibration').hidden,true);assert.equal(f.timers.size,0);
  assert.match(f.nodes.get('arenaBodyStatus').textContent,/preview only/);
});

test('thumb pointer cancellation stops movement and release-click cannot restart it', async t => {
  const f = fixture(t), button = f.nodes.get('MOVE_LEFT');
  await button.fire('pointerdown', {button: 0, pointerId: 7, preventDefault() {}});
  assert.equal(f.sent.at(-1).action, 'MOVE_LEFT');
  await button.fire('pointercancel', {pointerId: 7}); assert.equal(f.sent.at(-1).action, 'STOP');
  const count = f.sent.length; await button.fire('click', {detail: 1}); assert.equal(f.sent.length, count);
});

test('touch mat flow transfers focus to recovery controls and locks the iframe during setup', async t => {
  const f = fixture(t);
  assert.equal(f.stats().starts, 0); assert.equal(f.nodes.get('game').inert, false);
  await f.nodes.get('arenaGoToMat').fire('click');
  assert.equal(f.doc.activeElement.id, 'arenaStopApproach'); assert.equal(f.nodes.get('game').inert, true);
  const command = f.sent.at(-1);
  f.ui.accept(f.packet({event: 'ARENA_FLOW_EVENT', result: 'AT_MAT', replyTo: command.sequence}));
  assert.equal(f.doc.activeElement.id, 'arenaSetupCamera');
  await f.nodes.get('arenaSetupCamera').fire('click'); assert.equal(f.doc.activeElement.id, 'arenaEnableCamera');
  assert.equal(f.stats().starts, 0);
  await f.nodes.get('arenaEnableCamera').fire('click'); assert.equal(f.stats().starts, 1);
  assert.equal(f.doc.activeElement.id, 'arenaReturnToGym'); assert.equal(f.nodes.get('arenaCameraStage').hidden, false);
  f.cameraOptions().onVisibility(true); assert.match(f.nodes.get('arenaBodyStatus').textContent, /Hold TOP/);
});

test('suspend stops the camera and keeps navigation unavailable until explicit return', async t => {
  const f = fixture(t); await f.nodes.get('arenaSetupCamera').fire('click'); await f.nodes.get('arenaEnableCamera').fire('click');
  const previous = f.stats().stops; f.ui.suspend(); assert.ok(f.stats().stops > previous);
  assert.equal(f.nodes.get('arenaCameraStage').hidden, true); assert.equal(f.nodes.get('game').inert, true);
  await f.nodes.get('arenaReturnToGym').fire('click'); assert.equal(f.nodes.get('game').inert, false);
  assert.equal(f.stats().starts, 1);
});

test('blur and orientation change release a captured thumb control', async t => {
  const f = fixture(t), button = f.nodes.get('MOVE_FORWARD');
  for (const event of ['blur', 'orientationchange']) {
    await button.fire('pointerdown', {button: 0, pointerId: 9, preventDefault() {}});
    f.events.get(event)(); assert.equal(f.sent.at(-1).action, 'STOP');
  }
});

test('all phone UI elements exist once and touch controls expose accessible names', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/arena-push-up.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../public/arena-phone-ui.js'), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of ui.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(id), id);
  for (const direction of ['left', 'right', 'forward', 'backward']) assert.ok(html.includes(`aria-label="Move ${direction}"`));
});

test('preview serves phone assets and an isolated camera double with explicit synthetic labels', async t => {
  const {createPreview} = require('../scripts/preview-arena-diagnostics');
  const server = createPreview();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await (await fetch(base + '/arena/push-up?case=phone-flow')).text();
  assert.match(page, /SYNTHETIC PREVIEW/);
  for (const name of ['runtime-state.js', 'push-up-challenge.js', 'arena-phone-flow.js', 'arena-pose-calibration.js', 'arena-phone-ui.js', 'arena-camera.js']) {
    const response = await fetch(base + '/' + name + '?case=phone-flow'); assert.equal(response.status, 200);
    new vm.Script(await response.text());
  }
  const camera = await (await fetch(base + '/arena-camera.js?case=phone-camera-denied')).text();
  assert.match(camera, /CAMERA_DENIED/); assert.doesNotMatch(camera, /navigator\.mediaDevices/);
  const game = await (await fetch(base + '/game/push-up-arena/index.html?case=phone-flow')).text();
  for (const [, script] of game.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
  assert.match(game, /ARENA_FLOW_CAPABILITIES/);
});
