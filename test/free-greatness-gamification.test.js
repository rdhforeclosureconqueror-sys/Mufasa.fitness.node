"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server");
const { createGamificationEventStore } = require("../src/repositories/gamificationEventStore");

async function request(base, route, { method = "GET", token, body } = {}) {
  const response = await fetch(base + route, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { response, payload: await response.json().catch(() => ({})) };
}

const completion = { clientSessionId:"free-game-activity-1",activityType:"run",startedAt:"2026-08-11T11:30:00.000Z",endedAt:"2026-08-11T12:00:00.000Z",elapsedTimeMs:1800000,movingTimeMs:1700000,pausedTimeMs:100000,distanceMeters:5000,gpsQuality:{rating:"good",acceptedSamples:20,rejectedSamples:1,suspiciousMovementDetected:false} };

test("free Run Club uses existing Greatness gamification while every paid entitlement stays closed", async t => {
  const priorGate = process.env.MEMBERSHIP_GATE_TEST_ENFORCED;
  process.env.MEMBERSHIP_GATE_TEST_ENFORCED = "true";
  t.after(() => priorGate === undefined ? delete process.env.MEMBERSHIP_GATE_TEST_ENFORCED : process.env.MEMBERSHIP_GATE_TEST_ENFORCED = priorGate);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "free-greatness-game-"));
  const eventPath = path.join(dataDir, "gamification", "events.json");
  const app = createApp({ dataDir, gamificationEventPath:eventPath, env:{ GAMIFICATION_EVENT_CAPTURE:"true",GAMIFICATION_EVALUATION:"true",GAMIFICATION_READ_API:"true",GAMIFICATION_NOTIFICATIONS:"true" } });
  const server = app.listen(0); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const registered = await request(base, "/api/auth/register", { method:"POST",body:{name:"Free Runner",email:"free-game@example.test",password:"run-club-pass",entryContext:"run_club"} });
  assert.equal(registered.response.status, 200);
  const memberId = registered.payload.user.id, token = registered.payload.token;
  assert.equal(registered.payload.user.accessTier, "free_run_club", "registration is automatic; gamification has no enrollment mutation");

  const initialGame = await request(base, "/api/me/gamification", { token });
  assert.equal(initialGame.response.status, 200);
  assert.equal(initialGame.payload.data.stats.lifetimeXp, 0);
  const completed = await request(base, "/api/me/greatness/activities", { method:"POST",token,body:completion });
  assert.equal(completed.response.status, 201); assert.equal(completed.payload.data.validation.state, "valid");
  const retried = await request(base, "/api/me/greatness/activities", { method:"POST",token,body:completion });
  assert.equal(retried.response.status, 201); assert.equal(retried.payload.data.duplicateCompletion, true);

  const eventStore = createGamificationEventStore({ filePath:eventPath });
  const events = eventStore.readAfter(0).map(item => item.event);
  assert.equal(events.length, 1); assert.equal(events[0].eventType, "greatness.activity.completed");
  assert.equal(events[0].subjectUserId, memberId); assert.equal(events[0].sourceEntity.id, completed.payload.data.activityId);
  assert.equal(events[0].idempotencyKey, `greatness.activity.completed:${completed.payload.data.activityId}`);
  assert.equal(events.some(event => ["workout.completed","yoga.session.completed"].includes(event.eventType)), false);

  const game = await request(base, "/api/me/gamification", { token });
  assert.equal(game.response.status, 200); assert.equal(game.payload.data.level.lifetimeXp, 0, "the published policy assigns no Greatness XP; the integration invents none");
  assert.equal(game.payload.data.achievements.filter(item => item.state === "earned").length, 0);
  assert.equal(game.payload.data.badges.length, 0);
  const journey = await request(base, "/api/me/greatness/journey", { token });
  assert.equal(journey.payload.data.activities.length, 1); assert.ok(journey.payload.data.achievements.some(item => item.achievementKey === "first_5k"));
  const challenges = await request(base, "/api/me/greatness/challenges", { token }); assert.equal(challenges.response.status, 200);
  const notices = await request(base, "/api/me/notifications", { token });
  assert.equal(notices.response.status, 200); assert.equal(notices.payload.data.notifications.filter(item => item.type === "GREATNESS_ACTIVITY").length, 1);
  const noticesAgain = await request(base, "/api/me/notifications", { token });
  assert.equal(noticesAgain.payload.data.notifications.filter(item => item.type === "GREATNESS_ACTIVITY").length, 1);
  const progressPage = await fetch(base + "/greatness.html"); assert.equal(progressPage.status, 200); assert.match(await progressPage.text(), /Greatness Progress/);

  for (const route of ["/api/yoga/catalogue","/api/progress/dashboard","/api/me/nutrition/summary","/api/me/ai-coach"]) {
    const denied = await request(base, route, { token }); assert.equal(denied.response.status, 402, route); assert.equal(denied.payload.code, "membership_required", route);
  }
  const deniedWorkout = await request(base, "/api/sessions", { method:"POST",token,body:{} }); assert.equal(deniedWorkout.response.status, 402);
  const beforeUpgrade = game.payload.data;
  const userPath = path.join(dataDir, "users", `${memberId}.json`), user = JSON.parse(fs.readFileSync(userPath, "utf8"));
  assert.notEqual(user.membership?.status, "active", "gamification participation did not mutate membership");
  user.membership = { status:"active",plan:"pocket_pt_monthly" }; fs.writeFileSync(userPath, JSON.stringify(user));
  const upgradedIdentity = await request(base, "/api/auth/me", { token }); assert.equal(upgradedIdentity.payload.user.id, memberId); assert.equal(upgradedIdentity.payload.user.accessTier, "paid_member");
  const afterUpgrade = (await request(base, "/api/me/gamification", { token })).payload.data;
  assert.equal(afterUpgrade.level.lifetimeXp, beforeUpgrade.level.lifetimeXp); assert.equal(afterUpgrade.level.current, beforeUpgrade.level.current);
  assert.deepEqual(afterUpgrade.achievements, beforeUpgrade.achievements); assert.deepEqual(afterUpgrade.badges, beforeUpgrade.badges);
  assert.equal((await request(base, "/api/me/greatness/journey", { token })).payload.data.activities[0].activityId, completed.payload.data.activityId);
  assert.equal((await request(base, "/api/yoga/catalogue", { token })).response.status, 200, "paid behavior remains available after the real entitlement changes");
});

test("Greatness Progress is a free-facing surface backed only by self-scoped existing APIs", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/greatness.html"), "utf8"), js = fs.readFileSync(path.join(__dirname, "../public/greatness.js"), "utf8");
  assert.match(html, /Every Run Counts/); assert.match(html, /data-tab="progress"/);
  for (const route of ["/api/me/gamification","/api/me/greatness/journey","/api/me/greatness/challenges","/api/me/notifications"]) assert.ok(js.includes(route));
  assert.doesNotMatch(js, /api\/progress\/dashboard|api\/nutrition|api\/me\/ai-coach/);
});
