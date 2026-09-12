const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('release launch adapter marks only release-origin arena launches', () => {
  const html = read('public/push-up-release.html');
  const adapter = read('public/push-up-release-world-bridge.js');
  assert.match(html, /world-bridge-launch\.js[\s\S]*push-up-release-world-bridge\.js[\s\S]*push-up-release\.js/);
  assert.match(adapter, /PocketPTWorldLaunch/);
  assert.match(adapter, /searchParams\.set\('entry', 'release'\)/);
  assert.match(adapter, /originalCreateArenaSession/);
});

test('release arena return waits for frontend origin resolution and revokes session first', () => {
  const html = read('public/arena-push-up.html');
  const adapter = read('public/arena-release-return.js');
  assert.match(html, /arena-release-return\.js[\s\S]*arena-push-up\.js/);
  assert.match(adapter, /params\.get\('entry'\) !== 'release'/);
  assert.match(adapter, /let returnUrlPromise = null/);
  assert.match(adapter, /if \(returnUrlPromise\) return returnUrlPromise/);
  assert.match(adapter, /\/api\/game\/config/);
  assert.match(adapter, /trusted\.pathname !== '\/push-up-challenge\.html'/);
  assert.match(adapter, /new URL\('\/push-up\.html', trusted\.origin\)/);
  assert.match(adapter, /document\.addEventListener\('click', revokeAndReturn, true\)[\s\S]*resolveReturnUrl\(\)/);
  assert.match(adapter, /releaseReturnUrl \|\| await resolveReturnUrl\(\)/);
  assert.match(adapter, /\/api\/game\/session/);
  assert.match(adapter, /method: 'DELETE'/);
  assert.match(adapter, /Promise\.race/);
  assert.match(adapter, /5000/);
  assert.match(adapter, /stopImmediatePropagation/);
});

test('release return has a trusted referrer fallback before backend-relative legacy href', () => {
  const adapter = read('public/arena-release-return.js');
  assert.match(adapter, /function releaseReferrerUrl\(\)/);
  assert.match(adapter, /\['\/push-up\.html', '\/push-up-release\.html'\]/);
  assert.match(adapter, /releaseReferrerUrl\(\) \|\| link\.href/);
});

test('legacy arena return authority remains unchanged', () => {
  const source = read('public/arena-push-up.js');
  assert.match(source, /let returnTo = '\/push-up-challenge\.html'/);
  assert.match(source, /target\.pathname !== '\/push-up-challenge\.html'/);
  assert.match(source, /location\.assign\(destination \|\| returnTo\)/);
});
