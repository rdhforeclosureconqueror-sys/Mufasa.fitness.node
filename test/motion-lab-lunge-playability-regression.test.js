'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }

test('active lunge is restored to the last known-playable v2.1 definition', () => {
  assert.equal(Lunge.spec.version, 2.1);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_1_exit_release');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.validate(Lunge.spec).valid, true);
  assert.deepEqual(phase('step_back').contacts, []);
  assert.equal(Lunge.spec.authoringGeometryGate, undefined, 'raw degree gates must not masquerade as runtime playability proof');
});

test('Motion Lab Play remains gated on a successfully loaded runtime motion', () => {
  const runtime = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-runtime.js'), 'utf8');
  assert.match(runtime, /selected=Boolean\(id&&state\?\.motion&&playback!=="unloaded"\)/);
  assert.match(runtime, /\["playAnimation","restartAnimation","unloadAnimation","loopAnimation"\]/);
  assert.match(runtime, /disabled\(name,!selected\)/);
});

test('reference UI identifies the restored lunge version', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  assert.match(html, /Load Stationary Lunge Left v2\.1 \(Reference Only\)/);
  assert.doesNotMatch(html, /Load Stationary Lunge Left v2\.2 \(Reference Only\)/);
});

test('runtime compiler remains the final playability authority for generated IK', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-intelligence-adapter.js'), 'utf8');
  assert.match(compiler, /if \(constrained\.status !== "ready"\)/);
  assert.match(compiler, /status: "failed"/);
  assert.match(adapter, /motion_generated_chain_ik_failed/);
  assert.match(adapter, /solveTwoBoneChain/);
});
