'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const lunge = require('../public/motion/lunge-motion-spec');
const adapter = require('../public/motion/motion-lab-intelligence-adapter');
const adapterSource = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-intelligence-adapter.js'), 'utf8');

function byId(id) {
  return lunge.spec.phases.find(phase => phase.id === id);
}

function rootY(id) {
  return byId(id)?.root?.positionOffset?.[1];
}

function poseSignature(id) {
  return JSON.stringify(byId(id)?.boneTargets || []);
}

test('stationary lunge defines three generated descent-bottom-ascent repetitions after split_plant', () => {
  assert.equal(lunge.spec.repetitionPlan.count, 3);
  assert.deepEqual(Array.from(lunge.spec.phaseOrder), [
    'stand_start', 'split_plant',
    'rep1_descent', 'rep1_bottom', 'rep1_top',
    'rep2_descent', 'rep2_bottom', 'rep2_top',
    'rep3_descent', 'rep3_bottom', 'rep3_top',
    'stand_finish'
  ]);

  for (const rep of [1, 2, 3]) {
    assert.ok(rootY(`rep${rep}_descent`) < rootY('split_plant'));
    assert.ok(rootY(`rep${rep}_bottom`) < rootY(`rep${rep}_descent`));
    assert.equal(rootY(`rep${rep}_top`), rootY('split_plant'));
    assert.equal(poseSignature(`rep${rep}_descent`), poseSignature('split_plant'));
    assert.equal(poseSignature(`rep${rep}_bottom`), poseSignature('split_plant'));
    assert.equal(poseSignature(`rep${rep}_top`), poseSignature('split_plant'));
  }

  assert.equal(lunge.spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(byId('stand_finish').contacts.length, 0);
});

test('generated IK owns planted-foot correction so authored pelvis descent is not cancelled', () => {
  assert.equal(adapter.VERSION, '1.2.0-phase4-generated-ik-preserves-root-trajectory');
  assert.match(adapter.VERSION, /phase4/);
  assert.match(adapterSource, /generatedIKOwnsContactSolve = chains\.length > 0/);
  assert.match(adapterSource, /SKIPPED_FOR_GENERATED_IK/);
  assert.match(adapterSource, /if \(!generatedIKOwnsContactSolve\) \{\s*correction = coreApi\.solveRootAnchorCorrection/);
  assert.match(adapterSource, /rootTrajectoryPreserved: generatedIKOwnsContactSolve/);
});

test('contact-only phases retain the existing root anchor correction path', () => {
  const correctionCalls = adapterSource.match(/solveRootAnchorCorrection/g) || [];
  assert.equal(correctionCalls.length, 1);
  assert.match(adapterSource, /if \(!generatedIKOwnsContactSolve\)/);
});
