'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Arena configures the canonical CoachRuntime to use the arena-session speech route', () => {
  let config = null;
  const runtimeState = {configured:false, muted:true};
  const root = {
    CoachRuntime: {
      configure(value) { config = value; runtimeState.configured = true; return {...runtimeState}; },
      getState() { return {...runtimeState}; }
    }
  };
  root.window = root;
  const source = fs.readFileSync(path.join(__dirname, '../public/arena-coach-runtime.js'), 'utf8');
  vm.runInNewContext(source, root);
  assert.equal(config.deps.voiceUrl, '/api/game/speak');
  assert.equal(root.PocketPTArenaCoachRuntime.configure().ok, true);
});

test('Arena page preloads CoachRuntime before live motion and keeps body/form status out of the video area', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/arena-push-up.html'), 'utf8');
  assert.ok(html.indexOf('/coach-runtime.js') < html.indexOf('/arena-live-motion-adapter.js'));
  assert.ok(html.indexOf('/arena-coach-runtime.js') < html.indexOf('/arena-live-motion-adapter.js'));
  assert.match(html, /\.camera-stage video\{[^}]*height:calc\(100% - 64px\)/);
  assert.match(html, /#arenaBodyStatus\{[^}]*bottom:0[^}]*min-height:64px/);
  assert.match(html, /#arenaBodyStatus\[data-form="fail"\]\{color:#ff7588\}/);
  assert.match(html, /@media\(max-width:600px\)[\s\S]*\.camera-stage\{width:calc\(100% - 16px\)/);
});

test('Arena phone calibration explains the red-green form contract and keeps spoken setup cues intact', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/arena-phone-ui.js'), 'utf8');
  assert.match(source, /green = usable/);
  assert.match(source, /align shoulder · hip · ankle/);
  assert.match(source, /straighten arm a little more/);
  assert.match(source, /set arm\/shoulder closer to 90°/);
  assert.match(source, /Didn't get it/);
  assert.match(source, /interruptible:false/);
});