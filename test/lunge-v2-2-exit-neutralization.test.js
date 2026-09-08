'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function pitch(item, bone) { return item.boneTargets.find(target => target.bone === bone).rotationOffsetEulerDegrees[0]; }

test('v2.2 uses distinct entry and exit transition geometry', () => {
  const entry = phase('step_forward');
  const top = phase('rep3_top');
  const exit = phase('step_back');
  assert.ok(pitch(entry, 'mixamorig:LeftUpLeg') >= 50, 'entry must retain the longer stride gate');
  assert.ok(Math.abs(pitch(exit, 'mixamorig:LeftUpLeg')) < Math.abs(pitch(top, 'mixamorig:LeftUpLeg')), 'exit left hip must move toward neutral');
  assert.ok(Math.abs(pitch(exit, 'mixamorig:RightUpLeg')) < Math.abs(pitch(top, 'mixamorig:RightUpLeg')), 'exit rear hip must move toward neutral');
  assert.notDeepEqual(exit.boneTargets, entry.boneTargets, 'step_back must not reuse the aggressive step-forward pose');
});

test('validator rejects reusing the forward-step pose for step_back', () => {
  const entry = phase('step_forward');
  const candidate = {
    ...Lunge.spec,
    phases: Lunge.spec.phases.map(item => item.id === 'step_back' ? { ...item, boneTargets: entry.boneTargets } : item)
  };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_EXIT_GEOMETRY/.test(error)));
});

test('Motion Lab label matches active v2.2 motion', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  assert.match(html, /Load Stationary Lunge Left v2\.2 \(Reference Only\)/);
  assert.doesNotMatch(html, /Load Stationary Lunge Left v2\.1 \(Reference Only\)/);
});
