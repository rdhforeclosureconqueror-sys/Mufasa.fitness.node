"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createApp } = require("../server");

test("member check-in persists and updates dashboard; diagnostic is admin-only", { timeout: 15000 }, async (t) => {
  Object.assign(process.env, {
    AUTH_TOKEN_SECRET: "daily-check-in-integration-test-secret",
    PILOT_LOGIN_PASSWORD: "diagnostic-admin-password",
    LOGIN_SEED_EMAIL: "owner@example.test",
    AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: "pilot_admin"
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "daily-check-in-http-"));
  const server = createApp({ dataDir: directory }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  async function request(route, { method = "GET", token, body } = {}) {
    const response = await fetch("http://127.0.0.1:" + server.address().port + route, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
      body: body && JSON.stringify(body)
    });
    return { status: response.status, ok: response.ok, payload: await response.json() };
  }

  const route = "/api/me/daily-check-in";
  const diagnostic = "/api/admin/diagnostics/daily-check-in/run";
  assert.equal((await request(route, { method: "POST" })).status, 401, "Require member authentication");
  const credentials = { email: "daily@example.test", password: "synthetic-member-password" };
  await request("/api/auth/register", { method: "POST", body: { ...credentials, name: "Daily Test" } });
  const member = (await request("/api/auth/login", { method: "POST", body: credentials })).payload;
  assert.ok(member.token, "Authenticate synthetic member");
  assert.equal((await request(diagnostic, { method: "POST", token: member.token })).status, 403);

  const status = {};
  let click;
  const button = { addEventListener(_event, callback) { click = callback; } };
  const panel = { querySelector: (selector) => selector === "button" ? button : status };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/daily-check-in.js"), "utf8"), {
    document: { querySelector: (selector) => selector === "[data-daily-check-in]" ? panel : null },
    window: {
      AuthStateRuntime: { whenReady: () => Promise.resolve() },
      MaatApiClient: { request: (url, options) => request(url, { ...options, token: member.token }) }
    }
  });
  assert.equal(typeof click, "function", "Dashboard wired the check-in button");
  while (!status.textContent) await new Promise((resolve) => setImmediate(resolve));
  assert.match(status.textContent, /Ready for today/);
  await click();
  assert.equal(status.textContent, "Check-in complete. Current streak: 1 day. Next milestone: 3 days.");
  assert.equal(button.disabled, true, "Dashboard reflects completion without reload");
  const retry = await request(route, { method: "POST", token: member.token });
  assert.equal(retry.payload.data.streak, 1);
  const persisted = JSON.parse(fs.readFileSync(path.join(directory, "users", member.user.id + ".json"), "utf8"));
  assert.equal(persisted.dailyCheckIns.length, 1);
  assert.equal(fs.existsSync(path.join(directory, "gamification", "events.json")), false);

  const admin = (await request("/api/auth/login", {
    method: "POST",
    body: { email: "owner@example.test", password: "diagnostic-admin-password" }
  })).payload;
  assert.ok(admin.token, "Authenticate synthetic admin");
  assert.equal((await request(diagnostic, { method: "POST", token: admin.token })).payload.data.passed, true);
});
