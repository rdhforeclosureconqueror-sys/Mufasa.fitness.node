'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');
const { verifyGarveyLaunchContext } = require('../src/youth-fitness/integration/garveyLaunch');

const SECRET_A = 'synthetic-secret-a-for-tests-only';
const NOW = Date.parse('2026-08-18T12:00:00.000Z');
const RETURN_URL = 'https://garvey.example.test/movement/return';
const basePayload = () => ({
  contract: 'leader_within_pocketpt_bridge_v1', contract_version: 1,
  issuer: 'garvey', audience: 'pocketpt', issued_at: NOW / 1000,
  expires_at: NOW / 1000 + 180, subject_ref: 'subject_ABCD1234',
  assignment_ref: 'assignment_XYZ9876', provider: 'pocketpt', source: 'garvey',
  requirement: 'movement', return_url: RETURN_URL
});
function sign(payload = basePayload(), secret = SECRET_A) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
const verify = (payload, secret = SECRET_A) => verifyGarveyLaunchContext(sign(payload, secret), { secret: SECRET_A, returnUrlAllowlist: [RETURN_URL], now: () => NOW });

test('canonical verifier accepts a valid Garvey context', () => assert.equal(verify(basePayload()).assignment_ref, 'assignment_XYZ9876'));
test('invalid SECRET A signature fails closed', () => assert.throws(() => verifyGarveyLaunchContext(sign(basePayload(), 'wrong-secret'), { secret: SECRET_A, returnUrlAllowlist: [RETURN_URL], now: () => NOW }), /GARVEY_LAUNCH_CONTEXT_INVALID/));
test('expired context fails closed', () => assert.throws(() => verify({ ...basePayload(), expires_at: NOW / 1000 }), /GARVEY_LAUNCH_LIFETIME_INVALID/));
test('wrong issuer fails closed', () => assert.throws(() => verify({ ...basePayload(), issuer: 'not-garvey' }), /GARVEY_LAUNCH_AUTHORITY_INVALID/));
test('wrong audience fails closed', () => assert.throws(() => verify({ ...basePayload(), audience: 'not-pocketpt' }), /GARVEY_LAUNCH_AUTHORITY_INVALID/));
test('wrong contract version fails closed', () => assert.throws(() => verify({ ...basePayload(), contract_version: 2 }), /GARVEY_LAUNCH_CONTRACT_INVALID/));
test('invalid opaque references fail closed', () => assert.throws(() => verify({ ...basePayload(), subject_ref: 'person@example.com' }), /GARVEY_LAUNCH_REFERENCE_INVALID/));
test('provider, source, and requirement bindings fail closed', () => assert.throws(() => verify({ ...basePayload(), requirement: 'completion' }), /GARVEY_LAUNCH_BINDING_INVALID/));
test('disallowed return URL fails closed', () => assert.throws(() => verify({ ...basePayload(), return_url: 'https://attacker.example/return' }), /GARVEY_LAUNCH_RETURN_URL_INVALID/));

test('GET launch route exists, requires context, and valid launch enters existing program-first flow without completion', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garvey-launch-'));
  const env = {
    GARVEY_INTEGRATION_ENABLED: 'true',
    GARVEY_LAUNCH_VERIFICATION_SECRET: SECRET_A,
    GARVEY_LAUNCH_RETURN_URL_ALLOWLIST: RETURN_URL
  };
  const server = createApp({ dataDir, env, garveyLaunchNow: () => NOW }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const missing = await fetch(`${base}/integrations/garvey/launch`, { redirect: 'manual' });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error.code, 'GARVEY_LAUNCH_CONTEXT_REQUIRED');

  const response = await fetch(`${base}/integrations/garvey/launch?context=${encodeURIComponent(sign())}`, { redirect: 'manual' });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/pocketpt/my-program');
  const runtimePath = path.join(dataDir, 'youth-fitness', 'runtime-v1.json');
  const runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
  assert.deepEqual(runtime.programs, {});
  assert.deepEqual(runtime.sessions, {});
});

test('disabled integration hides the launch boundary', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garvey-disabled-'));
  const server = createApp({ dataDir, env: { GARVEY_INTEGRATION_ENABLED: 'false' } }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/integrations/garvey/launch`);
  assert.equal(response.status, 404);
});
