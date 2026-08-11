const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('production static artifact contains the public Stepping Into Greatness experience', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'greatness-static-'));
  const result = spawnSync(process.execPath, ['scripts/build-frontend.js'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FRONTEND_BUILD_OUTPUT: output, VITE_GOOGLE_MAPS_BROWSER_API_KEY: 'static-build-test-key' }
  });
  assert.equal(result.status, 0, result.stderr);

  const required = [
    'stepping-into-greatness.html',
    'stepping-into-greatness.css',
    'stepping-into-greatness.js',
    'new/stepintograteness1.jpg',
    'new/stepintograteness2.jpg',
    'new/stepintograteness3.jpg',
    'greatness.html',
    'run-club-login.html',
    'run-club-login.css',
    'run-club-login.js',
    'workout.html'
  ];
  required.forEach(file => assert.ok(fs.statSync(path.join(output, file)).isFile(), `${file} missing from static artifact`));

  const html = fs.readFileSync(path.join(output, 'stepping-into-greatness.html'), 'utf8');
  const css = fs.readFileSync(path.join(output, 'stepping-into-greatness.css'), 'utf8');
  const js = fs.readFileSync(path.join(output, 'stepping-into-greatness.js'), 'utf8');
  assert.match(html, /Free digital run club/i);
  assert.match(html, /Start where you are/i);
  assert.match(html, /href="\/run-club-login\.html\?returnTo=%2Fgreatness\.html"/);
  assert.match(html, /data-start-greatness/);
  assert.match(js, /setAttribute\('href', '\/greatness\.html'\)/);
  assert.doesNotMatch(html, /workout\.html\?returnTo/);
  ['stepintograteness1.jpg', 'stepintograteness2.jpg', 'stepintograteness3.jpg'].forEach(image => assert.match(css + html, new RegExp(image)));
  assert.doesNotMatch(html + css + js, /server\.js|\/stepping-into-greatness(?:["'#?])/);
});

test('Run Club login is a dedicated minimal static sign-up and safe direct-to-Greatness flow', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'run-club-login.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public', 'run-club-login.js'), 'utf8');
  for (const copy of ['Welcome to the Run Club', 'No subscription required', 'Join Free', 'Sign In']) assert.match(html, new RegExp(copy, 'i'));
  for (const field of ['name', 'email', 'password']) assert.match(html, new RegExp(`name="${field}"`));
  assert.match(js, /entryContext:"run_club"/);
  assert.match(js, /destination="\/greatness\.html"/);
  assert.match(js, /location\.assign\(returnTo\)/);
  assert.match(js, /value\.startsWith\("\/\/"\)/);
  assert.match(js, /target\.origin===window\.location\.origin/);
  assert.doesNotMatch(html + js, /dashboard\.html|checkout/i);
});

test('free account flow accepts only same-origin return paths', () => {
  const auth = fs.readFileSync(path.join(root, 'public', 'auth-core.js'), 'utf8');
  assert.match(auth, /candidate\.startsWith\("\/"\)/);
  assert.match(auth, /candidate\.startsWith\("\/\/"\)/);
  assert.match(auth, /target\.origin === window\.location\.origin/);
  assert.match(auth, /window\.location\.assign\(returnPath\)/);
});
