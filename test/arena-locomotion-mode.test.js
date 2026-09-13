'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {create} = require('../public/arena-phone-flow');

function fixture() {
  const sent = [];
  const flow = create({send: packet => sent.push(packet)});
  flow.connect('locomotion-test');
  let incoming = 0;
  const packet = data => ({
    type: 'POCKETPT_GODOT_BRIDGE',
    protocolVersion: 1,
    flowVersion: 1,
    requestId: 'locomotion-test',
    sequence: ++incoming,
    ...data
  });
  flow.accept(packet({event: 'ARENA_FLOW_CAPABILITIES', capabilities: {
    contextLock: true,
    touchNavigation: true,
    matApproach: true,
    pushUpTransition: true
  }}));
  return {flow, sent};
}

test('walk is the default locomotion mode and run can be selected explicitly', () => {
  const f = fixture();
  assert.equal(f.flow.snapshot().movementMode, 'WALK');
  assert.equal(f.flow.setLocomotionMode('RUN'), true);
  assert.equal(f.flow.snapshot().movementMode, 'RUN');
  assert.equal(f.sent.at(-1).event, 'CONTROL_INTENT');
  assert.equal(f.sent.at(-1).action, 'SET_LOCOMOTION_MODE');
  assert.equal(f.sent.at(-1).mode, 'RUN');
  assert.equal(f.sent.at(-1).context, 'GYM_NAVIGATION');

  assert.equal(f.flow.hold('MOVE_FORWARD'), true);
  assert.equal(f.sent.at(-1).action, 'MOVE_FORWARD');
  f.flow.release();
  assert.equal(f.sent.at(-1).action, 'STOP');

  assert.equal(f.flow.setLocomotionMode('WALK'), true);
  assert.equal(f.flow.snapshot().movementMode, 'WALK');
  assert.equal(f.sent.at(-1).action, 'SET_LOCOMOTION_MODE');
  assert.equal(f.sent.at(-1).mode, 'WALK');
});

test('locomotion mode cannot be changed while navigation is locked', () => {
  const f = fixture();
  assert.equal(f.flow.approach(), true);
  assert.equal(f.flow.snapshot().state, 'APPROACHING');
  const count = f.sent.length;
  assert.equal(f.flow.setLocomotionMode('RUN'), false);
  assert.equal(f.sent.length, count);
  assert.equal(f.flow.snapshot().movementMode, 'WALK');
});

test('arena markup and phone UI expose explicit Walk and Run controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/arena-push-up.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../public/arena-phone-ui.js'), 'utf8');
  for (const id of ['arenaWalkMode', 'arenaRunMode', 'arenaLocomotionModeStatus']) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(ui, new RegExp(id));
  }
  assert.match(ui, /setLocomotionMode\('WALK'\)/);
  assert.match(ui, /setLocomotionMode\('RUN'\)/);
  assert.match(html, />Walk<\/button>/);
  assert.match(html, />Run<\/button>/);
});


test('Thriller action is explicit, stops movement first, and is unavailable while locked', () => {
  const f = fixture();
  assert.equal(f.flow.playAction('ThrillerPart1'), true);
  assert.equal(f.sent.at(-2).action, 'STOP');
  assert.equal(f.sent.at(-1).action, 'PLAY_ACTION');
  assert.equal(f.sent.at(-1).name, 'ThrillerPart1');
  assert.equal(f.sent.at(-1).context, 'GYM_NAVIGATION');
  assert.equal(f.flow.approach(), true);
  const count = f.sent.length;
  assert.equal(f.flow.playAction('ThrillerPart1'), false);
  assert.equal(f.sent.length, count);
});

test('mobile arena keeps diagnostics floating and exposes Thriller without consuming gym height', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/arena-push-up.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../public/arena-phone-ui.js'), 'utf8');
  assert.match(html, /id="arenaThrillerAction"/);
  assert.match(ui, /playAction\('ThrillerPart1'\)/);
  assert.doesNotMatch(html, /#bridgeDebugToggle\{position:static/);
  assert.match(html, /#bridgeDebugToggle\{position:fixed/);
});

test('phone movement UI uses a one-thumb 360 joystick while preserving Walk Run and Thriller controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/arena-push-up.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../public/arena-phone-ui.js'), 'utf8');
  const flow = fs.readFileSync(path.join(__dirname, '../public/arena-phone-flow.js'), 'utf8');
  assert.match(html, /id="arenaJoystick"/);
  assert.doesNotMatch(html, /class="thumb-grid"/);
  assert.match(ui, /flow\.moveVector/);
  assert.match(flow, /'MOVE_VECTOR'/);
});
