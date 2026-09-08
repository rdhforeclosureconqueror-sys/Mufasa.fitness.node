'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adapter = require('../public/motion/motion-lab-intelligence-adapter');
const lunge = require('../public/motion/lunge-motion-spec');
const compilerSource = fs.readFileSync(path.join(__dirname, '../public/motion/motion-spec-clip.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(__dirname, '../public/motion/motion-lab-intelligence-adapter.js'), 'utf8');
const diagnosticsSource = fs.readFileSync(path.join(__dirname, '../public/motion/motion-lab-intelligence-diagnostics.js'), 'utf8');

test('Phase 4 extends the shared adapter with generated IK without a second retargeter', () => {
  assert.match(adapter.VERSION, /phase4/);
  assert.equal(typeof adapter.solvePhaseContacts, 'function');
  assert.equal(typeof adapter.PHASE4_DEFAULTS, 'object');
  assert.match(adapterSource, /solveTwoBoneChain/);
  assert.doesNotMatch(adapterSource, /stationary_lunge_left|RightToeBase|LeftUpLeg/);
});

test('lunge declares generic hip-knee-ankle chains and preserves toe as a contact offset', () => {
  const spec = lunge.spec;
  assert.equal(spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(spec.groundingPolicy.kinematicChains.length, 2);
  const rear = spec.groundingPolicy.kinematicChains.find(chain => chain.id === 'right_leg');
  assert.equal(rear.rootBone, 'mixamorig:RightUpLeg');
  assert.equal(rear.jointBone, 'mixamorig:RightLeg');
  assert.equal(rear.endBone, 'mixamorig:RightFoot');
  assert.equal(rear.contactBone, 'mixamorig:RightToeBase');
  assert.notEqual(rear.endBone, rear.contactBone);
  assert.equal(lunge.validate(spec).valid, true);
});

test('compiler captures chain lengths and rigid end-to-contact offset from anchor pose', () => {
  assert.match(compilerSource, /chainProfiles/);
  assert.match(compilerSource, /worldToLocal\(contactWorld\.clone\(\)\)/);
  assert.match(compilerSource, /length1 = hip\.distanceTo\(knee\)/);
  assert.match(compilerSource, /length2 = knee\.distanceTo\(ankle\)/);
  assert.match(compilerSource, /motion_kinematic_chain_invalid_lengths/);
});

test('compiler persists post-solve local quaternions into the generated animation clip', () => {
  assert.match(compilerSource, /phaseBoneQuaternions/);
  assert.match(compilerSource, /phaseBoneQuaternions\.get\(name\)\.push\(resolved\.get\(name\)\.object\.quaternion\.clone\(\)\)/);
  assert.match(compilerSource, /postSolveTracksCaptured: true/);
  assert.match(compilerSource, /const values = captured\.flatMap\(quaternion => quaternion\.toArray\(\)\)/);
});

test('generated IK is fail-closed on chain solve, chain residual, and contact residual failures', () => {
  assert.match(adapterSource, /motion_generated_chain_ik_failed/);
  assert.match(adapterSource, /motion_generated_chain_residual_failed/);
  assert.match(adapterSource, /motion_generated_contact_residual_failed/);
  assert.match(adapterSource, /CHAIN_CONTACT_DRIFT/);
  assert.match(compilerSource, /motion_phase_kinematic_chain_unresolved/);
});

test('Phase 4 diagnostics expose per-chain first-failure evidence in the consolidated report', () => {
  assert.match(diagnosticsSource, /Generated IK:/);
  assert.match(diagnosticsSource, /Post-solve tracks captured:/);
  assert.match(diagnosticsSource, /Max chain residual:/);
  assert.match(diagnosticsSource, /chainResidual=/);
  assert.match(diagnosticsSource, /contactResidual=/);
  assert.match(diagnosticsSource, /firstFailure=/);
});
