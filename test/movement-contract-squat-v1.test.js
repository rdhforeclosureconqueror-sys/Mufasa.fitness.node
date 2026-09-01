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
  assert.ok(contract.coachCues.some(cue => /hips down and slightly back/i.test(cue)));
  assert.ok(contract.compensationSignals.some(signal => signal.id === 'knee_valgus'));
});

test('squat contract does not encode a universal knees-behind-toes rule', () => {
  assert.equal(contract.kneeTracking.toeLinePolicy, 'do_not_hard_fail_only_because_the_knee_passes_the_toes');
  assert.match(contract.kneeTracking.sideViewRule, /heel contact/i);
  assert.match(contract.kneeTracking.sideViewRule, /ankle dorsiflexion/i);
});

test('squat v3 references the canonical movement contract and passes structural preflight', () => {
  assert.equal(squat.spec.movementContractRef, '/motion/contracts/bodyweight-squat.v1.json');
  const result = validator.preflight(squat.spec, contract);
  assert.equal(result.valid, true, result.failures.join('\n'));
});

test('pose evaluator rejects bottom angle outside the engineering target and excessive foot residual', () => {
  const bad = validator.evaluatePoseSample({ phaseId: 'bottom', insideKneeAngleDegrees: 113, leftFootResidual: 0.03, rightFootResidual: 0.01 }, contract);
  assert.equal(bad.valid, false);
  assert.equal(bad.checks.find(check => check.id === 'bottom_knee_angle').pass, false);
  assert.equal(bad.checks.find(check => check.id === 'dual_foot_anchor').pass, false);
});
