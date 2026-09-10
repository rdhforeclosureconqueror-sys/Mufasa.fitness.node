'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Arena shell loads the debug entry instead of documenting a missing integration', () => {
  const html = read('public/arena-push-up.html');
  assert.match(html, /<script defer src="\/arena-push-up-debug-entry\.js\?v=20260910-consolidation-v1"><\/script>/);
  assert.equal((html.match(/arena-push-up-debug-entry\.js/g) || []).length, 1);
  assert.doesNotMatch(html, /ARENA_DEBUG_ENTRY_NOT_WIRED/);
});

test('debug entry and loader form a cache-busted, idempotent load chain', () => {
  const entry = read('public/arena-push-up-debug-entry.js');
  const loader = read('public/arena-debug-consolidation-loader.js');
  new vm.Script(entry); new vm.Script(loader);
  assert.match(entry, /arena-debug-consolidation-loader\.js\?v=20260910-consolidation-v2/);
  assert.match(loader, /arena-debug-consolidation\.js\?v=20260910-consolidation-v2/);
  assert.match(entry, /DOMContentLoaded/); assert.match(loader, /PocketPTArenaDebugConsolidationLoader/);
});

test('debug entry suppresses the legacy board before the consolidated authority loads', () => {
  const entry = read('public/arena-push-up-debug-entry.js');
  assert.match(entry, /arena-debug-legacy-suppression/);
  assert.match(entry, /#bridgeDebugBoard,#bridgeDebugToggle\{display:none!important\}/);
  assert.match(entry, /suppressLegacyAuthority\(\);/);
  assert.match(entry, /style\.setProperty\('display', 'none', 'important'\)/);
});

test('one debug authority owns launcher, Copy All, Close and FIRST FAILURE while preserving the producer', () => {
  const source = read('public/arena-debug-consolidation.js');
  new vm.Script(source);
  assert.match(source, /arenaDebugAuthorityLauncher/);
  assert.match(source, /Copy All/); assert.match(source, />Close</); assert.match(source, /FIRST FAILURE:/);
  assert.match(source, /bridgeDebugBoard/); assert.match(source, /style\?\.setProperty\('display', 'none', 'important'\)/);
  assert.doesNotMatch(source, /\.remove\(.*bridgeDebugBoard/);
});
