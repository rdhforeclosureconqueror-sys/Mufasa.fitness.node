"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server");

async function call(base, route, { method = "GET", token, body } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { response, payload: await response.json().catch(() => ({})) };
}

test("Push-Up signup stores owner-scoped lightweight metadata without intake or 21-Day enrollment and projects it safely to CRM", async t => {
  const keys = ["AUTH_TOKEN_SECRET", "PILOT_LOGIN_PASSWORD", "LOGIN_SEED_EMAIL", "AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS"];
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { AUTH_TOKEN_SECRET: "push-up-light-signup-test-secret-32", PILOT_LOGIN_PASSWORD: "admin-password", LOGIN_SEED_EMAIL: "owner@example.test", AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: "pilot_admin" });
  t.after(() => Object.entries(prior).forEach(([key, value]) => value == null ? delete process.env[key] : process.env[key] = value));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "push-up-light-signup-"));
  const server = createApp({ dataDir }).listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const signup = await call(base, "/api/auth/register", { method: "POST", body: { name: "Amani", email: "amani@example.test", password: "push-up-pass", entryContext: "push_up_challenge" } });
  assert.equal(signup.response.status, 200);
  const { token, user } = signup.payload;
  assert.ok(token);
  assert.equal(user.name, "Amani");
  const saved = await call(base, "/api/me/challenge-participants/push_up", { method: "PUT", token, body: { fitnessLevel: "intermediate" } });
  assert.equal(saved.response.status, 200);
  assert.deepEqual(Object.fromEntries(Object.entries(saved.payload.data.participant).filter(([key]) => !["joinedAt", "capturedAt"].includes(key))), {
    entryContext: "push_up_challenge", challengeId: "push_up", challengeTitle: "Push-Up Challenge", fitnessLevel: "intermediate"
  });
  assert.ok(saved.payload.data.participant.joinedAt);
  assert.ok(saved.payload.data.participant.capturedAt);

  const record = JSON.parse(fs.readFileSync(path.join(dataDir, "users", `${user.id}.json`), "utf8"));
  assert.equal(record.clientIntake, undefined);
  assert.equal(record.memberJourneyProfile, undefined);
  assert.equal(record.steppingIntoGreatness, undefined, "push-up-21 must not be auto-enrolled");
  assert.equal(record.challengeParticipants.push_up.fitnessLevel, "intermediate");

  const second = await call(base, "/api/auth/register", { method: "POST", body: { name: "Other", email: "other@example.test", password: "other-pass-1" } });
  const secondRead = await call(base, "/api/me/challenge-participants/push_up", { token: second.payload.token });
  assert.equal(secondRead.payload.data.participant, null, "another owner cannot read Amani's metadata");

  const duplicate = await call(base, "/api/auth/register", { method: "POST", body: { name: "Duplicate", email: "amani@example.test", password: "push-up-pass", entryContext: "push_up_challenge" } });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.payload.code, "ACCOUNT_EXISTS");
  const identities = JSON.parse(fs.readFileSync(path.join(dataDir, "ops", "auth-credentials.json"), "utf8"));
  assert.equal(identities.accounts.filter(account => account.email === "amani@example.test").length, 1);

  const admin = await call(base, "/api/auth/login", { method: "POST", body: { email: "owner@example.test", password: "admin-password" } });
  const directory = await call(base, "/api/admin/members?search=amani%40example.test", { token: admin.payload.token });
  const member = directory.payload.data.members[0];
  assert.equal(member.userId, user.id);
  assert.equal(member.challengeParticipant.challengeTitle, "Push-Up Challenge");
  assert.equal(member.challengeParticipant.fitnessLevel, "intermediate");
  const overview = await call(base, `/api/admin/clients/${user.id}/overview`, { token: admin.payload.token });
  assert.equal(overview.payload.data.challengeParticipant.challengeId, "push_up");
  for (const projection of [member, overview.payload.data]) {
    const serialized = JSON.stringify(projection);
    assert.doesNotMatch(serialized, /push-up-pass|passwordHash|bearer|sessionToken|"token"/i);
  }
});

test("Push-Up release uses four-field signup, canonical auth adoption, fixed return target, and the existing avatar gate", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "push-up-release.html"), "utf8");
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "push-up-release.js"), "utf8");
  for (const field of ["releaseSignupName", "releaseSignupEmail", "releaseSignupPassword", "releaseSignupFitnessLevel"]) assert.match(html, new RegExp(field));
  for (const forbidden of ["height", "weight", "medical history", "assessment"]) assert.doesNotMatch(html, new RegExp(`name=["']${forbidden}`, "i"));
  assert.match(source, /entryContext:\s*'push_up_challenge'/);
  assert.match(source, /persistCanonicalAuthState/);
  assert.match(source, /returnTo = '\/push-up\.html'/);
  assert.match(source, /status === 409[\s\S]*ACCOUNT_EXISTS[\s\S]*\/api\/auth\/login/);
  assert.doesNotMatch(source, /client-intake|retention\/intake|push-up-21/);
  for (const stage of ["SIGNUP_FORM", "ACCOUNT_REGISTER", "CANONICAL_AUTH", "PARTICIPANT_METADATA", "RELEASE_REFRESH", "AVATAR_GATE"]) assert.match(source, new RegExp(stage));
  assert.match(source, /loadCanonicalProfile\(auth\.token/);
  assert.match(source, /renderAvatar\(state\.profile\)/);
  assert.match(source, /verifyArenaAvatar/);
});
