const test = require('node:test');
const assert = require('node:assert/strict');

const profiles = require('../public/motion/avatar-profiles.js');
const registry = require('../public/motion/registry/avatar-profiles.json');

const PROFILE_ID = 'avaturn-personalized-candidate';

test('Motion Lab personalized avatar uses the canonical registered runtime route', () => {
  const runtimeProfile = profiles.get(PROFILE_ID);
  const registryProfile = registry.records.find(record => record.avatarProfileId === PROFILE_ID);

  assert.ok(runtimeProfile, 'runtime personalized avatar profile must exist');
  assert.ok(registryProfile, 'canonical personalized avatar registry record must exist');
  assert.equal(runtimeProfile.assetUrl, registryProfile.assetUrl);
  assert.equal(runtimeProfile.skeletonProfile, registryProfile.skeletonProfileId);
  assert.equal(runtimeProfile.source, registryProfile.sourceAssetReference);
  assert.equal(runtimeProfile.assetResolver, registryProfile.assetResolver);
  assert.doesNotMatch(runtimeProfile.assetUrl, /^\/dev\/motion-lab-avatar-assets\//);
});
