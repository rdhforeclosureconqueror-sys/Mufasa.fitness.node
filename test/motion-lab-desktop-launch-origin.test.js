'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const launchJs = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-launch.js'), 'utf8');
const launchHtml = fs.readFileSync(path.join(ROOT, 'motion-lab/motion-lab-launch.html'), 'utf8');

test('Motion Lab launcher announces to both canonical frontend and current backend origins before auth', () => {
  assert.match(launchJs, /PRODUCTION_FRONTEND_ORIGIN/);
  assert.match(launchJs, /window\.location\.origin/);
  assert.match(launchJs, /ALLOWED_OPENER_ORIGINS/);
  assert.match(launchJs, /for \(const origin of ALLOWED_OPENER_ORIGINS\)/);
});

test('Motion Lab launcher locks onto the validated opener origin for authenticated handoff', () => {
  assert.match(launchJs, /ALLOWED_OPENER_ORIGINS\.has\(event\.origin\)/);
  assert.match(launchJs, /openerOrigin = event\.origin/);
  assert.match(launchJs, /window\.opener\.postMessage\(payload, openerOrigin\)/);
});

test('old iOS-only launcher build marker is removed', () => {
  assert.doesNotMatch(launchJs, /2026-08-20-ios-trace-v2/);
  assert.doesNotMatch(launchHtml, /2026-08-20-ios-trace-v2/);
  assert.match(launchHtml, /2026-09-08-desktop-origin-v3/);
});
