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
  assert.match(html, /<script defer src="\/arena-push-up-debug-entry\.js\?v=20260910-consolidation-v3"><\/script>/);
  assert.equal((html.match(/arena-push-up-debug-entry\.js/g) || []).length, 1);
  assert.ok(html.indexOf('/arena-push-up-debug-entry.js') < html.indexOf('/runtime-state.js'), 'authority contract loads before diagnostic-capable runtime');
  assert.doesNotMatch(html, /ARENA_DEBUG_ENTRY_NOT_WIRED/);
});

test('debug entry starts the cache-busted authority chain during deferred execution', () => {
  const entry = read('public/arena-push-up-debug-entry.js');
  const loader = read('public/arena-debug-consolidation-loader.js');
  new vm.Script(entry); new vm.Script(loader);
  assert.match(entry, /arena-debug-consolidation-loader\.js\?v=20260910-consolidation-v3/);
  assert.match(loader, /arena-debug-consolidation\.js\?v=20260910-consolidation-v3/);
  assert.doesNotMatch(entry, /addEventListener\('DOMContentLoaded'/);
  assert.match(entry, /suppressLegacyAuthority\(\);\s*start\(\);/);
  assert.match(loader, /PocketPTArenaDebugConsolidationLoader/);
});

test('debug entry enrolls the legacy board in the presentation contract before the authority loads', () => {
  const entry = read('public/arena-push-up-debug-entry.js');
  assert.match(entry, /arena-debug-legacy-suppression/);
  assert.match(entry, /data-pocketpt-debug-producer/);
  assert.match(entry, /suppressLegacyAuthority\(\);/);
  assert.match(entry, /style\.setProperty\('display', 'none', 'important'\)/);
});

test('one debug authority owns launcher, Copy All, Close and FIRST FAILURE while preserving the producer', () => {
  const source = read('public/arena-debug-consolidation.js');
  new vm.Script(source);
  assert.match(source, /arenaDebugAuthorityLauncher/);
  assert.match(source, /Copy All/); assert.match(source, />Close</); assert.match(source, /FIRST FAILURE:/);
  assert.match(source, /bridgeDebugBoard/); assert.match(source, /MANAGED_ATTRIBUTE/);
  assert.doesNotMatch(source, /\.remove\(.*bridgeDebugBoard/);
});

test('authority owns every producer family and keeps dynamically created or rerendered panels suppressed', () => {
  const source = read('public/arena-debug-consolidation.js');
  assert.match(source, /PocketPTDebugPresentation/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /observer\.observe\(doc\.body, \{childList: true, subtree: true, attributes: true/);
  assert.match(source, /record\.type === 'attributes' && suppress\(record\.target\)/);
  assert.match(source, /\^mirrorMotion\.\*\(\?:Debug\|Acceptance\|Controls\)/);
  assert.match(source, /pocketptMirrorDebugCenter/);
  assert.match(source, /data-pocketpt-debug-producer/);
  assert.match(source, /\[\$\{MANAGED_ATTRIBUTE\}=\"true\"\]\{display:none!important\}/);
  assert.match(source, /host\.style\?\.setProperty\('display', 'none', 'important'\)/);
});

test('closed mobile authority leaves one launcher and reopening rebuilds current evidence and copy report', () => {
  const source = read('public/arena-debug-consolidation.js');
  assert.match(source, /@media\(max-width:600px\)/);
  assert.match(source, /panel\.hidden = !open; launcher\.hidden = open/);
  assert.match(source, /close\(\) \{open = false; render\(\);\}/);
  assert.match(source, /open\(\) \{open = true; render\(\);\}/);
  assert.match(source, /panel\.dataset\.copyText = report\(allSources\)/);
  assert.match(source, /allSources = sources\(\)/);
});

test('copy and FIRST FAILURE aggregate the bridge, live acceptance, avatar runtime and rest-pose producers', () => {
  const authority = require('../public/arena-debug-consolidation');
  const evidence = [
    {id: 'bridgeDebugBoard', label: 'Arena', text: 'FIRST FAILURE: GODOT_HANDSHAKE'},
    {id: 'mirrorMotionLiveAcceptanceDebug', label: 'Mirror', text: 'First failing boundary: PHASE10_PHASE9_RENDERER_NOT_BOUND\nAvatar runtime present: YES\nProtected rest pose: REST_POSE_NOT_OBSERVABLE'}
  ];
  assert.equal(authority.firstFailure(evidence), 'GODOT_HANDSHAKE');
  const copied = authority.report(evidence);
  assert.match(copied, /FIRST FAILURE: GODOT_HANDSHAKE/);
  assert.match(copied, /PHASE10_PHASE9_RENDERER_NOT_BOUND/);
  assert.match(copied, /Avatar runtime present: YES/);
  assert.match(copied, /REST_POSE_NOT_OBSERVABLE/);
});

test('mirror debug center yields visual authority while continuing to provide evidence', () => {
  const source = read('public/mirror-debug-center.js');
  assert.match(source, /PocketPTDebugPresentation\?\.authority === 'arena'/);
  assert.match(source, /registerProducer\?\.\('mirror-debug-center'/);
  assert.match(source, /PocketPTDebugPresentation\.suppress\?\.\(panel\)/);
  assert.match(source, /return;/);
});

test('the embedded Godot document has only its canvas and boot status surface, not diagnostic DOM authorities', () => {
  const html = read('public/game/push-up-arena/index.html');
  assert.equal((html.match(/<canvas\b/g) || []).length, 1);
  assert.doesNotMatch(html, /mirrorMotion|LIVE ACCEPTANCE|bridgeDebugBoard|arenaDebugAuthority/);
});
