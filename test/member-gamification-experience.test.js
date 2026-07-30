"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createMemberExperienceService } = require("../src/gamification/memberExperienceService");

const definitions = [{ id: "a1", name: "First Light", visibility: "public", badgeId: "b1", reward: { lifetimeXp: 40 } }, { id: "secret", name: "Secret", visibility: "hidden", badgeId: "hidden", reward: { lifetimeXp: 1 } }];
const levels = [{ level: 1, minimumXp: 0 }, { level: 2, minimumXp: 100 }, { level: 3, minimumXp: 300 }];

test("member contract presents authoritative XP, levels, achievements, badges, streaks and rewards", () => {
  const profile = { currentLevel: 2, highestLevel: 2, lifetimeXp: 190, achievements: [
    { achievementId: "a1", badgeId: "b1", state: "earned", progress: { value: 1, target: 1 } },
    { achievementId: "secret", badgeId: "hidden", state: "locked", progress: { value: 0, target: 1 } }
  ], currentStreaks: [{ achievementId: "a1", value: 4 }] };
  const service = createMemberExperienceService({ definitions, levels, readModelService: { profile: id => id === "member" ? profile : null, ledger: () => [{ effectKey: "reward-1", delta: 40, occurredAt: "2026-07-30T00:00:00Z", reason: "achievement" }] } });
  const result = service.get("member");
  assert.equal(result.level.xpToNextLevel, 110);
  assert.equal(result.level.xpIntoLevel, 90);
  assert.equal(result.achievements.length, 1, "hidden locked achievements never leak");
  assert.deepEqual(result.badges, [{ id: "b1", achievementId: "a1", name: "First Light" }]);
  assert.equal(result.recentRewards[0].xp, 40);
  assert.equal(service.get("new-member").state, "empty");
});

test("dashboard experience includes accessible states, responsive layout and reduced motion", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../public/gamification.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../public/gamification.js"), "utf8");
  assert.match(html, /aria-label="Your progression"/);
  assert.match(js, /role="progressbar"/); assert.match(js, /aria-busy/); assert.match(js, /data-game-retry/);
  assert.match(js, /Your momentum starts here/); assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /max-width:600px/);
});

test("member endpoint is self-scoped and authenticated", () => {
  const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.match(server, /app\.get\("\/api\/me\/gamification", requireAuth/);
  assert.match(server, /memberGamificationService\.get\(req\.auth\.userId\)/);
  assert.doesNotMatch(server, /api\/me\/gamification\/:id/);
});
