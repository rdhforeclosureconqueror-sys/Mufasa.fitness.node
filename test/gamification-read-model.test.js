"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const definitionsDocument = require("../data/gamification/achievements.json");
const levelsDocument = require("../data/gamification/levels.json");
const policyDocument = require("../data/gamification/xp-policy.json");
const { validateEvent } = require("../src/gamification/validators");
const { validateAchievementDefinitions } = require("../src/gamification/policyService");
const { validateXpPolicy, createXpPolicyService } = require("../src/gamification/xpPolicyService");
const { createAchievementService } = require("../src/gamification/achievementService");
const { createProjectionService } = require("../src/gamification/projectionService");
const { createReadModelService } = require("../src/gamification/readModelService");
const { createLevelService } = require("../src/gamification/levelService");
const { createGamificationEventStore } = require("../src/repositories/gamificationEventStore");
const { createGamificationAwardStore } = require("../src/repositories/gamificationAwardStore");
const { createGamificationLedgerStore } = require("../src/repositories/gamificationLedgerStore");
const { createGamificationProjectionStore } = require("../src/repositories/gamificationProjectionStore");
const { loadGamificationConfig } = require("../src/config/gamification");

function workout(id, occurredAt = "2026-08-01T10:00:00.000Z") {
  return validateEvent({ eventId: `evt_${id.padStart(16, "0")}`, eventType: "workout.completed", schemaVersion: 1,
    occurredAt, recordedAt: occurredAt, actorUserId: "user_1", subjectUserId: "user_1", source: "session-service",
    sourceEntity: { type: "session", id: `session_${id}`, version: 1 }, idempotencyKey: `completed:${id}`,
    correlationId: `request_${id}`, causationEventId: null, verification: { status: "verified", method: "authoritative-write", riskFlags: [] },
    payload: { durationBand: "20_to_44_min", exerciseCountBand: "one", generated: false } }, { now: Date.parse("2026-12-01T00:00:00.000Z") });
}
function harness() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gamification-read-"));
  const eventStore = createGamificationEventStore({ filePath: path.join(dir, "events.json") });
  const awardStore = createGamificationAwardStore({ filePath: path.join(dir, "awards.json") });
  const ledgerStore = createGamificationLedgerStore({ filePath: path.join(dir, "ledger.json") });
  const projectionStore = createGamificationProjectionStore({ filePath: path.join(dir, "projections.json") });
  const definitions = validateAchievementDefinitions(definitionsDocument.definitions);
  const xpPolicies = validateXpPolicy(policyDocument);
  const levelService = createLevelService(levelsDocument.levels);
  const xpPolicyService = createXpPolicyService(xpPolicies);
  const achievementService = createAchievementService({ eventStore, definitions, awardStore, ledgerStore,
    projectionService: createProjectionService({ projectionStore, levelService }), xpPolicyService });
  const times = [new Date("2026-08-02T00:00:00.000Z"), new Date("2026-08-02T00:00:00.010Z")];
  const service = createReadModelService({ eventStore, projectionStore, ledgerStore, awardStore, achievementService,
    xpPolicies, xpPolicyService, definitions, levelService, clock: () => times.shift() || new Date("2026-08-02T00:00:01.000Z") });
  return { eventStore, projectionStore, ledgerStore, service };
}

test("read projection is disposable, deterministic, versioned, and exposes administrative summaries", () => {
  const h = harness(); h.eventStore.append(workout("1"));
  const first = h.service.replay();
  const profile = h.service.profile("user_1");
  assert.equal(profile.currentXp, 190);
  assert.equal(profile.currentLevel, 2);
  assert.equal(profile.projectionVersion, 1);
  assert.equal(profile.xpLedgerSummary.net, 190);
  assert.ok(profile.earnedAchievements.includes("achievement.workout.1_completed"));
  assert.equal(first.diagnostics.eventsProcessed, 1);
  assert.equal(first.diagnostics.durationMs, 10);
  assert.equal(h.service.deleteProjection("user_1"), true);
  assert.equal(h.service.profile("user_1"), null);
  const rebuilt = h.service.rebuild("user_1");
  assert.equal(rebuilt.lifetimeXp, profile.lifetimeXp);
  assert.equal(h.service.verify().valid, true);
  assert.equal(h.service.analytics().totalXpAwarded, 190);
  assert.equal(h.service.status().replayFailures, 0);
});

test("policy simulation reports caps and overlap without mutating production stores", () => {
  const h = harness(); h.eventStore.append(workout("1")); h.service.replay();
  const beforeLedger = h.ledgerStore.all();
  const beforeProjection = h.projectionStore.readAll();
  const simulation = h.service.simulate({ userId: "user_1", policyVersion: "1.0.0",
    eventStream: [workout("1"), workout("2", "2026-08-01T11:00:00.000Z")] });
  assert.equal(simulation.awardedXp, 220);
  assert.equal(simulation.skippedXp, 1);
  assert.equal(simulation.capDecisions.length + simulation.overlapDecisions.length, 1);
  assert.deepEqual(h.ledgerStore.all(), beforeLedger);
  assert.deepEqual(h.projectionStore.readAll(), beforeProjection);
  assert.throws(() => h.service.simulate({ userId: "bad id", policyVersion: "1.0.0", eventStream: [] }), /invalid/);
  assert.throws(() => h.service.profile("../bad"), /invalid/);
});

test("read infrastructure remains disabled by default", () => {
  const config = loadGamificationConfig({ GAMIFICATION_EVENT_CAPTURE: "true", GAMIFICATION_EVALUATION: "true" });
  assert.equal(config.readApi, false);
});
