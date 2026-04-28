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
