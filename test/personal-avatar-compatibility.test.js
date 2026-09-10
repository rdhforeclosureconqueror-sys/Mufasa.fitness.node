const test = require('node:test');
const assert = require('node:assert/strict');
const compatibility = require('../public/motion/personal-avatar-compatibility.js');

const completeBones = compatibility.REQUIRED_CANONICAL_JOINTS.slice();

test('reports full canonical coverage for semantic personalized skeleton', () => {
  const result = compatibility.inspect({
    mounted: true,
    avatar: { avatarId: 'member-avatar', skeletonProfile: 'avaturn-native-v1' },
    skeleton: { bones: completeBones.map(name => ({ name })) },
    animations: [{ name: 'Idle' }, { name: 'Walk' }],
    restPoseValid: true
  });
  assert.equal(result.mappingCoverage, `${completeBones.length}/${completeBones.length}`);
  assert.equal(result.firstFailure, 'NONE');
  assert.equal(result.canonicalMap.Hips, 'Hips');
  assert.equal(result.canonicalMap.Spine2, 'Spine2');
});

test('maps source Mixamo aliases to canonical semantic joints', () => {
  const mixamo = completeBones.map(name => `mixamorig:${name}`);
  const result = compatibility.buildCanonicalMap(mixamo);
  assert.equal(result.unmapped.length, 0);
  assert.equal(result.map.LeftArm, 'mixamorig:LeftArm');
  assert.equal(result.map.Spine2, 'mixamorig:Spine2');
});

test('maps Three.js-sanitized Mixamo runtime names to canonical semantic joints', () => {
  const sanitized = completeBones.map(name => `mixamorig${name}`);
  const result = compatibility.buildCanonicalMap(sanitized);
  assert.equal(result.unmapped.length, 0);
  assert.equal(result.map.Hips, 'mixamorigHips');
  assert.equal(result.map.LeftArm, 'mixamorigLeftArm');
  assert.equal(result.map.Spine2, 'mixamorigSpine2');
});

test('FIRST FAILURE stops at first unresolved compatibility boundary', () => {
  const result = compatibility.inspect({
    mounted: true,
    avatar: { avatarId: 'member-avatar' },
    skeleton: { bones: [{ name: 'Hips' }, { name: 'Spine' }] },
    animations: [],
    restPoseValid: false
  });
  assert.equal(result.firstFailure, 'CANONICAL_MAP_RESOLVED');
  assert.ok(result.unmapped.some(item => item.joint === 'LeftArm'));
  assert.ok(result.unmapped.some(item => item.joint === 'Spine2'));
  assert.match(compatibility.formatReport(result), /FIRST FAILURE: CANONICAL_MAP_RESOLVED/);
});

test('embedded clips are classified as stacking risks rather than silently played', () => {
  const result = compatibility.classifyEmbeddedAnimations({ animations: ['Idle', { name: 'Walk' }] });
  assert.deepEqual(result.map(x => x.policy), [
    'disable-before-pocketpt-custom-motion',
    'disable-before-pocketpt-custom-motion'
  ]);
});
