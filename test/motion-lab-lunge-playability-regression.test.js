'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function pitch(id, bone) { return phase(id)?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0]; }

test('active lunge v2.3 stays on the last known-playable v2.1 geometry lineage', () => {
  assert.equal(Lunge.spec.version, 2.3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_3_playable_base_owner_split_knee');
  assert.equal(Lunge.spec.lineage.playableBaseMotionId, 'lunge/stationary_left_movement_definition_v2_1_exit_release');
  assert.equal(Lunge.spec.lineage.rejectedGeometryFamily, 'v2.2-long-stride');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.validate(Lunge.spec).valid, true);
  assert.deepEqual(phase('step_back').contacts, []);

  // Known-playable v2.1 geometry. These values must not silently drift back to the rejected v2.2 family.
  assert.equal(pitch('step_forward', 'mixamorig:LeftUpLeg'), 34);
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 24);
  assert.equal(pitch('rep1_bottom', 'mixamorig:LeftLeg'), -72);
  assert.equal(pitch('rep1_bottom', 'mixamorig:RightLeg'), -82);
});

test('owner split-plant correction is promoted without changing repetition-top lineage', () => {
  assert.equal(Lunge.spec.acceptedAuthoringAdjustment.basePitchDegrees, -7);
  assert.equal(Lunge.spec.acceptedAuthoringAdjustment.approvedDeltaDegrees, 5);
  assert.equal(Lunge.spec.acceptedAuthoringAdjustment.canonicalPitchDegrees, -2);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -2);
  for (const id of ['rep1_top', 'rep2_top', 'rep3_top']) assert.equal(pitch(id, 'mixamorig:RightLeg'), -7);
});

test('Motion Lab Play remains gated on a successfully loaded runtime motion', () => {
  const runtime = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-runtime.js'), 'utf8');
  assert.match(runtime, /selected=Boolean\(id&&state\?\.motion&&playback!=="unloaded"\)/);
  assert.match(runtime, /\["playAnimation","restartAnimation","unloadAnimation","loopAnimation"\]/);
  assert.match(runtime, /disabled\(name,!selected\)/);
});

test('reference UI identifies the playable-base lunge as v2.3', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  assert.match(html, /Load Stationary Lunge Left v2\.3 \(Reference Only\)/);
});

test('runtime compiler remains the final playability authority for generated IK', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-intelligence-adapter.js'), 'utf8');
  assert.match(compiler, /if \(constrained\.status !== "ready"\)/);
  assert.match(compiler, /status: "failed"/);
  assert.match(adapter, /motion_generated_chain_ik_failed/);
  assert.match(adapter, /solveTwoBoneChain/);
});
