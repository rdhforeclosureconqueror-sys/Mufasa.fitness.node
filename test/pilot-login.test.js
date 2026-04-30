"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");

function makeTmpRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-auth-login-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");
  return tmpRoot;
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body || {})
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, { method: "GET", headers });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function bootApp(t) {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

test("POST /api/auth/login works with valid credentials", async (t) => {
  const previous = process.env.PILOT_LOGIN_PASSWORD;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  t.after(() => {
    if (previous == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = previous;
  });

  const baseUrl = await bootApp(t);
  const login = await post(baseUrl, "/api/auth/login", {
    email: "RDHForeclosureConquer@gmail.com",
    password: "top-secret"
  });

  assert.equal(login.res.status, 200);
  assert.equal(login.json?.ok, true);
  assert.ok(login.json?.token);
  assert.equal(login.json?.user?.email, "rdhforeclosureconquer@gmail.com");
});

test("POST /api/auth/login rejects invalid credentials", async (t) => {
  const previous = process.env.PILOT_LOGIN_PASSWORD;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  t.after(() => {
    if (previous == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = previous;
  });

  const baseUrl = await bootApp(t);
  const login = await post(baseUrl, "/api/auth/login", {
    email: "RDHForeclosureConquer@gmail.com",
    password: "wrong-password"
  });

  assert.equal(login.res.status, 401);
  assert.equal(login.json?.ok, false);
  assert.equal(login.json?.error, "Invalid email or password");
});

test("GET /api/auth/me works with valid token and rejects missing token", async (t) => {
  const previous = process.env.PILOT_LOGIN_PASSWORD;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  t.after(() => {
    if (previous == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = previous;
  });

  const baseUrl = await bootApp(t);
  const login = await post(baseUrl, "/api/auth/login", {
    email: "RDHForeclosureConquer@gmail.com",
    password: "top-secret"
  });
  const token = login.json?.token;

  const meOk = await get(baseUrl, "/api/auth/me", { authorization: `Bearer ${token}` });
  assert.equal(meOk.res.status, 200);
  assert.equal(meOk.json?.ok, true);
  assert.equal(meOk.json?.user?.id, "pilot_admin");

  const meMissing = await get(baseUrl, "/api/auth/me");
  assert.equal(meMissing.res.status, 401);
  const meInvalid = await get(baseUrl, "/api/auth/me", { authorization: "Bearer bad-token" });
  assert.equal(meInvalid.res.status, 401);
});

test("protected route rejects missing token and accepts valid token", async (t) => {
  const previous = process.env.PILOT_LOGIN_PASSWORD;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  t.after(() => {
    if (previous == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = previous;
  });

  const baseUrl = await bootApp(t);
  const missing = await get(baseUrl, "/api/me/profile");
  assert.equal(missing.res.status, 401);

  const login = await post(baseUrl, "/api/auth/login", {
    email: "RDHForeclosureConquer@gmail.com",
    password: "top-secret"
  });
  const profile = await get(baseUrl, "/api/me/profile", { authorization: `Bearer ${login.json?.token}` });
  assert.equal(profile.res.status, 200);
});

test("test login fixture issues token for requested testUserId in test mode", async (t) => {
  const prevPassword = process.env.PILOT_LOGIN_PASSWORD;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFixture = process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  process.env.NODE_ENV = "test";
  process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = "true";
  t.after(() => {
    if (prevPassword == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = prevPassword;
    if (prevNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevFixture == null) delete process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED;
    else process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = prevFixture;
  });

  const baseUrl = await bootApp(t);
  const login = await post(baseUrl, "/api/auth/login", {
    email: "fixture-user@example.test",
    password: "top-secret",
    testUserId: "fixture_user_1"
  });
  assert.equal(login.res.status, 200);
  assert.equal(login.json?.ok, true);
  assert.equal(login.json?.user?.id, "fixture_user_1");

  const me = await get(baseUrl, "/api/auth/me", { authorization: `Bearer ${login.json?.token}` });
  assert.equal(me.res.status, 200);
  assert.equal(me.json?.user?.id, "fixture_user_1");
});

test("test login fixture is blocked when NODE_ENV is not test", async (t) => {
  const prevPassword = process.env.PILOT_LOGIN_PASSWORD;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFixture = process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  process.env.NODE_ENV = "development";
  process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = "true";
  t.after(() => {
    if (prevPassword == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = prevPassword;
    if (prevNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevFixture == null) delete process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED;
    else process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = prevFixture;
  });

  const baseUrl = await bootApp(t);
  const login = await post(baseUrl, "/api/auth/login", {
    email: "fixture-user@example.test",
    password: "top-secret",
    testUserId: "fixture_user_1"
  });
  assert.equal(login.res.status, 403);
  assert.equal(login.json?.ok, false);
  assert.equal(login.json?.error, "TEST_LOGIN_FIXTURE_DISABLED");
});

test("admin ops auth still comes from allowlists, not fixture role claim", async (t) => {
  const prevPassword = process.env.PILOT_LOGIN_PASSWORD;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFixture = process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED;
  const prevAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.PILOT_LOGIN_PASSWORD = "top-secret";
  process.env.NODE_ENV = "test";
  process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = "true";
  process.env.AUTHZ_ADMIN_USER_IDS = "fixture_allowed_admin";
  t.after(() => {
    if (prevPassword == null) delete process.env.PILOT_LOGIN_PASSWORD;
    else process.env.PILOT_LOGIN_PASSWORD = prevPassword;
    if (prevNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevFixture == null) delete process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED;
    else process.env.AUTH_TEST_LOGIN_FIXTURE_ENABLED = prevFixture;
    if (prevAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = prevAdmin;
  });

  const baseUrl = await bootApp(t);
  const deniedLogin = await post(baseUrl, "/api/auth/login", {
    email: "fake-admin@example.test",
    password: "top-secret",
    testUserId: "fixture_denied_user",
    testRole: "admin"
  });
  assert.equal(deniedLogin.res.status, 200);

  const denied = await get(baseUrl, "/api/ops/enforcement-config", {
    authorization: `Bearer ${deniedLogin.json?.token}`
  });
  assert.equal(denied.res.status, 403);

  const allowedLogin = await post(baseUrl, "/api/auth/login", {
    email: "allowed-admin@example.test",
    password: "top-secret",
    testUserId: "fixture_allowed_admin",
    testRole: "user"
  });
  assert.equal(allowedLogin.res.status, 200);

  const allowed = await get(baseUrl, "/api/ops/enforcement-config", {
    authorization: `Bearer ${allowedLogin.json?.token}`
  });
  assert.equal(allowed.res.status, 200);
});
