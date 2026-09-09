const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Ohsa = require('../public/motion/overhead-squat-assessment-motion-spec');

test('OHSA motion spec validates and exposes three controlled reps', () => {
  const result = Ohsa.validate(Ohsa.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Ohsa.spec.exerciseId, 'overhead_squat_assessment');
  assert.equal(Ohsa.spec.repetitionPlan.count, 3);
  assert.equal(Ohsa.spec.loop, false);
  assert.deepEqual(Ohsa.spec.groundingPolicy.contacts, ['left_foot', 'right_foot']);
  assert.equal(Ohsa.spec.groundingPolicy.enforceContactAnchors, true);
});

test('OHSA holds straight overhead-arm targets through every phase', () => {
  const armPitch = phase => phase.boneTargets.find(item => item.bone === 'mixamorig:LeftArm').rotationOffsetEulerDegrees[0];
  const rightArmPitch = phase => phase.boneTargets.find(item => item.bone === 'mixamorig:RightArm').rotationOffsetEulerDegrees[0];
  const leftElbow = phase => phase.boneTargets.find(item => item.bone === 'mixamorig:LeftForeArm').rotationOffsetEulerDegrees[0];
  const rightElbow = phase => phase.boneTargets.find(item => item.bone === 'mixamorig:RightForeArm').rotationOffsetEulerDegrees[0];
  const pitches = new Set(Ohsa.spec.phases.map(armPitch));
  assert.equal(pitches.size, 1);
  for (const phase of Ohsa.spec.phases) {
    assert.equal(rightArmPitch(phase), armPitch(phase));
    assert.equal(leftElbow(phase), 0);
    assert.equal(rightElbow(phase), 0);
  }
  assert.equal(Ohsa.spec.synthesisBoundary.overheadPoseStatus, 'provisional-owner-calibration-required');
});

test('OHSA phase-first sequence returns to exact overhead top after each rep', () => {
  const byId = new Map(Ohsa.spec.phases.map(item => [item.id, item]));
  const setup = byId.get('setup_overhead');
  for (const id of ['rep1_top', 'rep2_top', 'rep3_top', 'finish_overhead']) {
    assert.deepEqual(byId.get(id).boneTargets, setup.boneTargets);
    assert.deepEqual(byId.get(id).root.positionOffset, [0, 0, 0]);
  }
  for (const id of ['rep1_bottom', 'rep2_bottom', 'rep3_bottom']) {
    assert.ok(byId.get(id).root.positionOffset[1] < 0);
    assert.ok(byId.get(id).root.positionOffset[2] < 0);
  }
});

test('OHSA keeps demonstration separate from scoring and lists review views/checkpoints', () => {
  const summary = Ohsa.summary();
  assert.equal(summary.productionAssessmentScoring, false);
  assert.equal(summary.requiresHumanVisualCalibration, true);
  assert.deepEqual(summary.observationViews, ['front', 'right_side', 'back_optional']);
  assert.ok(summary.observationCheckpoints.includes('knee_tracking'));
  assert.ok(summary.observationCheckpoints.includes('arms_overhead_retention'));
});

test('Motion Lab lunge bridge installs OHSA as a separate Coach Avatar test button', () => {
  const bridge = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');
  const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-overhead-squat-assessment-preview.js'), 'utf8');
  assert.match(bridge, /loadOverheadSquatAssessment/);
  assert.match(bridge, /overhead-squat-assessment-motion-spec\.js/);
  assert.match(bridge, /motion-lab-overhead-squat-assessment-preview\.js/);
  assert.match(preview, /buildCoachSpec/);
  assert.match(preview, /ownerCalibrationTarget:\s*"setup_overhead"/);
});

test('OHSA movement contract states the information required to obtain the desired result', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/overhead-squat-assessment.v1.json'), 'utf8'));
  assert.equal(contract.exerciseId, 'overhead_squat_assessment');
  assert.ok(contract.inputsRequiredForDesiredMotion.startPosition.length >= 6);
  assert.ok(contract.inputsRequiredForDesiredMotion.phaseSequence.length >= 4);
  assert.ok(contract.inputsRequiredForDesiredMotion.contactConstraints.length >= 2);
  assert.ok(contract.inputsRequiredForDesiredMotion.trajectoryConstraints.length >= 5);
  assert.equal(contract.inputsRequiredForDesiredMotion.timing.repetitions, 3);
  assert.equal(contract.calibrationPolicy.provisionalField, 'initial overhead arm rotation seed');
});
