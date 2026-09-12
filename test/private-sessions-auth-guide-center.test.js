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

test('global navigation presents MileleFit while preserving PocketPT internal guide contract', () => {
  const nav = read('public/global-nav.js');
  assert.match(nav, /name: "MileleFit"/);
  assert.match(nav, /tagline: "Forever Fit\."/);
  assert.match(nav, /label:"MileleFit Workout"/);
  assert.match(nav, /global\.PocketPTGuide\?\.initialize\(\)/);
  assert.match(nav, /installPublicBranding\(\)/);
  assert.match(nav, /applyPublicBrand\(document\)/);
});

test('dynamic brand migration is limited to application-owned UI and never arbitrary member content', () => {
  const nav = read('public/global-nav.js');
  assert.match(nav, /APP_OWNED_DYNAMIC_BRAND_SELECTOR/);
  assert.match(nav, /data-milelefit-brand-owned/);
  assert.match(nav, /isAppOwnedDynamicBrandNode/);
  assert.doesNotMatch(nav, /containsLegacyBrand\(node\.textContent \|\| ""\)\) applyPublicBrand\(node\)/);
  const inbox = read('public/inbox.js');
  assert.match(inbox, /esc\(message\.body\)/);
});

test('standalone public entry surfaces show MileleFit without requiring global navigation', () => {
  const intake = read('public/intake-start.html');
  const runClub = read('public/free-run-club.html');
  const retention = read('public/retention-journey-start.html');
  const arena = read('public/arena-push-up.html');
  assert.match(intake, /Start Your MileleFit Journey/);
  assert.match(intake, /MILELEFIT PERSONALIZATION/);
  assert.doesNotMatch(intake, /Pocket PT|POCKET PT/);
  assert.match(runClub, /Free Run Club · MileleFit/);
  assert.doesNotMatch(runClub, /Pocket PT|POCKET PT/);
  assert.match(retention, /Retention Journey · MileleFit/);
  assert.match(retention, /What brings you to MileleFit\?/);
  assert.doesNotMatch(retention, /Pocket PT|POCKET PT/);
  assert.match(arena, /Connecting to MileleFit/);
  assert.match(arena, /aria-label="MileleFit arena diagnostics"/);
  assert.match(arena, /PocketPTWorldProtocol v1/);
});

test('admin first-failure diagnostics include the Guide Center boundary', () => {
  const js = read('public/admin-first-failure.js');
  assert.match(js, /id:"guide_center"/);
  assert.match(js, /\/guide-center\.html/);
});
