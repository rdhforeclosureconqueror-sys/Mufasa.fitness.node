const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const Lunge = require('../public/motion/lunge-motion-spec.js');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/motion/contracts/stationary-lunge-left.v1.json'), 'utf8'));

function phase(id) { return Lunge.spec.phases.find(item => item.id === id); }

test('stationary left lunge spec validates and stays development-only', () => {
  const result = Lunge.validate(Lunge.spec);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(Lunge.spec.status, 'development-test-only');
  assert.equal(Lunge.spec.exerciseId, 'stationary_lunge_left');
  assert.equal(Lunge.spec.synthesisBoundary.copiedNamedLungeAnimation, false);
});

test('lunge uses asymmetric split stance and returns to the same stance', () => {
  const start = phase('start');
  const finish = phase('finish');
  const leftStart = start.boneTargets.find(target => target.bone === 'mixamorig:LeftUpLeg');
  const rightStart = start.boneTargets.find(target => target.bone === 'mixamorig:RightUpLeg');
  assert.ok(leftStart.rotationOffsetEulerDegrees[0] > 0);
  assert.ok(rightStart.rotationOffsetEulerDegrees[0] < 0);
  assert.deepEqual(start.root, finish.root);
  assert.deepEqual(start.boneTargets, finish.boneTargets);
});

test('lunge anchors front whole foot and rear forefoot from authored split-stance start', () => {
  assert.equal(Lunge.spec.groundingPolicy.enforceContactAnchors, true);
  assert.equal(Lunge.spec.groundingPolicy.anchorPhaseId, 'start');
  assert.equal(Lunge.spec.groundingPolicy.contactBones.left_front_foot, 'mixamorig:LeftFoot');
  assert.equal(Lunge.spec.groundingPolicy.contactBones.right_rear_forefoot, 'mixamorig:RightToeBase');
  for (const item of Lunge.spec.phases) assert.deepEqual(item.contacts, ['left_front_foot', 'right_rear_forefoot']);
});

test('lunge descends vertically and deepens both knees', () => {
  const start = phase('start');
  const bottom = phase('bottom');
  assert.ok(bottom.root.positionOffset[1] < start.root.positionOffset[1]);
  const leftStartKnee = start.boneTargets.find(target => target.bone === 'mixamorig:LeftLeg').rotationOffsetEulerDegrees[0];
  const leftBottomKnee = bottom.boneTargets.find(target => target.bone === 'mixamorig:LeftLeg').rotationOffsetEulerDegrees[0];
  const rightStartKnee = start.boneTargets.find(target => target.bone === 'mixamorig:RightLeg').rotationOffsetEulerDegrees[0];
  const rightBottomKnee = bottom.boneTargets.find(target => target.bone === 'mixamorig:RightLeg').rotationOffsetEulerDegrees[0];
  assert.ok(leftBottomKnee < leftStartKnee);
  assert.ok(rightBottomKnee < rightStartKnee);
});

test('canonical lunge contract encodes coaching rules and evidence boundary', () => {
  assert.equal(contract.setup.stance.frontSide, 'left');
  assert.equal(contract.setup.contacts.flightPermitted, false);
  assert.equal(contract.numericalTargets.frontKneeInsideAngleDegrees.bottomTarget, 90);
  assert.equal(contract.numericalTargets.rearKneeInsideAngleDegrees.bottomTarget, 90);
  assert.ok(contract.coachCues.some(cue => /rear knee toward the floor/i.test(cue)));
  assert.match(contract.sourceEvidenceBoundary, /not treated as a canonical lunge/i);
});

test('motion compiler supports authored anchor phase needed by split stance', () => {
  const compiler = fs.readFileSync(path.join(ROOT, 'public/motion/motion-spec-clip.js'), 'utf8');
  assert.match(compiler, /anchorPhaseId/);
  assert.match(compiler, /applyAuthoredPhasePose\(anchorPhase\)/);
  assert.match(compiler, /motion_contact_anchor_phase_missing/);
});

test('Motion Lab exposes the synthesized lunge through protected asset graph', () => {
  const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
  assert.match(html, /Load Synthesized Lunge Left v1 \(Reference Only\)/);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/lunge-motion-spec.js') >= 0);
  assert.ok(bootstrap.indexOf('/dev/motion-lab-assets/motion-lab-lunge-preview.js') > bootstrap.indexOf('/dev/motion-lab-runtime.js'));
});
