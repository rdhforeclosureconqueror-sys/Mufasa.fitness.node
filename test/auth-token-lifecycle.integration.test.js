"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server");
const { createAuthTokenLib, fingerprintToken } = require("../src/lib/authToken");

const SECRET = "production-equivalent-auth-secret-32-characters";

async function jsonRequest(base, route, { method = "GET", body, token } = {}) {
  const response = await fetch(base + route, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { response, payload: await response.json() };
}

test("production-equivalent login token immediately verifies and failures have exact reasons", async t => {
  const saved = Object.fromEntries(["AUTH_TOKEN_SECRET", "AUTH_TOKEN_CLOCK_SKEW_MS", "PILOT_LOGIN_PASSWORD", "LOGIN_SEED_EMAIL"].map(key => [key, process.env[key]]));
  Object.assign(process.env, { AUTH_TOKEN_SECRET: SECRET, AUTH_TOKEN_CLOCK_SKEW_MS: "0", PILOT_LOGIN_PASSWORD: "valid-password", LOGIN_SEED_EMAIL: "member@example.test" });
  t.after(() => { for (const [key, value] of Object.entries(saved)) value == null ? delete process.env[key] : process.env[key] = value; });
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-lifecycle-"));
  fs.mkdirSync(path.join(rootDir, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "public", "exercise-db", "index.json"), "[]");
  const traces = [];
  const logger = { info: (message, details) => { if (message === "[auth-token-trace]") traces.push(details); }, warn() {}, error() {}, log() {} };
  const server = createApp({ rootDir, logger }).listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const login = await jsonRequest(base, "/api/auth/login", { method: "POST", body: { email: "member@example.test", password: "valid-password" } });
  assert.equal(login.response.status, 200);
  const token = login.payload.token;
  assert.equal(login.payload.authTrace.tokenFingerprint, fingerprintToken(token));
  assert.equal(login.payload.authTrace.keyFingerprint.length, 12);
  assert.equal(login.payload.authTrace.requestId, login.response.headers.get("x-request-id"));
  assert.equal(login.payload.authTrace.immediateSelfVerification, "PASS");
  assert.equal(login.payload.authTrace.issuedTokenFingerprint, fingerprintToken(token));
  assert.equal(login.payload.authTrace.selfVerifiedTokenFingerprint, fingerprintToken(token));
  assert.equal(login.payload.authTrace.signerKeyMaterial.fingerprint, login.payload.authTrace.verifierKeyMaterial.fingerprint);
  assert.equal(login.payload.authTrace.signerKeyMaterial.byteLength, Buffer.byteLength(SECRET));
  assert.equal(login.payload.authTrace.signerKeyMaterial.effectiveType, "Buffer");
  assert.equal(login.payload.authTrace.signerKeyMaterial.source, "AUTH_TOKEN_SECRET");
  assert.equal(login.payload.authTrace.signerKeyMaterial.decodingOccurred, false);
  const me = await jsonRequest(base, "/api/auth/me", { token });
  assert.equal(me.response.status, 200);
  assert.equal(me.payload.user.id, login.payload.user.id);
  assert.equal(me.payload.user.email, login.payload.user.email);
  assert.equal(me.payload.authTrace.receivedTokenFingerprint, fingerprintToken(token));
  assert.equal(me.payload.authTrace.fingerprintsIdentical, true);
  assert.equal(me.payload.authTrace.signingInputFingerprintsIdentical, true);
  assert.equal(me.payload.authTrace.algorithmConsistent, true);
  assert.equal(me.payload.authTrace.compactToken.algorithm, "HS256");
  assert.equal(me.payload.authTrace.compactToken.signingInputFingerprint.length, 12);
  assert.equal(me.payload.authTrace.rootCause, null);
  assert.equal(traces.find(item => item.event === "issuance").tokenFingerprint, fingerprintToken(token));
  const issuanceTrace = traces.find(item => item.event === "issuance");
  const verificationTrace = traces.find(item => item.event === "verification" && item.httpStatus === 200);
  assert.equal(verificationTrace.fingerprintIssuedByThisProcess, "YES");
  assert.equal(verificationTrace.tokenFingerprint, issuanceTrace.tokenFingerprint);
  assert.equal(verificationTrace.authConfiguration.keyFingerprint, issuanceTrace.authConfiguration.keyFingerprint);
  assert.equal(verificationTrace.instance, issuanceTrace.instance);
  assert.equal(verificationTrace.build, issuanceTrace.build);
  for (const trace of [issuanceTrace, verificationTrace]) {
    assert.match(trace.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(trace.endpoint, trace.event === "issuance" ? "/api/auth/login" : "/api/auth/me");
    assert.equal(typeof trace.pid, "number");
    assert.equal(typeof trace.uptimeSeconds, "number");
    assert.ok(trace.hostname);
  }

  const verifierCases = [
    ["malformed_token", "not-a-jwt"],
    ["signature_invalid", createAuthTokenLib({ secret: "different-production-secret-32-characters" }).issueUserToken({ userId: "pilot_admin" }).token],
    ["issuer_mismatch", createAuthTokenLib({ secret: SECRET, issuer: "wrong-issuer" }).issueUserToken({ userId: "pilot_admin" }).token]
  ];
  const expiring = createAuthTokenLib({ secret: SECRET, maxTtlMs: 10, clockSkewMs: 0 }).issueUserToken({ userId: "pilot_admin", ttlMs: 1 }).token;
  await new Promise(resolve => setTimeout(resolve, 10));
  verifierCases.push(["expired_token", expiring]);
  for (const [reason, invalidToken] of verifierCases) {
    const result = await jsonRequest(base, "/api/auth/me", { token: invalidToken });
    assert.equal(result.response.status, 401, reason);
    assert.equal(result.payload.error.details.reason, reason);
    assert.equal(result.payload.error.details.authTrace.reason, reason);
    assert.equal(result.payload.error.details.authTrace.requestId, result.response.headers.get("x-request-id"));
    assert.equal(result.payload.error.details.authTrace.keyFingerprint.length, 12);
  }

  const parts = token.split(".");
  parts[2] = `${parts[2].slice(0, -1)}${parts[2].endsWith("A") ? "B" : "A"}`;
  const mutated = await jsonRequest(base, "/api/auth/me", { token: parts.join(".") });
  assert.equal(mutated.response.status, 401);
  assert.equal(mutated.payload.error.details.authTrace.rootCause, "TOKEN_MUTATED_BETWEEN_LOGIN_AND_VERIFICATION");
  assert.equal(mutated.payload.error.details.authTrace.fingerprintsIdentical, false);
  assert.equal(mutated.payload.error.details.authTrace.signingInputFingerprintsIdentical, true);
  assert.equal(mutated.payload.error.details.authTrace.failureStage, "signature_validation");
});
