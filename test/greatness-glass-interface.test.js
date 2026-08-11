'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'greatness.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'greatness.html'), 'utf8');

test('centralizes the cinematic glass hierarchy and reusable surface classes', () => {
  for (const token of ['--glass-surface-soft','--glass-surface-medium','--glass-surface-strong','--glass-border-gold','--glass-border-emerald','--glass-inner-highlight','--glass-shadow','--glass-blur-soft','--glass-blur-strong','--text-glow-gold','--text-glow-cool','--text-shadow-readable']) {
    assert.match(css, new RegExp(token));
  }
  for (const className of ['glass-surface--soft','glass-surface--medium','glass-surface--strong','glass-panel','glass-edge-gold','glass-edge-emerald','glass-edge-blue','local-contrast-scrim']) {
    assert.match(css, new RegExp(`\\.${className}`));
  }
});

test('keeps foreground glass translucent while maps remain opaque', () => {
  for (const token of [
    '--glass-surface-soft:rgba(4,22,16,.19)',
    '--glass-surface-medium:rgba(4,22,16,.24)',
    '--glass-surface-strong:rgba(3,17,13,.31)',
    '--glass-control:rgba(3,18,14,.23)'
  ]) assert.ok(css.includes(token), `${token} should retain the half-density glass contract`);

  assert.match(css, /nav\{background:linear-gradient\(180deg,rgba\(3,17,13,\.34\),rgba\(3,17,13,\.24\)\)/);
  assert.match(css, /#trailMap,\.trail-detail-map,\.map-workspace\{background:#081c17;[^}]*backdrop-filter:none/);
  assert.match(css, /@supports not \(\(backdrop-filter:blur\(1px\)\)[^}]+background-color:rgba\(3,17,13,\.34\)/);
});

test('major activity, recovery, and trail surfaces opt into semantic glass classes', () => {
  assert.match(html, /recorder glass-panel glass-surface--medium glass-edge-blue/);
  assert.match(html, /trail-planner glass-panel glass-surface--medium glass-edge-emerald/);
  assert.match(html, /recovery[^>]+glass-surface--strong glass-edge-gold/);
  assert.match(css, /\.metrics>div\{[^}]*var\(--glass-surface-soft\)/);
  assert.match(css, /\.trail-planner\{[^}]*var\(--glass-surface-medium\)/);
  assert.match(css, /\.route-option[^}]+var\(--glass-surface-soft\)/);
});

test('protects readable interactive glass while keeping maps isolated', () => {
  assert.match(css, /input::placeholder\{color:#c6d9d2;opacity:1\}/);
  assert.match(css, /input:focus-visible[^}]+0 0 0 3px/);
  assert.match(css, /\.danger[^}]+rgba\(91,30,30,.25\)/);
  assert.match(css, /#trailMap[^}]+backdrop-filter:none/);
  assert.match(css, /@supports not \(\(backdrop-filter:/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[^{]*\{[^}]*glass-panel:after[^}]*animation:none/);
  assert.match(css, /trail-planner:after[^}]+pointer-events:none/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /html,body\{max-width:100%;overflow-x:hidden\}/);
});

test('fixes the rendering root instead of only changing opacity tokens', () => {
  assert.match(html, /greatness\.css\?v=frontend-build-key-20260811/);
  assert.match(css, /main>\.panel,\s*\.panel:not\(#move\)\{background:transparent/);
  assert.match(css, /\.trail-planner \.route-selector,\.trail-planner \.planner-workspace\{background:transparent\}/);
  assert.match(css, /\.cinematic-vignette\{\s*background:[\s\S]*?rgba\(0,0,0,\.28\)/);
  assert.match(css, /\.recorder,\.trail-planner\{[\s\S]*?blur\(4px\)/);
  assert.match(css, /\.metrics>div,\.gps,[\s\S]*?backdrop-filter:none/);
});
