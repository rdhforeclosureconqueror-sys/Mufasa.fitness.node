const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'motion-lab/index.html'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-bootstrap.js'), 'utf8');
const controls = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-inspection-controls.js'), 'utf8');

test('Motion Lab exposes exact front side back inspection presets', () => {
  for (const id of ['viewFront', 'viewRight', 'viewBack', 'viewLeft', 'viewReset']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Front 0°/);
  assert.match(html, /Right 90°/);
  assert.match(html, /Back 180°/);
});

test('inspection controls are loaded after the canonical disposable session and before Motion Lab runtime', () => {
  const sessionIndex = bootstrap.indexOf('/dev/motion-lab-assets/disposable-motion-session.js');
  const controlsIndex = bootstrap.indexOf('/dev/motion-lab-inspection-controls.js');
  const runtimeIndex = bootstrap.indexOf('/dev/motion-lab-runtime.js');
  assert.ok(sessionIndex >= 0 && controlsIndex > sessionIndex && runtimeIndex > controlsIndex);
});

test('mobile inspection uses pointer drag and changes camera rather than avatar skeleton transforms', () => {
  assert.match(controls, /pointerdown/);
  assert.match(controls, /pointermove/);
  assert.match(controls, /touchAction = "none"/);
  assert.match(controls, /session\.camera\.position\.set/);
  assert.match(controls, /session\.camera\.lookAt/);
  assert.doesNotMatch(controls, /avatar\.rotation/);
  assert.doesNotMatch(controls, /boneTargets/);
});
