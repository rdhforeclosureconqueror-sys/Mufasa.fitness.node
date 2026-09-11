const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const profiles = require('../public/motion/avatar-profiles.js');
const registry = require('../public/motion/registry/avatar-profiles.json');

const PROFILE_ID = 'avaturn-personalized-candidate';
const MOTION_LAB_ASSET = '/dev/motion-lab-avatar-assets/avaturn-push-up-source.glb';
const PRODUCT_ASSET = '/motion/assets/exercises/push-up/avaturn-push-up-avatar.glb';

test('Motion Lab personalized avatar uses Motion Lab session-gated delivery while preserving canonical product identity', () => {
  const runtimeProfile = profiles.get(PROFILE_ID);
  const registryProfile = registry.records.find(record => record.avatarProfileId === PROFILE_ID);

  assert.ok(runtimeProfile, 'runtime personalized avatar profile must exist');
  assert.ok(registryProfile, 'canonical personalized avatar registry record must exist');
  assert.equal(runtimeProfile.assetUrl, MOTION_LAB_ASSET);
  assert.equal(runtimeProfile.productAssetUrl, PRODUCT_ASSET);
  assert.equal(runtimeProfile.productAssetUrl, registryProfile.assetUrl);
  assert.equal(runtimeProfile.skeletonProfile, registryProfile.skeletonProfileId);
  assert.equal(runtimeProfile.source, registryProfile.sourceAssetReference);
  assert.equal(runtimeProfile.assetResolver, 'motion-lab-session-gate');
  assert.equal(registryProfile.assetResolver, 'authenticated-product-backend');
});

test('server protects Motion Lab avatar delivery with motionLabGate and maps it to the same tracked source GLB', () => {
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert.match(server, /app\.get\("\/dev\/motion-lab-avatar-assets\/:filename", motionLabGate/);
  assert.match(server, /"avaturn-push-up-source\.glb"/);
  assert.match(server, /path\.join\(rootDir, "exercise-generation", "source-assets", "avaturn", req\.params\.filename\)/);
  assert.match(server, /app\.get\("\/motion\/assets\/exercises\/push-up\/avaturn-push-up-avatar\.glb", requireAuth/);
});
