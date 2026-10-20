'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'runtime-config.js'), 'utf8');

test('runtime config establishes producer suppression before loading the debug center', () => {
  const guard = source.indexOf('pocketpt-mirror-producer-presentation-guard');
  const center = source.indexOf('/mirror-debug-center.js?v=20260910-producer-authority-v5');
  assert.ok(guard >= 0, 'presentation guard must be installed');
  assert.ok(center > guard, 'guard must exist before the consolidated authority is requested');
});

test('legacy Mirror Motion producer DOM is force-hidden while the consolidated center is exempt', () => {
  assert.match(source, /body > \[id\^="mirrorMotion"\]\{display:none!important\}/);
  assert.match(source, /#pocketptMirrorDebugCenter,#pocketptMirrorDebugLauncher\{display:revert\}/);
  assert.match(source, /legacyProducerPresentation: false/);
});

test('dynamic producer insertion and style rewrites cannot reclaim presentation authority', () => {
  assert.match(source, /new global\.MutationObserver/);
  assert.match(source, /childList: true/);
  assert.match(source, /subtree: true/);
  assert.match(source, /attributes: true/);
  assert.match(source, /suppressLegacyMirrorPanel\(record\.target\)/);
  assert.match(source, /suppressLegacyMirrorTree\(node\)/);
  assert.match(source, /dynamicProducerSuppression: true/);
});

test('debug center no longer waits for a legacy producer detection loop', () => {
  assert.doesNotMatch(source, /maybeLoadMirrorDebugCenter/);
  assert.doesNotMatch(source, /setInterval\(\(\) => \{\s*if \(maybeLoadMirrorDebugCenter/);
  assert.match(source, /data-mirror-debug-center/);
});

test('deployment diagnostics remain data-only and are loaded alongside the authority', () => {
  assert.match(source, /mirror-deployment-diagnostics\.js\?v=20260910-producer-authority-v2/);
  assert.match(source, /PocketPTMirrorPresentationAuthority/);
});
