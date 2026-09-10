const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../motion-lab/index.html'), 'utf8');

test('activates isolated gym compatibility entry after canonical bootstrap', () => {
  const bootstrap = html.indexOf('/dev/motion-lab-bootstrap.js');
  const entry = html.indexOf('/dev/motion-lab-gym-compatibility-entry.js');
  assert.ok(bootstrap >= 0, 'canonical Motion Lab bootstrap must remain present');
  assert.ok(entry > bootstrap, 'Gym Compatibility entry must load after canonical bootstrap');
});

test('activates gym compatibility entry exactly once', () => {
  const matches = html.match(/\/dev\/motion-lab-gym-compatibility-entry\.js/g) || [];
  assert.equal(matches.length, 1);
});

test('preserves current Thriller selector and Motion Lab controls', () => {
  assert.match(html, /id="thrillerMotion"/);
  assert.match(html, /id="loadPersonalizedAvatar"/);
  assert.match(html, /id="poseEditorPanel"/);
  assert.match(html, /id="initializeRuntime"/);
});
