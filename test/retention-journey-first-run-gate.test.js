const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('new account creation routes to Retention Journey before dashboard', () => {
  const login = read('public/login.js');
  assert.match(login, /register\?"\/retention-journey-start\.html\?firstRun=1":safeReturn\(\)/);
  assert.doesNotMatch(login, /register\?"\/dashboard\.html"/);
});

test('Retention Journey first screen exposes the four client-first brackets', () => {
  const html = read('public/retention-journey-start.html');
  assert.match(html, /RETENTION JOURNEY · STEP 1/);
  assert.match(html, /Lose, gain or tone/);
  assert.match(html, /Major transformation/);
  assert.match(html, /Athlete development/);
  assert.match(html, /Yoga, meditation & breathwork/);
});

test('Retention Journey classifications continue to use canonical retention intake', () => {
  const js = read('public/retention-journey-start.js');
  assert.match(js, /\/api\/me\/retention\/intake/);
  assert.match(js, /athlete_performance/);
  assert.match(js, /yoga_wellness/);
  assert.match(js, /general_fitness/);
  assert.doesNotMatch(js, /localStorage\.setItem/);
});
