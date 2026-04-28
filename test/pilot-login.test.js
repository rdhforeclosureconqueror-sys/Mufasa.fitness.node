"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp } = require("../server");

function makeTmpRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-pilot-login-"));
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

test("pilot login smoke GET route returns POST guidance", async (t) => {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const smoke = await get(baseUrl, "/api/auth/pilot-login");
  assert.equal(smoke.res.status, 200);
  assert.deepEqual(smoke.json, {
    ok: true,
    route: "/api/auth/pilot-login",
    methods: ["POST"],
    message: "Use POST for login"
  });
});

test("pilot login allows configured email and returns auth token", async (t) => {
  const rootDir = makeTmpRoot();
  const prevPilotAllowed = process.env.PILOT_ALLOWED_EMAILS;
  process.env.PILOT_ALLOWED_EMAILS = "rdhforeclosureconquer@gmail.com";
  t.after(() => {
    if (prevPilotAllowed == null) delete process.env.PILOT_ALLOWED_EMAILS;
    else process.env.PILOT_ALLOWED_EMAILS = prevPilotAllowed;
  });

  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await post(baseUrl, "/api/auth/pilot-login", { email: "RDHForeclosureConquer@gmail.com" });
  assert.equal(login.res.status, 201);
  assert.ok(login.json?.data?.auth?.token);

  const me = await get(baseUrl, "/api/me", { authorization: `Bearer ${login.json.data.auth.token}` });
  assert.equal(me.res.status, 200);
  assert.equal(me.json?.data?.provider, "pilot_email");
});

test("pilot login rejects unauthorized email", async (t) => {
  const rootDir = makeTmpRoot();
  const prevPilotAllowed = process.env.PILOT_ALLOWED_EMAILS;
  process.env.PILOT_ALLOWED_EMAILS = "rdhforeclosureconquer@gmail.com";
  t.after(() => {
    if (prevPilotAllowed == null) delete process.env.PILOT_ALLOWED_EMAILS;
    else process.env.PILOT_ALLOWED_EMAILS = prevPilotAllowed;
  });

  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await post(baseUrl, "/api/auth/pilot-login", { email: "not-allowed@example.com" });
  assert.equal(login.res.status, 403);
  assert.equal(login.json?.error?.message, "Email is not authorized for pilot access.");
});

test("pilot login rejects missing email", async (t) => {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await post(baseUrl, "/api/auth/pilot-login", {});
  assert.equal(login.res.status, 400);
  assert.equal(login.json?.error?.code, "VALIDATION_ERROR");
});

test("pilot login token keeps admin observability permission when ADMIN_EMAILS includes user", async (t) => {
  const rootDir = makeTmpRoot();
  const prevAdmin = process.env.ADMIN_EMAILS;
  const prevPilot = process.env.PILOT_ALLOWED_EMAILS;
  process.env.ADMIN_EMAILS = "rdhforeclosureconquer@gmail.com,godbody3333@gmail.com";
  process.env.PILOT_ALLOWED_EMAILS = "";
  t.after(() => {
    if (prevAdmin == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdmin;
    if (prevPilot == null) delete process.env.PILOT_ALLOWED_EMAILS;
    else process.env.PILOT_ALLOWED_EMAILS = prevPilot;
  });

  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await post(baseUrl, "/api/auth/pilot-login", { email: "GodBody3333@gmail.com" });
  assert.equal(login.res.status, 201);

  const diagnostics = await get(baseUrl, "/api/admin/diagnostics/recent", {
    authorization: `Bearer ${login.json.data.auth.token}`
  });
  assert.equal(diagnostics.res.status, 200);
});

test("protected routes still require token without pilot login", async (t) => {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const profile = await get(baseUrl, "/api/me/profile");
  assert.equal(profile.res.status, 401);
});

test("pilot session route creates token for fixed pilot identity", async (t) => {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const session = await post(baseUrl, "/api/auth/pilot-session", {});
  assert.equal(session.res.status, 201);
  assert.ok(session.json?.data?.auth?.token);
  assert.equal(session.json?.data?.identity?.userId, "pilot_user");
  assert.equal(session.json?.data?.identity?.email, "rdhforeclosureconquer@gmail.com");
  assert.equal(session.json?.data?.identity?.name, "Rashad Harbour");

  const me = await get(baseUrl, "/api/me", { authorization: `Bearer ${session.json.data.auth.token}` });
  assert.equal(me.res.status, 200);
  assert.equal(me.json?.data?.userId, "pilot_user");
  assert.equal(me.json?.data?.provider, "pilot_email");
});
