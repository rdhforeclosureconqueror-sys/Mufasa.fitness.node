const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('private sessions uses canonical auth before exposing the form', () => {
  const html = read('public/private-sessions.html');
  const js = read('public/private-sessions.js');
  assert.match(html, /id="authGate"/);
  assert.match(html, /id="quoteForm" hidden/);
  assert.match(html, /auth-state-runtime\.js/);
  assert.match(js, /AuthStateRuntime/);
  assert.match(js, /Authorization:`Bearer \$\{t\}`/);
  assert.match(js, /credentials:"omit"/);
});

test('successful private coaching request goes to dashboard and queues dashboard walkthrough', () => {
  const js = read('public/private-sessions.js');
  assert.match(js, /pocketpt\.pendingTour\.v1/);
  assert.match(js, /id:"dashboard"/);
  assert.match(js, /location\.replace\("\/dashboard\.html\?source=private-sessions"\)/);
  assert.doesNotMatch(js, /membership\.html\?plan=/);
});

test('global navigation has a permanent Guide Center destination', () => {
  const nav = read('public/global-nav.js');
  const html = read('public/guide-center.html');
  const js = read('public/guide-center.js');
  assert.match(nav, /label:"Help \/ Guide Center",href:"\/guide-center\.html"/);
  assert.match(html, /How to use the Guide Center/);
  assert.match(js, /PocketPTGuide\?\.start\(id,\{manual:true\}\)/);
  assert.match(js, /guide to the guides/i);
});

test('admin first-failure diagnostics include the Guide Center boundary', () => {
  const js = read('public/admin-first-failure.js');
  assert.match(js, /id:"guide_center"/);
  assert.match(js, /\/guide-center\.html/);
});
