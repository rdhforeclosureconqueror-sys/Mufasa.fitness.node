const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
const squat = fs.readFileSync(path.join(ROOT, 'public/motion/squat-motion-spec.js'), 'utf8');

test('Motion Lab exposes an explicit synthesized squat control', () => {
  assert.match(html, /id="loadSynthesizedSquat"/);
  assert.match(html, /Load Synthesized Squat v1/);
  assert.match(html, /not biomechanically validated/);
});

test('Motion Lab loads the synthesized squat contract before runtime wiring', () => {
  const squatIndex = bootstrap.indexOf('/motion/squat-motion-spec.js');
  const runtimeIndex = bootstrap.indexOf('/dev/motion-lab-runtime.js');
  assert.ok(squatIndex >= 0, 'squat spec must be loaded');
  assert.ok(runtimeIndex > squatIndex, 'squat spec must load before Motion Lab runtime');
  assert.match(bootstrap, /PocketPTSquatMotionSpec/);
});

test('squat preview reuses the existing development motion-spec compiler path without autoplay', () => {
  assert.match(bootstrap, /runtime\.loadPushUp\(\)/);
  assert.match(bootstrap, /window\.PocketPTPushUpMotionSpec=squat/);
  assert.match(bootstrap, /window\.PocketPTPushUpMotionSpec=previous/);
  assert.doesNotMatch(bootstrap, /\.play\(\)/);
  assert.doesNotMatch(bootstrap, /getUserMedia/);
  assert.doesNotMatch(bootstrap, /createDetector/);
});

test('squat contract stays development-only and synthesized', () => {
  assert.match(squat, /squat\/synthesized_engineering_v1/);
  assert.match(squat, /development-test-only/);
  assert.doesNotMatch(squat, /\.fbx/i);
  assert.doesNotMatch(squat, /\.glb/i);
});
