'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const phase = id => Lunge.spec.phases.find(item => item.id === id);
const pitch = (id, bone) => phase(id)?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0];

test('active lunge v3 is phase-first and keeps Play gated on runtime compilation', () => {
  assert.equal(Lunge.spec.version, 3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_phase_first_v3_owner_split_plant');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.validate(Lunge.spec).valid, true);
  assert.equal(phase('step_forward'), undefined);
  assert.equal(phase('step_back'), undefined);
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 79);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -14);
});

test('loaded repetitions preserve split pose and use vertical root movement plus generated IK', () => {
  const split = phase('split_plant').boneTargets;
  for (const id of ['rep1_descent','rep1_bottom','rep1_top','rep2_descent','rep2_bottom','rep2_top','rep3_descent','rep3_bottom','rep3_top']) assert.deepEqual(phase(id).boneTargets, split);
  assert.deepEqual(phase('rep1_descent').root.positionOffset, [0,-0.07,0]);
  assert.deepEqual(phase('rep1_bottom').root.positionOffset, [0,-0.14,0]);
  assert.equal(Lunge.spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(Lunge.spec.groundingPolicy.enforceContactAnchors, true);
});

test('Motion Lab Play remains gated on a successfully loaded runtime motion', () => {
  const runtime = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-runtime.js'), 'utf8');
  assert.match(runtime, /selected=Boolean\(id&&state\?\.motion&&playback!=="unloaded"\)/);
  assert.match(runtime, /disabled\(name,!selected\)/);
});

test('reference loader labels phase-first lunge v3 after wiring', () => {
  const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');
  assert.match(preview, /Load Stationary Lunge Left v3\.0 Phase-First/);
});

test('runtime compiler remains final playability authority for generated IK', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-intelligence-adapter.js'), 'utf8');
  assert.match(compiler, /if \(constrained\.status !== "ready"\)/);
  assert.match(adapter, /motion_generated_chain_ik_failed/);
  assert.match(adapter, /solveTwoBoneChain/);
});
