const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('Push-Up release front door loads canonical auth, profile, avatar, and arena runtimes', () => {
  const html = read('public/push-up-release.html');
  assert.match(html, /MileleFit Push-Up Challenge/);
  assert.match(html, /auth-state-runtime\.js/);
  assert.match(html, /backend-read\.js/);
  assert.match(html, /app-hydration-runtime\.js/);
  assert.match(html, /avatar-upload-contract\.js/);
  assert.match(html, /profile-write-runtime\.js/);
  assert.match(html, /world-bridge-launch\.js/);
  assert.match(html, /push-up-release\.js/);
});

test('Push-Up release uses the existing canonical avatar owners instead of a second avatar store', () => {
  const js = read('public/push-up-release.js');
  assert.match(js, /AppHydrationRuntime\?\.hydrateProfileFromBackend/);
  assert.match(js, /AppHydrationRuntime\?\.getCanonicalProfile/);
  assert.match(js, /ProfileWriteRuntime\?\.uploadAvatarFile/);
  assert.match(js, /PocketPTAvatarUploadContract/);
  assert.match(js, /avatar\.avatarModelUrl|avatarModelUrl/);
  assert.doesNotMatch(js, /localStorage\.setItem\([^)]*avatar/i);
  assert.doesNotMatch(js, /indexedDB/i);
});

test('arena launch is fail-closed behind canonical avatar verification', () => {
  const js = read('public/push-up-release.js');
  const enter = js.indexOf('async function enterArena()');
  const verify = js.indexOf("refreshAuthAndAvatar('pre-arena')", enter);
  const gate = js.indexOf("if (!ready) throw new Error('Your personalized avatar must be verified before arena entry.')", verify);
  const launch = js.indexOf('PocketPTWorldLaunch.createArenaSession()', gate);
  assert.ok(enter >= 0, 'enterArena exists');
  assert.ok(verify > enter, 'canonical profile/avatar refresh occurs at arena entry');
  assert.ok(gate > verify, 'avatar readiness is checked before launch');
  assert.ok(launch > gate, 'existing world bridge session creator runs only after avatar gate passes');
});

test('release keeps the existing personalized arena experience contract', () => {
  const bridge = read('public/world-bridge-launch.js');
  assert.match(bridge, /experienceType:\s*"PUSH_UP_ARENA"/);
  assert.match(bridge, /challengeId:\s*"push_up"/);
  assert.match(bridge, /\/api\/game\/sessions/);
  const release = read('public/push-up-release.js');
  assert.match(release, /PocketPTWorldLaunch\.createArenaSession/);
});

test('release supplies first-failure diagnostics without exposing bearer credentials', () => {
  const js = read('public/push-up-release.js');
  assert.match(js, /firstFailure/);
  assert.match(js, /Bearer \[REDACTED\]/);
  assert.match(js, /ticket=\[REDACTED\]/);
  assert.match(js, /debugRelease/);
});
