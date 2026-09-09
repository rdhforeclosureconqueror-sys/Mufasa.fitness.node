'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const phase = id => Lunge.spec.phases.find(item => item.id === id);

test('v3 removes separate step-forward and step-back key poses', () => {
  assert.equal(phase('step_forward'), undefined);
  assert.equal(phase('step_back'), undefined);
  assert.deepEqual(Lunge.spec.phaseOrder.slice(0, 2), ['stand_start','split_plant']);
  assert.equal(Lunge.spec.phaseOrder.at(-1), 'stand_finish');
});

test('v3 exit is direct from rep3_top to neutral standing after contacts release', () => {
  assert.deepEqual(phase('rep3_top').contacts, ['left_front_foot','right_rear_forefoot']);
  assert.deepEqual(phase('stand_finish').contacts, []);
  assert.deepEqual(phase('stand_finish').boneTargets, phase('stand_start').boneTargets);
  assert.deepEqual(phase('stand_finish').root, phase('stand_start').root);
});

test('validator rejects reintroducing old intermediate step phases', () => {
  const candidate = { ...Lunge.spec, phaseOrder: ['stand_start','step_forward',...Lunge.spec.phaseOrder.slice(1)] };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_PHASE_ORDER/.test(error)));
});

test('Motion Lab preview exposes phase-first v3 label dynamically', () => {
  const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');
  assert.match(preview, /Load Stationary Lunge Left v3\.0 Phase-First/);
});
