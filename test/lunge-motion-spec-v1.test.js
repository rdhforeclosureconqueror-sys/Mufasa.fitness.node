'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v3.json'), 'utf8'));
const phase = id => Lunge.spec.phases.find(item => item.id === id);
const pitch = (id, bone) => phase(id)?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0];

test('stationary left lunge v3 validates as a phase-first reset', () => {
  const result = Lunge.validate(Lunge.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Lunge.spec.version, 3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_phase_first_v3_owner_split_plant');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.spec.lineage.resetMethod, 'phase-first-owner-split-plant');
  assert.equal(phase('step_forward'), undefined);
  assert.equal(phase('step_back'), undefined);
});

test('owner step-forward edit is promoted as the absolute split plant pose', () => {
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 79);
  assert.equal(pitch('split_plant', 'mixamorig:LeftLeg'), -84);
  assert.equal(pitch('split_plant', 'mixamorig:LeftFoot'), 8);
  assert.equal(pitch('split_plant', 'mixamorig:RightUpLeg'), -49);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -14);
  assert.equal(pitch('split_plant', 'mixamorig:RightFoot'), 9);
  const deltas = new Map(Lunge.spec.acceptedAuthoringAdjustment.deltas.map(item => [item.bone, item]));
  assert.deepEqual(deltas.get('mixamorig:LeftUpLeg'), { bone:'mixamorig:LeftUpLeg', axis:'x', deltaDegrees:45, baseDegrees:34, canonicalDegrees:79 });
  assert.equal(deltas.get('mixamorig:LeftLeg').canonicalDegrees, -84);
});

test('all loaded phases inherit split pose while pelvis trajectory creates down and up', () => {
  const split = phase('split_plant').boneTargets;
  for (const id of ['rep1_descent','rep1_bottom','rep1_top','rep2_descent','rep2_bottom','rep2_top','rep3_descent','rep3_bottom','rep3_top']) {
    assert.deepEqual(phase(id).boneTargets, split);
    assert.deepEqual(phase(id).contacts, ['left_front_foot','right_rear_forefoot']);
  }
  assert.deepEqual(phase('rep1_descent').root.positionOffset, [0,-0.07,0]);
  assert.deepEqual(phase('rep1_bottom').root.positionOffset, [0,-0.14,0]);
  assert.deepEqual(phase('rep1_top').root.positionOffset, [0,0,0]);
});

test('generated IK and contacts remain final loaded-leg authority', () => {
  assert.equal(Lunge.spec.groundingPolicy.enforceContactAnchors, true);
  assert.equal(Lunge.spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(Lunge.spec.groundingPolicy.anchorPhaseId, 'split_plant');
  assert.equal(Lunge.spec.groundingPolicy.kinematicChains.length, 2);
  assert.equal(Lunge.spec.trajectoryPolicy.phaseAuthority.includes('generated IK'), true);
});

test('start and finish are identical neutral standing with contacts released', () => {
  assert.deepEqual(phase('stand_start').root, phase('stand_finish').root);
  assert.deepEqual(phase('stand_start').boneTargets, phase('stand_finish').boneTargets);
  assert.deepEqual(phase('stand_start').contacts, []);
  assert.deepEqual(phase('stand_finish').contacts, []);
});

test('v3 movement contract matches runtime split calibration and phase order', () => {
  assert.equal(contract.schemaVersion, 3);
  assert.equal(contract.canonicalMotion.motionId, Lunge.spec.motionId);
  assert.equal(contract.canonicalMotion.version, Lunge.spec.version);
  assert.deepEqual(contract.phaseOrder, Lunge.spec.phaseOrder);
  assert.equal(contract.ownerSplitPlantCalibration.canonicalPitchDegrees['mixamorig:LeftUpLeg'], 79);
  assert.equal(contract.ownerSplitPlantCalibration.canonicalPitchDegrees['mixamorig:RightLeg'], -14);
  assert.equal(contract.phaseAuthority.nextCalibrationTarget, 'rep1_bottom');
});

test('validator rejects old intermediate step phases and split calibration drift', () => {
  let candidate = { ...Lunge.spec, phaseOrder: ['stand_start','step_forward',...Lunge.spec.phaseOrder.slice(1)] };
  let result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_PHASE_ORDER/.test(error)));

  candidate = { ...Lunge.spec, phases: Lunge.spec.phases.map(item => item.id !== 'split_plant' ? item : { ...item, boneTargets: item.boneTargets.map(target => target.bone !== 'mixamorig:LeftLeg' ? target : { ...target, rotationOffsetEulerDegrees: [-80,0,0] }) }) };
  result = Lunge.validate(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_OWNER_SPLIT_CALIBRATION/.test(error)));
});

test('Motion Lab loader dynamically labels phase-first v3 while using protected asset graph', () => {
  const preview = fs.readFileSync(path.join(ROOT, 'public/motion/motion-lab-lunge-preview.js'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
  assert.match(preview, /Load Stationary Lunge Left v3\.0 Phase-First/);
  assert.ok(bootstrap.includes('/dev/motion-lab-assets/lunge-motion-spec.js'));
});
