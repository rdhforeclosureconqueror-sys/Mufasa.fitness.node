const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/bodyweight-squat.v1.json'), 'utf8'));
const validator = require('../public/motion/movement-contract-validator.js');
const squat = require('../public/motion/squat-motion-spec.js');

test('bodyweight squat contract separates hard constraints, coaching cues and numeric targets', () => {
  assert.equal(contract.exerciseId, 'bodyweight_squat');
  assert.equal(contract.setup.feet.hardFail, true);
  assert.equal(contract.setup.feet.flightPermitted, false);
  assert.equal(contract.numericalTargets.insideKneeAngleDegrees.bottomTarget, 90);
  assert.ok(contract.coachCues.some(cue => /hips down and back/i.test(cue)));
  assert.ok(contract.compensationSignals.some(signal => signal.id === 'knee_valgus'));
});

test('reference squat uses a configured toe-line envelope without claiming a universal human rule', () => {
  assert.equal(contract.kneeTracking.toeLinePolicy, 'reference_generator_envelope_not_universal_human_rule');
  assert.equal(contract.numericalTargets.referenceSideGeometry.hardFailForGeneratedReference, true);
  assert.ok(contract.numericalTargets.referenceSideGeometry.posteriorPelvisTravelMinAvatarHeight > 0);
  assert.ok(contract.numericalTargets.referenceSideGeometry.bottomKneeForwardOfToeMaxAvatarHeight >= 0);
  assert.match(contract.kneeTracking.notes, /not.*universal/i);
});

test('squat v4 references the canonical movement contract and passes structural preflight', () => {
  assert.equal(squat.spec.version, 4);
  assert.equal(squat.spec.movementContractRef, '/motion/contracts/bodyweight-squat.v1.json');
  const result = validator.preflight(squat.spec, contract);
  assert.equal(result.valid, true, result.failures.join('\n'));
});

test('pose evaluator rejects bad depth, excessive foot residual and knee-dominant side geometry', () => {
  const bad = validator.evaluatePoseSample({
    phaseId: 'bottom',
    insideKneeAngleDegrees: 113,
    leftFootResidual: 0.03,
    rightFootResidual: 0.01,
    pelvisPosteriorDisplacementAvatarHeight: 0.03,
    kneeForwardOfToeAvatarHeight: 0.05,
    pelvisPosteriorToKneeAvatarHeight: 0.01
  }, contract);
  assert.equal(bad.valid, false);
  assert.equal(bad.checks.find(check => check.id === 'bottom_knee_angle').pass, false);
  assert.equal(bad.checks.find(check => check.id === 'dual_foot_anchor').pass, false);
  assert.equal(bad.checks.find(check => check.id === 'posterior_pelvis_travel').pass, false);
  assert.equal(bad.checks.find(check => check.id === 'reference_knee_forward_envelope').pass, false);
  assert.equal(bad.checks.find(check => check.id === 'pelvis_posterior_to_knee').pass, false);
});

test('pose evaluator accepts reference side geometry inside configured envelope', () => {
  const good = validator.evaluatePoseSample({
    phaseId: 'bottom',
    insideKneeAngleDegrees: 91,
    leftFootResidual: 0.004,
    rightFootResidual: 0.006,
    pelvisPosteriorDisplacementAvatarHeight: 0.11,
    kneeForwardOfToeAvatarHeight: 0.01,
    pelvisPosteriorToKneeAvatarHeight: 0.05
  }, contract);
  assert.equal(good.valid, true);
});
