const test = require('node:test');
const assert = require('node:assert/strict');
const compatibility = require('../public/motion/personal-avatar-compatibility.js');

global.PocketPTPersonalAvatarCompatibility = compatibility;
global.PocketPTAvatarProfiles = { profiles: { personalized: { avatarId: 'member-avatar', skeletonProfile: 'avaturn-native-v1' } } };
const gym = require('../public/motion/motion-lab-gym-compatibility.js');

const required = compatibility.REQUIRED_CANONICAL_JOINTS;

test('inspects loaded personalized avatar through Phase 0 authority', () => {
  const report = gym.inspectRuntime({ mounted: true, skeleton: { bones: required }, animations: ['Idle', 'Walk', 'Run'], restPoseValid: true });
  assert.equal(report.firstFailure, 'NONE');
  assert.equal(report.mappingCoverage, `${required.length}/${required.length}`);
});

test('owner correction resolves an unmapped canonical joint', () => {
  const bones = required.filter(name => name !== 'LeftArm').concat('upper_arm_L');
  const initial = gym.inspectRuntime({ mounted: true, skeleton: { bones }, animations: ['Idle'], restPoseValid: true });
  assert.equal(initial.firstFailure, 'CANONICAL_MAP_RESOLVED');
  const corrected = gym.applyCorrection(initial, 'LeftArm', 'upper_arm_L');
  assert.equal(corrected.canonicalMap.LeftArm, 'upper_arm_L');
  assert.equal(corrected.unmapped.length, 0);
  assert.equal(corrected.firstFailure, 'NONE');
});

test('owner correction rejects reusing a raw bone already assigned to another canonical joint', () => {
  const bones = required.filter(name => name !== 'LeftArm').concat('upper_arm_L');
  const initial = gym.inspectRuntime({ mounted: true, skeleton: { bones }, animations: ['Idle'], restPoseValid: true });
  assert.throws(() => gym.applyCorrection(initial, 'LeftArm', 'Hips'), /already mapped/);
});

test('mapping profile cannot save with unresolved required bones', () => {
  const report = gym.inspectRuntime({ mounted: true, skeleton: { bones: ['Hips'] }, restPoseValid: true });
  assert.throws(() => gym.createMappingProfile(report, { restPoseValid: true }), /unresolved required joint/);
});

test('mapping profile requires rest-pose PASS from inspected runtime, not only a caller flag', () => {
  const report = gym.inspectRuntime({ mounted: true, skeleton: { bones: required }, animations: ['Idle'], restPoseValid: false });
  assert.throws(() => gym.createMappingProfile(report, { restPoseValid: true }), /rest pose validation/);
});

test('mapping profile requires explicit rest-pose validation and round-trips through storage', () => {
  const report = gym.inspectRuntime({ mounted: true, skeleton: { bones: required }, animations: ['Idle'], restPoseValid: true });
  assert.throws(() => gym.createMappingProfile(report, { restPoseValid: false }), /rest pose validation/);
  const profile = gym.createMappingProfile(report, { restPoseValid: true, profileId: 'member-map-v1', updatedAt: '2026-09-10T00:00:00.000Z' });
  const memory = new Map();
  const storage = { setItem(k,v){ memory.set(k,v); }, getItem(k){ return memory.get(k) || null; } };
  gym.saveProfile(profile, storage);
  assert.equal(gym.loadProfile(storage).profileId, 'member-map-v1');
});
