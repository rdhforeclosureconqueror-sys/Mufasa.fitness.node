const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const navJs = fs.readFileSync(path.join(root, 'public', 'global-nav.js'), 'utf8');
const navCss = fs.readFileSync(path.join(root, 'public', 'global-nav.css'), 'utf8');

test('developer diagnostics are role-gated by verified admin identity', () => {
  assert.match(navJs, /DIAGNOSTIC_ROLES\s*=\s*new Set\(\["admin","super_admin"\]\)/);
  assert.match(navJs, /state\?\.isAuthenticated === true && hasDiagnosticRole\(state\.user\)/);
  assert.match(navJs, /classList\.toggle\("maat-admin-diagnostics", permitted\)/);
  assert.match(navJs, /classList\.remove\("developer-diagnostics"\)/);
  assert.match(navJs, /removeItem\("maatDeveloperDiagnostics"\)/);
});

test('diagnostic surfaces fail closed unless the verified admin class is present', () => {
  assert.match(navCss, /html:not\(\.maat-admin-diagnostics\) \[data-diagnostic-panel\]/);
  assert.match(navCss, /html:not\(\.maat-admin-diagnostics\) \[data-diagnostic-control\]/);
  assert.match(navCss, /html:not\(\.maat-admin-diagnostics\) \.auth-consistency-diagnostics/);
  assert.match(navCss, /html:not\(\.maat-admin-diagnostics\) \.trail-request-diagnostics/);
  assert.match(navCss, /html:not\(\.maat-admin-diagnostics\) #avatarDebugOverlay/);
  assert.match(navCss, /display:none!important/);
});
