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
  const me = await jsonRequest(base, "/api/auth/me", { token });
  assert.equal(me.response.status, 200);
  assert.equal(me.payload.user.id, login.payload.user.id);
  assert.equal(me.payload.user.email, login.payload.user.email);
  assert.equal(traces.find(item => item.event === "issuance").tokenFingerprint, fingerprintToken(token));
  assert.equal(traces.find(item => item.event === "verification" && item.httpStatus === 200).fingerprintMatchesIssuedToken, true);

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
  }
});
