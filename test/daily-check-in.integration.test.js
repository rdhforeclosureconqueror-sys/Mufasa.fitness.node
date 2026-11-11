"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server");

test("Community Wellness members receive one daily check-in and no XP", { timeout: 15000 }, async (t) => {
  Object.assign(process.env, { AUTH_TOKEN_SECRET: "daily-check-in-integration-test-secret" });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "community-daily-check-in-http-"));
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
    return { status: response.status, payload: await response.json() };
  }

  const route = "/api/me/residential-community/daily-check-in";
  assert.equal((await request(route, { method: "POST" })).status, 401);
  const credentials = { email: "daily@example.test", password: "synthetic-member-password" };
  await request("/api/auth/register", { method: "POST", body: { ...credentials, name: "Daily Test" } });
  const member = (await request("/api/auth/login", { method: "POST", body: credentials })).payload;
  assert.ok(member.token);
  assert.equal((await request(route, { method: "POST", token: member.token })).status, 403, "Only Community Wellness members qualify");

  const joined = await request("/api/me/residential-wellness", {
    method: "PUT", token: member.token, body: { interests: ["yoga"], communicationConsent: true }
  });
  assert.equal(joined.status, 200);
  assert.equal((await request(route, { token: member.token })).payload.data.completed, false);
  const first = await request(route, { method: "POST", token: member.token });
  assert.equal(first.status, 200);
  assert.equal(first.payload.data.streak, 1);
  assert.equal(first.payload.data.xpAwarded, 0);
  const retry = await request(route, { method: "POST", token: member.token });
  assert.equal(retry.payload.data.streak, 1, "Same-day retry is deduplicated");
  const persisted = JSON.parse(fs.readFileSync(path.join(directory, "users", member.user.id + ".json"), "utf8"));
  assert.equal(persisted.residentialCommunity.dailyCheckIns.length, 1);
  assert.equal(fs.existsSync(path.join(directory, "gamification", "events.json")), false);

  const hub = fs.readFileSync(path.join(__dirname, "../public/community-hub.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "../public/community-hub.js"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  assert.match(hub, /YOUR DAILY COMMUNITY MOMENTUM/);
  assert.match(script, /residential-community\/daily-check-in/);
  assert.doesNotMatch(dashboard, /daily-check-in/);
});
