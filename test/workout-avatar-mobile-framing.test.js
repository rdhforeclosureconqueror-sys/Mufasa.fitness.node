const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'runtime-events.js'), 'utf8');

test('workout mobile avatar framing aligns renderer to visible presentation viewport', () => {
  assert.match(source, /installWorkoutAvatarMobileFraming/);
  assert.match(source, /getElementById\?\.\("workoutPresentation"\)/);
  assert.match(source, /runtime\.renderer\.setSize\?\.\(width, height, false\)/);
  assert.match(source, /runtime\.camera\.aspect = width \/ height/);
  assert.match(source, /runtime\.camera\.updateProjectionMatrix\?\.\(\)/);
});

test('baseline centering uses avatar bounds and does not fight live pose ownership', () => {
  assert.match(source, /runtimeStatus\.personDetected === true/);
  assert.match(source, /new THREE\.Box3\(\)\.setFromObject\(root\)/);
  assert.match(source, /root\.position\.x = Number\(root\.position\.x \|\| 0\) \+ correctionX/);
  assert.match(source, /live_pose_owns_root/);
});

test('mobile framing re-applies on presentation, viewport, and orientation changes', () => {
  assert.match(source, /pocketpt:avatar-presentation-changed/);
  assert.match(source, /addEventListener\("resize"/);
  assert.match(source, /addEventListener\("orientationchange"/);
  assert.match(source, /ResizeObserver/);
});

test('mobile framing publishes first-failure-friendly diagnostics', () => {
  for (const field of [
    'mobileAvatarFramingState',
    'mobileAvatarFramingReason',
    'mobilePresentationViewport',
    'mobileAvatarCenterCorrectionX',
    'mobileAvatarCentered'
  ]) assert.match(source, new RegExp(field), field);
});
