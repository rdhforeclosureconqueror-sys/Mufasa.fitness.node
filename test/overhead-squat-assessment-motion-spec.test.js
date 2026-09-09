const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const Ohsa = require('../public/motion/overhead-squat-assessment-motion-spec');

function byId(id) {
  return Ohsa.spec.phases.find(phase => phase.id === id);
}

test('OHSA motion spec validates and exposes three controlled reps', () => {
  const result = Ohsa.validate(Ohsa.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Ohsa.spec.exerciseId, 'overhead_squat_assessment');
  assert.equal(Ohsa.spec.repetitionPlan.count, 3);
  assert.equal(Ohsa.spec.loop, false);
  assert.deepEqual(Ohsa.spec.groundingPolicy.contacts, ['left_foot', 'right_foot']);
  assert.equal(Ohsa.spec.groundingPolicy.enforceContactAnchors, true);
  assert.equal(Ohsa.spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(Ohsa.spec.groundingPolicy.anchorPhaseId, 'setup_overhead');
  assert.equal(Ohsa.spec.groundingPolicy.kinematicChains.length, 2);
});

test('OHSA holds straight overhead-arm targets through every named phase', () => {
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

test('OHSA encodes a real 0.18 second bottom hold for all three reps', () => {
  for (const rep of [1, 2, 3]) {
    const bottom = byId(`rep${rep}_bottom`);
    const hold = byId(`rep${rep}_bottom_hold`);
    assert.deepEqual(hold.root, bottom.root);
    assert.deepEqual(hold.boneTargets, bottom.boneTargets);
    const seconds = (hold.normalizedTime - bottom.normalizedTime) * Ohsa.spec.durationSeconds;
    assert.ok(Math.abs(seconds - 0.18) < 1e-9, `rep${rep} hold was ${seconds}s`);
  }
});

test('OHSA ascent mirrors descent through the same MID geometry', () => {
  for (const rep of [1, 2, 3]) {
    const descent = byId(`rep${rep}_descent_mid`);
    const ascent = byId(`rep${rep}_ascent_mid`);
    assert.deepEqual(ascent.root, descent.root);
    assert.deepEqual(ascent.boneTargets, descent.boneTargets);
  }
});

test('OHSA phase-first sequence returns to exact overhead top after each rep', () => {
  const setup = byId('setup_overhead');
  for (const id of ['rep1_top', 'rep2_top', 'rep3_top', 'finish_overhead']) {
    assert.deepEqual(byId(id).boneTargets, setup.boneTargets);
    assert.deepEqual(byId(id).root.positionOffset, [0, 0, 0]);
  }
  for (const id of ['rep1_bottom', 'rep2_bottom', 'rep3_bottom']) {
    assert.ok(byId(id).root.positionOffset[1] < 0);
    assert.ok(byId(id).root.positionOffset[2] < 0);
  }
});

test('OHSA Coach preview expands grounded transitions into solved playback samples', () => {
  const source = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-overhead-squat-assessment-preview.js'), 'utf8');
  const document = { getElementById() { return null; } };
  const window = { document };
  vm.runInNewContext(source, { window, document, Object, Array, Map, Set, JSON, Math, Number });
  const api = window.PocketPTMotionLabOverheadSquatAssessmentPreview;
  assert.equal(typeof api.densifyMappedContract, 'function');

  const mapped = {
    status: 'ready',
    spec: {
      ...Ohsa.spec,
      phases: Ohsa.spec.phases,
      groundingPolicy: Ohsa.spec.groundingPolicy
    },
    contract: { spec: Ohsa.spec },
    diagnostics: {}
  };
  const expanded = api.densifyMappedContract(mapped);
  assert.equal(expanded.status, 'ready');
  assert.ok(expanded.spec.phases.length > Ohsa.spec.phases.length);
  assert.ok(expanded.spec.playbackGroundingExpansion.insertedGroundingSamples > 0);
  assert.equal(expanded.spec.playbackGroundingExpansion.segmentsPerGroundedTransition, 4);
  assert.equal(expanded.contract.validate(expanded.spec).valid, true);

  const generated = expanded.spec.phases.filter(phase => phase.generatedPlaybackSample);
  assert.ok(generated.length > 0);
  for (const phase of generated) {
    assert.deepEqual(Array.from(phase.contacts), ['left_foot', 'right_foot']);
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
  assert.match(preview, /densifyMappedContract/);
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
