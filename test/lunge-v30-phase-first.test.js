const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec-v3.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v3.json'), 'utf8'));
const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }

function samePose(a, b) {
  return JSON.stringify(a.root) === JSON.stringify(b.root) && JSON.stringify(a.boneTargets) === JSON.stringify(b.boneTargets);
}

test('phase-first lunge v3 removes independent step pose authority', () => {
  assert.equal(Lunge.spec.version, 3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_phase_first_v3_0_split_authority');
  assert.equal(Lunge.spec.authoringModel.stepDefinition, 'the transition from stand_start directly into split_plant is the step');
  assert.equal(Lunge.spec.phaseOrder.includes('step_forward'), false);
  assert.deepEqual(Lunge.spec.phaseOrder.slice(0, 2), ['stand_start', 'split_plant']);
});

test('every loaded top returns to the exact split authority pose', () => {
  const split = phase('split_plant');
  for (const id of ['rep1_top', 'rep2_top', 'rep3_top']) {
    assert.equal(samePose(phase(id), split), true, `${id} must equal split_plant`);
  }
});

test('loaded descent is vertical-dominant and contacts remain planted', () => {
  for (const id of ['rep1_descent','rep1_bottom','rep2_descent','rep2_bottom','rep3_descent','rep3_bottom']) {
    const item = phase(id);
    assert.equal(item.root.positionOffset[0], 0);
    assert.equal(item.root.positionOffset[2], 0);
    assert.deepEqual(item.contacts, ['left_front_foot', 'right_rear_forefoot']);
  }
  assert.equal(phase('step_back').contacts.length, 0);
});

test('v3 validator and contract encode owner-first split calibration', () => {
  const validation = Lunge.validate(Lunge.spec);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(contract.phaseAuthority.forbidIndependentStepPose, true);
  assert.equal(contract.phaseAuthority.splitAuthorityPhaseId, 'split_plant');
  assert.equal(contract.canonicalMotion.splitCalibrationStatus, 'owner_recalibration_required');
  assert.match(contract.acceptanceBoundary, /only a seed/i);
});

test('Motion Lab preview loads v3 without deleting v2.3 fallback source', () => {
  assert.match(preview, /lunge-motion-spec-v3\.js/);
  assert.match(preview, /PocketPTLungePhaseFirstMotionSpec/);
  assert.match(preview, /v3\.0 Phase-First/);
  assert.equal(fs.existsSync(path.join(ROOT, 'public/motion/lunge-motion-spec.js')), true);
});
