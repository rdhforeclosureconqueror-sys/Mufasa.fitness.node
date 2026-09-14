'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'arena-push-up.js'), 'utf8');

test('arena accepts only fixed pre-READY Godot startup stages', () => {
  assert.match(source, /data\.event === 'STARTUP_STAGE'/);
  assert.match(source, /data\.protocolVersion !== 1/);
  assert.match(source, /GODOT_STARTUP_STAGES\.has\(stage\)/);
  assert.match(source, /\['PASS', 'FAIL'\]\.includes\(stageStatus\)/);
});

test('pre-READY trace exposes the last safe stage without arbitrary HTML', () => {
  assert.match(source, /PRE-READY GODOT STAGE:/);
  assert.match(source, /trace\.textContent =/);
  assert.doesNotMatch(source, /godotPreReadyStage[\s\S]{0,500}innerHTML\s*=/);
});

test('handshake timeout preserves the last observed startup stage', () => {
  assert.match(source, /lastGodotStartupStage/);
  assert.match(source, /renderStartupStage\(lastGodotStartupStage, 'TIMEOUT'\)/);
});

test('startup trace cannot bypass normal READY ownership', () => {
  const startupIndex = source.indexOf("data.event === 'STARTUP_STAGE'");
  const readyIndex = source.indexOf("data.event === 'READY'");
  assert.ok(startupIndex >= 0 && readyIndex > startupIndex);
  assert.match(source, /if \(!readyReceived\)/);
  assert.match(source, /mark\('GODOT_HANDSHAKE', 'PASS', 'HANDSHAKE_READY'\)/);
});
