"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("node:child_process");

const { createApp } = require("../server");
const { createAuthTokenLib } = require("../src/lib/authToken");

function makeTmpRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-auth-hardening-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");
  return tmpRoot;
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, { method: "GET", headers });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

test("auth bridge issues provider-verified identity when googleIdToken is verified", async (t) => {
  const rootDir = makeTmpRoot();
  const app = createApp({
    rootDir,
    googleIdentityVerifier: async ({ googleIdToken }) => {
      assert.equal(googleIdToken, "google_token_ok_value_123456");
      return {
        sub: "google-sub-123",
        email: "pilot@example.com",
        emailVerified: true,
        aud: "pilot-client-id"
      };
    }
  });
  const prevClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  process.env.GOOGLE_OAUTH_CLIENT_ID = "pilot-client-id";
  t.after(() => {
    if (prevClientId == null) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = prevClientId;
  });

  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const bridge = await post(baseUrl, "/api/auth/bridge", { googleIdToken: "google_token_ok_value_123456", trustMode: "google_verified" });
  assert.equal(bridge.res.status, 201);
  assert.equal(bridge.json.data.identity.providerVerified, true);
  assert.equal(bridge.json.data.identity.identityClass, "provider_verified");

  const me = await get(baseUrl, "/api/me", { authorization: `Bearer ${bridge.json.data.auth.token}` });
  assert.equal(me.res.status, 200);
  assert.equal(me.json.data.providerVerified, true);
  assert.equal(me.json.data.identityClass, "provider_verified");
});

test("auth bridge can reject unverified google claims when strict mode is enabled", async (t) => {
  const rootDir = makeTmpRoot();
  const prevAllow = process.env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE;
  process.env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE = "false";
  t.after(() => {
    if (prevAllow == null) delete process.env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE;
    else process.env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE = prevAllow;
  });

  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const bridge = await post(baseUrl, "/api/auth/bridge", { googleSub: "sub-only", trustMode: "provider_unverified" });
  assert.equal(bridge.res.status, 401);
  assert.equal(bridge.json.error.code, "UNAUTHENTICATED");
});

test("auth bridge rejects missing or invalid trustMode with safe reasons", async (t) => {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const missingMode = await post(baseUrl, "/api/auth/bridge", { googleIdToken: "google_token_ok_value_123456" });
  assert.equal(missingMode.res.status, 403);
  assert.equal(missingMode.json.error.details.reason, "missing_trust_mode");

  const invalidMode = await post(baseUrl, "/api/auth/bridge", { googleIdToken: "google_token_ok_value_123456", trustMode: "totally_invalid_mode" });
  assert.equal(invalidMode.res.status, 403);
  assert.equal(invalidMode.json.error.details.reason, "invalid_trust_mode");
});

test("admin email keeps observability read permission after google_verified bridge success", async (t) => {
  const rootDir = makeTmpRoot();
  const prevClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const prevAdminEmails = process.env.ADMIN_EMAILS;
  process.env.GOOGLE_OAUTH_CLIENT_ID = "pilot-client-id";
  process.env.ADMIN_EMAILS = "admin-ops@example.com";
  t.after(() => {
    if (prevClientId == null) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = prevClientId;
    if (prevAdminEmails == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdminEmails;
  });
  const app = createApp({
    rootDir,
    googleIdentityVerifier: async () => ({
      sub: "google-admin-sub",
      email: "admin-ops@example.com",
      emailVerified: true,
      aud: "pilot-client-id",
      iss: "https://accounts.google.com"
    })
  });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const bridge = await post(baseUrl, "/api/auth/bridge", {
    provider: "google",
    trustMode: "google_verified",
    googleEmail: "admin-ops@example.com",
    googleIdToken: "google_token_ok_value_123456"
  });
  assert.equal(bridge.res.status, 201);

  const diagnosticsRes = await fetch(baseUrl + "/api/admin/diagnostics/recent", {
    headers: { authorization: `Bearer ${bridge.json.data.auth.token}` }
  });
  assert.equal(diagnosticsRes.status, 200);
});

test("expired token is rejected with WWW-Authenticate header", async (t) => {
  const rootDir = makeTmpRoot();
  const prevSkew = process.env.AUTH_TOKEN_CLOCK_SKEW_MS;
  process.env.AUTH_TOKEN_CLOCK_SKEW_MS = "0";
  t.after(() => {
    if (prevSkew == null) delete process.env.AUTH_TOKEN_CLOCK_SKEW_MS;
    else process.env.AUTH_TOKEN_CLOCK_SKEW_MS = prevSkew;
  });

  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const lib = createAuthTokenLib({ secret: process.env.AUTH_TOKEN_SECRET || "dev-only-secret-change-me", clockSkewMs: 0, maxTtlMs: 2000 });
  const expired = lib.issueUserToken({ userId: "expired_user", ttlMs: 1 });
  await new Promise((r) => setTimeout(r, 20));

  const me = await get(baseUrl, "/api/me", { authorization: `Bearer ${expired.token}` });
  assert.equal(me.res.status, 401);
  assert.equal(me.res.headers.get("www-authenticate"), 'Bearer realm="mufasa", error="invalid_token"');
});

test("pilot control-plane checks script returns machine-readable output", () => {
  const run = spawnSync("node", ["scripts/run-pilot-control-plane-checks.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      AUTH_TOKEN_SECRET: "phase13-preflight-secret-32-characters",
      PILOT_LOGIN_PASSWORD: "phase13-pilot-password",
      LOGIN_SEED_EMAIL: "ops@example.com",
      ALLOWED_ORIGINS: "https://pilot.example.com",
      AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: "ops-root",
      ENABLE_TTS_NO_AUTH: "false",
      AUTH_BRIDGE_ALLOW_MANUAL: "false",
      AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE: "false"
    },
    encoding: "utf8"
  });

  let parsed = null;
  try {
    parsed = JSON.parse((run.stdout || "").trim());
  } catch {
    parsed = null;
  }

  assert.equal(run.status, 0);
  assert.ok(parsed && typeof parsed.ok === "boolean");
  assert.ok(Array.isArray(parsed.checks));
  assert.ok(parsed.checks.some((c) => c.name === "control_plane_preflight"));
});
