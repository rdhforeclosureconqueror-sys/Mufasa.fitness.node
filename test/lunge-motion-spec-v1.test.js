const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v2.json'), 'utf8'));

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function rot(item, bone) { return item.boneTargets.find(target => target.bone === bone).rotationOffsetEulerDegrees[0]; }

test('stationary left lunge movement definition v2.1 validates and stays development-only', () => {
  const result = Lunge.validate(Lunge.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Lunge.spec.version, 2.1);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_1_exit_release');
  assert.equal(Lunge.spec.status, 'development-test-only');
  assert.equal(Lunge.spec.exerciseId, 'stationary_lunge_left');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.spec.movementContractRef, '/motion/contracts/stationary-lunge-left.v2.json');
  assert.equal(Lunge.spec.synthesisBoundary.copiedNamedLungeAnimation, false);
});

test('lunge v2.1 starts and finishes in the same neutral standing pose', () => {
  const start = phase('stand_start');
  const finish = phase('stand_finish');
  assert.ok(start);
  assert.ok(finish);
  assert.deepEqual(start.root, finish.root);
  assert.deepEqual(start.boneTargets, finish.boneTargets);
  assert.deepEqual(start.contacts, []);
  assert.deepEqual(finish.contacts, []);
  assert.equal(rot(start, 'mixamorig:LeftUpLeg'), 0);
  assert.equal(rot(start, 'mixamorig:RightUpLeg'), 0);
});

test('lunge v2.1 explicitly steps forward before establishing split-stance anchors', () => {
  const step = phase('step_forward');
  const plant = phase('split_plant');
  assert.ok(rot(step, 'mixamorig:LeftUpLeg') > 0);
  assert.ok(rot(plant, 'mixamorig:LeftUpLeg') > 0);
  assert.ok(rot(plant, 'mixamorig:RightUpLeg') < 0);
  assert.deepEqual(step.contacts, []);
  assert.deepEqual(plant.contacts, ['left_front_foot', 'right_rear_forefoot']);
  assert.equal(Lunge.spec.groundingPolicy.anchorPhaseId, 'split_plant');
});

test('lunge v2.1 authors exactly three planted down-up repetitions', () => {
  assert.equal(Lunge.spec.repetitionPlan.count, 3);
  assert.deepEqual(Lunge.spec.repetitionPlan.bottomPhases, ['rep1_bottom', 'rep2_bottom', 'rep3_bottom']);
  const loaded = [
    'rep1_descent','rep1_bottom','rep1_top',
    'rep2_descent','rep2_bottom','rep2_top',
    'rep3_descent','rep3_bottom','rep3_top'
  ];
  for (const id of loaded) assert.deepEqual(phase(id).contacts, ['left_front_foot', 'right_rear_forefoot']);
});

test('loaded lunge trajectory is vertical-dominant instead of forward-driven', () => {
  assert.equal(Lunge.spec.trajectoryPolicy.loadedDescent.direction, 'down');
  assert.equal(Lunge.spec.trajectoryPolicy.loadedDescent.dominantAxis, 'vertical');
  assert.equal(Lunge.spec.trajectoryPolicy.loadedAscent.direction, 'up');
  for (const id of ['rep1_descent','rep1_bottom','rep2_descent','rep2_bottom','rep3_descent','rep3_bottom']) {
    const item = phase(id);
    assert.equal(item.root.positionOffset[0], 0, `${id} should not move pelvis laterally`);
    assert.equal(item.root.positionOffset[2], 0, `${id} should not move pelvis forward/back`);
    assert.ok(item.root.positionOffset[1] < 0, `${id} should move pelvis down`);
  }
});

test('each bottom retains the reviewed lunge geometry target', () => {
  for (const id of ['rep1_bottom','rep2_bottom','rep3_bottom']) {
    const bottom = phase(id);
    assert.equal(bottom.root.positionOffset[1], -0.14);
    assert.ok(rot(bottom, 'mixamorig:LeftLeg') <= -70);
    assert.ok(rot(bottom, 'mixamorig:RightLeg') <= -80);
  }
  assert.equal(Lunge.spec.movementContract.frontKneeBottomInsideAngleTargetDegrees, 90);
  assert.equal(Lunge.spec.movementContract.rearKneeBottomInsideAngleTargetDegrees, 90);
  assert.match(Lunge.spec.movementContract.frontShinIntent, /vertical/i);
});

test('step back releases loaded split-stance IK authority after the third repetition', () => {
  const rep3Top = phase('rep3_top');
  const stepBack = phase('step_back');
  assert.deepEqual(rep3Top.contacts, ['left_front_foot', 'right_rear_forefoot']);
  assert.deepEqual(stepBack.contacts, []);
  assert.ok(stepBack.normalizedTime > rep3Top.normalizedTime);
  assert.match(Lunge.spec.groundingPolicy.rule, /release loaded anchor authority before step_back/i);
  assert.match(Lunge.spec.movementContract.exitIntent, /end loaded-lunge contact authority/i);
});

test('validator rejects reintroducing a loaded contact on the neutralizing step-back pose', () => {
  const candidate = {
    ...Lunge.spec,
    phases: Lunge.spec.phases.map(item => item.id === 'step_back' ? { ...item, contacts: ['right_rear_forefoot'] } : item)
  };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /step_back must release loaded split-stance contact authority/i.test(error)));
});

test('canonical lunge v2 contract describes stand step plant vertical reps and return', () => {
  assert.equal(contract.schemaVersion, 2);
  assert.equal(contract.sequence.start, 'neutral_standing');
  assert.equal(contract.sequence.loadedRepetitions, 3);
  assert.equal(contract.setup.contacts.anchorEstablishmentPhase, 'split_plant');
  assert.equal(contract.setup.contacts.anchorReleasePhase, 'step_back');
  assert.equal(contract.numericalTargets.frontKneeInsideAngleDegrees.bottomTarget, 90);
  assert.equal(contract.numericalTargets.rearKneeInsideAngleDegrees.bottomTarget, 90);
  assert.equal(contract.trajectory.loadedDescent.dominantDirection, 'vertical_down');
  assert.ok(contract.hardConstraints.includes('step_left_foot_forward_before_loading'));
  assert.ok(contract.hardConstraints.includes('three_loaded_repetitions'));
  assert.ok(contract.hardConstraints.includes('finish_in_same_neutral_standing_pose'));
  assert.ok(contract.coachCues.some(cue => /drive the body straight down/i.test(cue)));
  assert.ok(contract.compensationSignals.some(signal => signal.id === 'pelvis_forward_drift'));
});

test('motion compiler supports phase-aware contacts around the split anchor', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  assert.match(compiler, /anchorPhaseId/);
  assert.match(compiler, /applyAuthoredPhasePose\(anchorPhase\)/);
  assert.match(compiler, /phase\.contacts\?\.length/);
  assert.match(compiler, /phase\.contacts\.includes\(chain\.contact\)/);
});

test('Motion Lab exposes the current stationary lunge v2.1 label through protected asset graph', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
  assert.match(html, /Load Stationary Lunge Left v2\.1 \(Reference Only\)/);
  assert.doesNotMatch(html, /Load Synthesized Lunge Left v1 \(Reference Only\)/);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/lunge-motion-spec.js') >= 0);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js') > bootstrap.indexOf('/dev/motion-lab-runtime.js'));
});
