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
  contract_name: 'leader_within_pocketpt_bridge_v1', contract_version: 1,
  iss: 'garvey', aud: 'pocketpt', iat: NOW / 1000,
  exp: NOW / 1000 + 180, subject_ref: 'LWIS-ABCD1234EFGH5678',
  assignment_ref: 'LWFA-XYZ9876LMNOP5432', provider: 'POCKETPT', source_application: 'GARVEY',
  requirement_type: 'MOVE', return_url: RETURN_URL
});
function sign(payload = basePayload(), secret = SECRET_A) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
const verify = (payload, secret = SECRET_A) => verifyGarveyLaunchContext(sign(payload, secret), { secret: SECRET_A, returnUrlAllowlist: [RETURN_URL], now: () => NOW });

test('canonical verifier accepts the reconciled G4.5 Garvey V1 contract', () => assert.equal(verify(basePayload()).assignment_ref, 'LWFA-XYZ9876LMNOP5432'));
test('invalid SECRET A signature fails closed', () => assert.throws(() => verifyGarveyLaunchContext(sign(basePayload(), 'wrong-secret'), { secret: SECRET_A, returnUrlAllowlist: [RETURN_URL], now: () => NOW }), /GARVEY_LAUNCH_CONTEXT_INVALID/));
test('expired context fails closed', () => assert.throws(() => verify({ ...basePayload(), exp: NOW / 1000 }), /GARVEY_LAUNCH_LIFETIME_INVALID/));
test('wrong issuer fails closed', () => assert.throws(() => verify({ ...basePayload(), iss: 'not-garvey' }), /GARVEY_LAUNCH_AUTHORITY_INVALID/));
test('wrong audience fails closed', () => assert.throws(() => verify({ ...basePayload(), aud: 'not-pocketpt' }), /GARVEY_LAUNCH_AUTHORITY_INVALID/));
test('wrong contract version fails closed', () => assert.throws(() => verify({ ...basePayload(), contract_version: 2 }), /GARVEY_LAUNCH_CONTRACT_INVALID/));
test('invalid opaque references fail closed', () => assert.throws(() => verify({ ...basePayload(), subject_ref: 'person@example.com' }), /GARVEY_LAUNCH_REFERENCE_INVALID/));
test('provider, source, and requirement bindings fail closed', () => assert.throws(() => verify({ ...basePayload(), requirement_type: 'COMPLETION' }), /GARVEY_LAUNCH_BINDING_INVALID/));
test('disallowed return URL fails closed', () => assert.throws(() => verify({ ...basePayload(), return_url: 'https://attacker.example/return' }), /GARVEY_LAUNCH_RETURN_URL_INVALID/));

test('divergent Attempt 1 aliases and normalized binding values are not accepted as canonical G4.5', () => {
  const canonical = basePayload();
  const divergent = {
    contract: canonical.contract_name, contract_version: canonical.contract_version,
    issuer: canonical.iss, audience: canonical.aud, issued_at: canonical.iat, expires_at: canonical.exp,
    subject_ref: canonical.subject_ref, assignment_ref: canonical.assignment_ref,
    provider: 'pocketpt', source: 'garvey', requirement: 'movement', return_url: canonical.return_url
  };
  assert.throws(() => verify(divergent), /GARVEY_LAUNCH_CONTRACT_INVALID/);
});

test('key IDs fail closed because V1 defines one configured HS256 SECRET A and no key selection', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'unconfigured-key' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(basePayload())).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_A).update(`${header}.${body}`).digest('base64url');
  assert.throws(() => verifyGarveyLaunchContext(`${header}.${body}.${signature}`, { secret: SECRET_A, returnUrlAllowlist: [RETURN_URL], now: () => NOW }), /GARVEY_LAUNCH_CONTEXT_INVALID/);
});

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
