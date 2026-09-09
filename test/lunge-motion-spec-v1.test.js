const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v2.json'), 'utf8'));

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function pitch(id, bone) { return phase(id)?.boneTargets?.find(item => item.bone === bone)?.rotationOffsetEulerDegrees?.[0]; }

test('stationary left lunge v2.3 validates on the recorded playable v2.1 base', () => {
  const result = Lunge.validate(Lunge.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Lunge.spec.version, 2.3);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_movement_definition_v2_3_playable_base_owner_split_knee');
  assert.equal(Lunge.spec.status, 'development-test-only');
  assert.equal(Lunge.spec.loop, false);
  assert.equal(Lunge.spec.lineage.playableBaseMotionId, 'lunge/stationary_left_movement_definition_v2_1_exit_release');
  assert.equal(Lunge.spec.lineage.rejectedGeometryFamily, 'v2.2-long-stride');
});

test('active runtime geometry matches the last-known-playable v2.1 family', () => {
  assert.equal(pitch('step_forward', 'mixamorig:LeftUpLeg'), 34);
  assert.equal(pitch('step_forward', 'mixamorig:LeftLeg'), -24);
  assert.equal(pitch('split_plant', 'mixamorig:LeftUpLeg'), 24);
  assert.equal(pitch('split_plant', 'mixamorig:RightUpLeg'), -27);
  assert.equal(pitch('rep1_descent', 'mixamorig:LeftUpLeg'), 37);
  assert.equal(pitch('rep1_bottom', 'mixamorig:LeftLeg'), -72);
  assert.equal(pitch('rep1_bottom', 'mixamorig:RightLeg'), -82);
  assert.equal(pitch('step_back', 'mixamorig:LeftUpLeg'), 34);
});

test('owner correction is -7 + 5 = -2 at split_plant only', () => {
  const adjustment = Lunge.spec.acceptedAuthoringAdjustment;
  assert.equal(adjustment.phaseId, 'split_plant');
  assert.equal(adjustment.bone, 'mixamorig:RightLeg');
  assert.equal(adjustment.basePitchDegrees, -7);
  assert.equal(adjustment.approvedDeltaDegrees, 5);
  assert.equal(adjustment.canonicalPitchDegrees, -2);
  assert.equal(pitch('split_plant', 'mixamorig:RightLeg'), -2);
  for (const id of ['rep1_top','rep2_top','rep3_top']) assert.equal(pitch(id, 'mixamorig:RightLeg'), -7);
});

test('validator rejects calibration drift and rejected v2.2 provenance', () => {
  const drift = {
    ...Lunge.spec,
    phases: Lunge.spec.phases.map(item => item.id !== 'split_plant' ? item : {
      ...item,
      boneTargets: item.boneTargets.map(target => target.bone !== 'mixamorig:RightLeg' ? target : { ...target, rotationOffsetEulerDegrees: [-1,0,0] })
    })
  };
  let result = Lunge.validate(drift);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /LUNGE_OWNER_CALIBRATION/.test(error)));

  const badProvenance = {
    ...Lunge.spec,
    acceptedAuthoringAdjustment: { ...Lunge.spec.acceptedAuthoringAdjustment, basePitchDegrees: -6, canonicalPitchDegrees: -1 }
  };
  result = Lunge.validate(badProvenance);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /-7 \+ 5 = -2/.test(error)));
});

test('start and finish match and loaded contacts remain through rep3_top only', () => {
  assert.deepEqual(phase('stand_start').root, phase('stand_finish').root);
  assert.deepEqual(phase('stand_start').boneTargets, phase('stand_finish').boneTargets);
  assert.deepEqual(phase('stand_start').contacts, []);
  assert.deepEqual(phase('stand_finish').contacts, []);
  for (const id of ['rep1_descent','rep1_bottom','rep1_top','rep2_descent','rep2_bottom','rep2_top','rep3_descent','rep3_bottom','rep3_top']) {
    assert.deepEqual(phase(id).contacts, ['left_front_foot','right_rear_forefoot']);
  }
  assert.deepEqual(phase('step_back').contacts, []);
});

test('loaded lunge trajectory stays vertical-dominant with generated IK/contact enforcement', () => {
  assert.equal(Lunge.spec.trajectoryPolicy.loadedDescent.direction, 'down');
  assert.equal(Lunge.spec.trajectoryPolicy.loadedDescent.dominantAxis, 'vertical');
  assert.equal(Lunge.spec.trajectoryPolicy.loadedAscent.direction, 'up');
  assert.equal(Lunge.spec.groundingPolicy.enforceContactAnchors, true);
  assert.equal(Lunge.spec.groundingPolicy.enforceGeneratedIK, true);
  assert.equal(Lunge.spec.groundingPolicy.anchorPhaseId, 'split_plant');
  for (const id of ['rep1_descent','rep1_bottom','rep2_descent','rep2_bottom','rep3_descent','rep3_bottom']) {
    assert.equal(phase(id).root.positionOffset[0], 0);
    assert.equal(phase(id).root.positionOffset[2], 0);
    assert.ok(phase(id).root.positionOffset[1] < 0);
  }
});

test('canonical movement contract is aligned with the playable-base runtime source', () => {
  assert.equal(contract.schemaVersion, 2);
  assert.equal(contract.sequence.start, 'neutral_standing');
  assert.equal(contract.sequence.loadedRepetitions, 3);
  assert.equal(contract.setup.contacts.anchorEstablishmentPhase, 'split_plant');
  assert.equal(contract.canonicalMotion.motionId, Lunge.spec.motionId);
  assert.equal(contract.canonicalMotion.playableBaseMotionId, Lunge.spec.lineage.playableBaseMotionId);
  assert.equal(contract.canonicalMotion.rejectedGeometryFamily, Lunge.spec.lineage.rejectedGeometryFamily);
  assert.equal(contract.ownerCalibration.basePitchDegrees, -7);
  assert.equal(contract.ownerCalibration.approvedDeltaDegrees, 5);
  assert.equal(contract.ownerCalibration.requiredPitchDegrees, -2);
  assert.equal(contract.ownerCalibration.repTopPitchDegrees, -7);
  assert.equal(contract.authoredReferenceGeometry.stepForwardLeftHipFlexionDegrees, 34);
  assert.equal(contract.authoredReferenceGeometry.splitPlantLeftHipFlexionDegrees, 24);
  assert.equal(contract.authoredReferenceGeometry.bottomFrontKneePitchDegrees, -72);
  assert.equal(contract.authoredReferenceGeometry.bottomRearKneePitchDegrees, -82);
});

test('motion compiler still supports phase-aware generated IK contacts', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  assert.match(compiler, /anchorPhaseId/);
  assert.match(compiler, /applyAuthoredPhasePose\(anchorPhase\)/);
  assert.match(compiler, /phase\.contacts\?\.length/);
  assert.match(compiler, /phase\.contacts\.includes\(chain\.contact\)/);
});

test('Motion Lab exposes v2.3 through the protected asset graph', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
  assert.match(html, /Load Stationary Lunge Left v2\.3 \(Reference Only\)/);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/lunge-motion-spec.js') >= 0);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js') > bootstrap.indexOf('/dev/motion-lab-runtime.js'));
});
