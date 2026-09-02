const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v1.json'), 'utf8'));

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }
function rot(item, bone) { return item.boneTargets.find(target => target.bone === bone).rotationOffsetEulerDegrees[0]; }

test('stationary left lunge v2 validates and stays development-only', () => {
  const result = Lunge.validate(Lunge.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Lunge.spec.version, 2);
  assert.equal(Lunge.spec.motionId, 'lunge/stationary_left_synthesized_engineering_v2_rear_toe_grounded');
  assert.equal(Lunge.spec.status, 'development-test-only');
  assert.equal(Lunge.spec.exerciseId, 'stationary_lunge_left');
  assert.equal(Lunge.spec.synthesisBoundary.copiedNamedLungeAnimation, false);
});

test('lunge v2 preserves asymmetric split stance and returns to the same stance', () => {
  const start = phase('start');
  const finish = phase('finish');
  assert.ok(rot(start, 'mixamorig:LeftUpLeg') > 0);
  assert.ok(rot(start, 'mixamorig:RightUpLeg') < 0);
  assert.deepEqual(start.root, finish.root);
  assert.deepEqual(start.boneTargets, finish.boneTargets);
});

test('lunge v2 makes rear toe contact a hard authored-anchor requirement', () => {
  assert.equal(Lunge.spec.groundingPolicy.enforceContactAnchors, true);
  assert.equal(Lunge.spec.groundingPolicy.anchorPhaseId, 'start');
  assert.equal(Lunge.spec.groundingPolicy.contactBones.left_front_foot, 'mixamorig:LeftFoot');
  assert.equal(Lunge.spec.groundingPolicy.contactBones.right_rear_forefoot, 'mixamorig:RightToeBase');
  assert.equal(Lunge.spec.groundingPolicy.anchorValidity.rejectAirborneRearToe, true);
  assert.match(Lunge.spec.groundingPolicy.anchorValidity.reviewRule, /right rear toe above the front-foot ground plane/i);
  for (const item of Lunge.spec.phases) assert.deepEqual(item.contacts, ['left_front_foot', 'right_rear_forefoot']);
});

test('lunge v2 keeps front-leg behavior while reorienting rear chain for knee-down motion', () => {
  const start = phase('start');
  const bottom = phase('bottom');
  assert.ok(bottom.root.positionOffset[1] <= -0.22);
  assert.ok(rot(bottom, 'mixamorig:LeftLeg') < rot(start, 'mixamorig:LeftLeg'));
  assert.ok(rot(bottom, 'mixamorig:RightLeg') <= -90);
  assert.ok(Math.abs(rot(bottom, 'mixamorig:RightUpLeg')) < Math.abs(rot(start, 'mixamorig:RightUpLeg')));
  assert.ok(rot(start, 'mixamorig:RightLeg') > -10, 'rear knee should begin nearly extended so toe can establish low');
});

test('canonical lunge contract explicitly requires grounded right toe and rear-knee descent', () => {
  assert.equal(contract.setup.stance.frontSide, 'left');
  assert.equal(contract.setup.contacts.flightPermitted, false);
  assert.match(contract.setup.contacts.rearFoot.rule, /right_toe_ball_of_foot_planted/);
  assert.match(contract.setup.contacts.anchorEstablishmentRule, /airborne rear-toe anchor is invalid/i);
  assert.equal(contract.numericalTargets.frontKneeInsideAngleDegrees.bottomTarget, 90);
  assert.equal(contract.numericalTargets.rearKneeInsideAngleDegrees.bottomTarget, 90);
  assert.ok(contract.hardConstraints.includes('rear_knee_descends_toward_floor'));
  assert.ok(contract.hardConstraints.includes('valid_grounded_contact_anchor_establishment'));
  assert.ok(contract.compensationSignals.some(signal => signal.id === 'rear_leg_swinging'));
  assert.ok(contract.coachCues.some(cue => /right rear knee down toward the floor/i.test(cue)));
  assert.match(contract.sourceEvidenceBoundary, /not treated as a canonical lunge/i);
});

test('motion compiler still supports authored anchor phase needed by split stance', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  assert.match(compiler, /anchorPhaseId/);
  assert.match(compiler, /applyAuthoredPhasePose\(anchorPhase\)/);
  assert.match(compiler, /motion_contact_anchor_phase_missing/);
});

test('Motion Lab still exposes synthesized lunge through protected asset graph', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
  assert.match(html, /Load Synthesized Lunge Left v1 \(Reference Only\)/);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/lunge-motion-spec.js') >= 0);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js') > bootstrap.indexOf('/dev/motion-lab-runtime.js'));
});
