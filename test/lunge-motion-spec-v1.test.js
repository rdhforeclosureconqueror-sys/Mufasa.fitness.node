const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v2.json'), 'utf8'));

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function rot(item, bone) { return item.boneTargets.find(target => target.bone === bone).rotationOffsetEulerDegrees[0]; }

test('stationary left lunge movement definition v2.3 validates and stays development-only', () => {
  const result = Lunge.validate(Lunge.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Lunge.spec.version, 2.3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_3_owner_split_knee');
  assert.equal(Lunge.spec.status, 'development-test-only');
  assert.equal(Lunge.spec.exerciseId, 'stationary_lunge_left');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.spec.movementContractRef, '/motion/contracts/stationary-lunge-left.v2.json');
  assert.equal(Lunge.spec.synthesisBoundary.copiedNamedLungeAnimation, false);
});

test('lunge v2.3 starts and finishes in the same neutral standing pose', () => {
  const start = phase('stand_start');
  const finish = phase('stand_finish');
  assert.deepEqual(start.root, finish.root);
  assert.deepEqual(start.boneTargets, finish.boneTargets);
  assert.deepEqual(start.contacts, []);
  assert.deepEqual(finish.contacts, []);
});

test('lunge v2.3 takes a materially longer forward step before split plant', () => {
  const step = phase('step_forward');
  const plant = phase('split_plant');
  assert.ok(rot(step, 'mixamorig:LeftUpLeg') >= 50, 'step must strongly flex the left hip to create stride length');
  assert.ok(rot(plant, 'mixamorig:LeftUpLeg') >= 35, 'split plant must keep the front leg meaningfully forward');
  assert.ok(rot(plant, 'mixamorig:RightUpLeg') <= -30, 'rear hip must remain extended to preserve split stance length');
  assert.ok(rot(step, 'mixamorig:LeftUpLeg') > rot(plant, 'mixamorig:LeftUpLeg'));
  assert.deepEqual(step.contacts, []);
  assert.deepEqual(plant.contacts, ['left_front_foot', 'right_rear_forefoot']);
  assert.equal(Lunge.spec.groundingPolicy.anchorPhaseId, 'split_plant');
});

test('lunge v2.3 locks the owner-approved split-plant right-knee correction without changing rep tops', () => {
  const plant = phase('split_plant');
  const rep1Top = phase('rep1_top');
  assert.equal(Lunge.spec.ownerApprovedSplitPlantAdjustment.phaseId, 'split_plant');
  assert.equal(Lunge.spec.ownerApprovedSplitPlantAdjustment.bone, 'mixamorig:RightLeg');
  assert.equal(Lunge.spec.ownerApprovedSplitPlantAdjustment.deltaDegrees, 5);
  assert.equal(Lunge.spec.ownerApprovedSplitPlantAdjustment.v2_2BaseDegrees, -6);
  assert.equal(Lunge.spec.ownerApprovedSplitPlantAdjustment.resultingDegrees, -1);
  assert.equal(rot(plant, 'mixamorig:RightLeg'), -1);
  assert.equal(rot(rep1Top, 'mixamorig:RightLeg'), -6, 'owner acceptance only covered split_plant, so rep-top pose remains unchanged');
});

test('lunge v2.3 rejects drift away from the owner-approved split-plant knee pitch', () => {
  const candidate = {
    ...Lunge.spec,
    phases: Lunge.spec.phases.map(item => item.id === 'split_plant'
      ? { ...item, boneTargets: item.boneTargets.map(target => target.bone === 'mixamorig:RightLeg' ? { ...target, rotationOffsetEulerDegrees: [-6,0,0] } : target) }
      : item)
  };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_OWNER_CALIBRATION/i.test(error)));
});

test('lunge v2.3 rejects the old short entry stance instead of only describing a 90 degree target', () => {
  const candidate = {
    ...Lunge.spec,
    phases: Lunge.spec.phases.map(item => {
      if (item.id === 'step_forward') return { ...item, boneTargets: item.boneTargets.map(target => target.bone === 'mixamorig:LeftUpLeg' ? { ...target, rotationOffsetEulerDegrees: [34,0,0] } : target) };
      if (item.id === 'split_plant') return { ...item, boneTargets: item.boneTargets.map(target => target.bone === 'mixamorig:LeftUpLeg' ? { ...target, rotationOffsetEulerDegrees: [24,0,0] } : target) };
      return item;
    })
  };
  const result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_ENTRY_GEOMETRY: step_forward/i.test(error)));
  assert.ok(result.errors.some(error => /front foot is not far enough forward/i.test(error)));
});

test('lunge v2.3 enforces authored bottom flexion consistent with the near-right-angle goal', () => {
  for (const id of ['rep1_bottom','rep2_bottom','rep3_bottom']) {
    const bottom = phase(id);
    assert.equal(bottom.root.positionOffset[1], -0.14);
    assert.ok(Math.abs(rot(bottom, 'mixamorig:LeftLeg')) >= 80);
    assert.ok(Math.abs(rot(bottom, 'mixamorig:RightLeg')) >= 85);
  }
  assert.equal(Lunge.spec.movementContract.frontKneeBottomInsideAngleTargetDegrees, 90);
  assert.equal(Lunge.spec.movementContract.rearKneeBottomInsideAngleTargetDegrees, 90);
  assert.match(Lunge.spec.movementContract.frontShinIntent, /vertical/i);
});

test('lunge v2.3 authors exactly three planted down-up repetitions', () => {
  assert.equal(Lunge.spec.repetitionPlan.count, 3);
  assert.deepEqual(Lunge.spec.repetitionPlan.bottomPhases, ['rep1_bottom', 'rep2_bottom', 'rep3_bottom']);
  const loaded = [
    'rep1_descent','rep1_bottom','rep1_top',
    'rep2_descent','rep2_bottom','rep2_top',
    'rep3_descent','rep3_bottom','rep3_top'
  ];
  for (const id of loaded) assert.deepEqual(phase(id).contacts, ['left_front_foot', 'right_rear_forefoot']);
});

test('loaded lunge trajectory stays vertical-dominant after the longer step', () => {
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

test('step back releases loaded split-stance IK authority after the third repetition', () => {
  const rep3Top = phase('rep3_top');
  const stepBack = phase('step_back');
  assert.deepEqual(rep3Top.contacts, ['left_front_foot', 'right_rear_forefoot']);
  assert.deepEqual(stepBack.contacts, []);
  assert.ok(stepBack.normalizedTime > rep3Top.normalizedTime);
});

test('canonical lunge v2 contract records stride gate and owner-approved split calibration', () => {
  assert.equal(contract.schemaVersion, 2);
  assert.equal(contract.sequence.start, 'neutral_standing');
  assert.equal(contract.sequence.loadedRepetitions, 3);
  assert.equal(contract.setup.contacts.anchorEstablishmentPhase, 'split_plant');
  assert.equal(contract.numericalTargets.entryAuthoringGate.hardFail, true);
  assert.equal(contract.numericalTargets.entryAuthoringGate.stepForwardMinimumLeftHipFlexionDegrees, 50);
  assert.equal(contract.numericalTargets.entryAuthoringGate.splitPlantMinimumLeftHipFlexionDegrees, 35);
  assert.equal(contract.numericalTargets.ownerApprovedSplitPlantRightKneePitch.approvedDeltaDegrees, 5);
  assert.equal(contract.numericalTargets.ownerApprovedSplitPlantRightKneePitch.resultingDegrees, -1);
  assert.equal(contract.numericalTargets.frontKneeInsideAngleDegrees.bottomTarget, 90);
  assert.ok(contract.hardConstraints.includes('entry_step_is_long_enough_for_near_90_degree_front_knee'));
  assert.ok(contract.hardConstraints.includes('split_plant_uses_owner_approved_right_knee_pitch'));
  assert.ok(contract.compensationSignals.some(signal => signal.id === 'entry_step_too_short'));
  assert.ok(contract.compensationSignals.some(signal => signal.id === 'split_plant_right_knee_drift'));
});

test('motion compiler still supports phase-aware contacts around the split anchor', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  assert.match(compiler, /anchorPhaseId/);
  assert.match(compiler, /applyAuthoredPhasePose\(anchorPhase\)/);
  assert.match(compiler, /phase\.contacts\?\.length/);
  assert.match(compiler, /phase\.contacts\.includes\(chain\.contact\)/);
});

test('Motion Lab exposes canonical lunge v2.3 through protected asset graph', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
  assert.match(html, /Load Stationary Lunge Left v2\.3 \(Reference Only\)/);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/lunge-motion-spec.js') >= 0);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js') > bootstrap.indexOf('/dev/motion-lab-runtime.js'));
});
